import { Router } from 'express';
import { connectToDatabase, getCollection } from '../lib/db.js';
import { callOpenRouterChat, DEFAULT_CHAT_MODELS, parseChatModels } from '../lib/openrouter.js';
import { authGuard } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { getRecommendedTeammates } from '../lib/matchingEngine.js';
import { getCachedUserMembership, getMembershipEntitlements } from '../lib/membership.js';

const router = Router();

// ============ CONFIGURATION ============
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const CHAT_MODELS = parseChatModels(process.env.CHAT_MODELS, DEFAULT_CHAT_MODELS);

// Rate limiting for chat endpoint - stricter than general API
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 messages per minute per IP
    message: { error: 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi một chút.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Per-user rate limiting (in-memory, resets on server restart)
const userMessageCounts = new Map();
const USER_RATE_LIMIT = 50; // fallback messages per hour
const USER_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkUserRateLimit(userId, limitPerHour = USER_RATE_LIMIT) {
    const now = Date.now();
    const userData = userMessageCounts.get(userId);

    if (!userData || now - userData.windowStart > USER_RATE_WINDOW) {
        userMessageCounts.set(userId, { count: 1, windowStart: now });
        return true;
    }

    if (userData.count >= limitPerHour) {
        return false;
    }

    userData.count++;
    return true;
}

// ============ RAG HELPERS ============

/**
 * Sanitize user input to prevent injection
 */
function sanitizeInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars
}

/**
 * Detect intent from user message
 */
function detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Contest finding intent
    if (
        lowerMessage.includes('cuộc thi') ||
        lowerMessage.includes('contest') ||
        lowerMessage.includes('hackathon') ||
        lowerMessage.includes('phù hợp') ||
        lowerMessage.includes('thi gì') ||
        lowerMessage.includes('gợi ý cuộc thi')
    ) {
        return 'find_contest';
    }

    // Team finding intent - expanded keywords
    if (
        lowerMessage.includes('đồng đội') ||
        lowerMessage.includes('teammate') ||
        lowerMessage.includes('tìm team') ||
        lowerMessage.includes('ghép đội') ||
        lowerMessage.includes('đội nhóm') ||
        lowerMessage.includes('thành viên') ||
        // NEW: Role-based queries
        lowerMessage.includes('frontend') ||
        lowerMessage.includes('backend') ||
        lowerMessage.includes('fullstack') ||
        lowerMessage.includes('designer') ||
        lowerMessage.includes('ui/ux') ||
        lowerMessage.includes('mobile') ||
        lowerMessage.includes('devops') ||
        lowerMessage.includes('tester') ||
        lowerMessage.includes('qa') ||
        lowerMessage.includes('dev') ||
        // NEW: "ai đang tìm" pattern
        lowerMessage.includes('ai đang tìm') ||
        lowerMessage.includes('ai cần') ||
        lowerMessage.includes('team nào') ||
        lowerMessage.includes('nhóm nào') ||
        lowerMessage.includes('tuyển') ||
        lowerMessage.includes('cần người')
    ) {
        return 'find_teammate';
    }

    // Getting started intent
    if (
        lowerMessage.includes('bắt đầu') ||
        lowerMessage.includes('hướng dẫn') ||
        lowerMessage.includes('mới') ||
        lowerMessage.includes('làm sao') ||
        lowerMessage.includes('chưa biết') ||
        lowerMessage.includes('giúp đỡ') ||
        lowerMessage.includes('newbie')
    ) {
        return 'getting_started';
    }

    // User profile intent
    if (
        lowerMessage.includes('hồ sơ') ||
        lowerMessage.includes('profile') ||
        lowerMessage.includes('kỹ năng') ||
        lowerMessage.includes('skill')
    ) {
        return 'profile_help';
    }

    return 'general';
}

/**
 * Fetch relevant contests from database
 */
async function fetchRelevantContests(userProfile, limit = 5) {
    try {
        const contestsCollection = getCollection('contests');
        const now = new Date();

        // Build query based on user interests
        const query = {
            status: { $in: ['OPEN', 'UPCOMING'] },
            deadline: { $gte: now.toISOString() }
        };

        // Projection to fetch only required fields
        const projection = {
            title: 1,
            organizer: 1,
            deadline: 1,
            tags: 1,
            status: 1,
            fee: 1
        };

        // If user has contest interests, try to match tags
        const userInterests = userProfile?.contestPreferences?.contestInterests || [];
        const userSkills = userProfile?.matchingProfile?.skills || [];

        let contests;

        if (userInterests.length > 0 || userSkills.length > 0) {
            // Try to find contests matching user interests/skills
            const interestTags = [...userInterests, ...userSkills].map(i =>
                new RegExp(i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            );

            contests = await contestsCollection
                .find({
                    ...query,
                    $or: [
                        { tags: { $in: interestTags } },
                        { title: { $in: interestTags } },
                        { description: { $in: interestTags } }
                    ]
                })
                .project(projection)
                .sort({ deadline: 1 })
                .limit(limit)
                .toArray();

            // If not enough matches, fill with general contests
            if (contests.length < limit) {
                const additionalContests = await contestsCollection
                    .find({
                        ...query,
                        _id: { $nin: contests.map(c => c._id) }
                    })
                    .project(projection)
                    .sort({ deadline: 1 })
                    .limit(limit - contests.length)
                    .toArray();
                contests = [...contests, ...additionalContests];
            }
        } else {
            // No preferences, return upcoming contests
            contests = await contestsCollection
                .find(query)
                .project(projection)
                .sort({ deadline: 1 })
                .limit(limit)
                .toArray();
        }

        return contests.map(c => ({
            id: c._id.toString(),
            title: c.title,
            organizer: c.organizer,
            deadline: c.deadline,
            tags: c.tags || [],
            status: c.status,
            fee: c.fee
        }));
    } catch (error) {
        console.error('Error fetching contests:', error);
        return [];
    }
}

/**
 * Fetch potential teammates using the advanced matching engine
 * Uses ONE-WAY matching for agent recommendations (faster, user-focused)
 */
async function fetchPotentialTeammates(userProfile, limit = 5) {
    try {
        // Use the matching engine with one-way matching for agent
        if (userProfile?._id) {
            const recommendations = await getRecommendedTeammates(
                userProfile._id.toString(),
                {
                    twoWay: false, // One-way matching for agent (faster, user-centric)
                    limit: limit,
                    excludeUserIds: []
                }
            );

            return recommendations.map(r => ({
                id: r.id,
                name: r.name,
                role: r.profile.primaryRole || 'Chưa xác định',
                skills: r.profile.skills || [],
                experience: r.profile.experienceLevel || '',
                location: r.profile.location || '',
                matchScore: r.matchScore,
                scoreBreakdown: r.scoreBreakdown,
                availability: r.profile.availability || '',
                languages: r.profile.languages || []
            }));
        }

        // Fallback: basic query if no user profile
        const usersCollection = getCollection('users');

        const query = {
            'matchingProfile.openToNewTeams': true,
            'consents.allowMatching': true
        };

        const users = await usersCollection
            .find(query)
            .project({
                name: 1,
                'matchingProfile.primaryRole': 1,
                'matchingProfile.skills': 1,
                'matchingProfile.experienceLevel': 1,
                'matchingProfile.location': 1,
                'matchingProfile.availability': 1
            })
            .limit(limit)
            .toArray();

        return users.map(u => ({
            id: u._id.toString(),
            name: u.name,
            role: u.matchingProfile?.primaryRole || 'Chưa xác định',
            skills: (u.matchingProfile?.skills || []).slice(0, 5),
            experience: u.matchingProfile?.experienceLevel || '',
            location: u.matchingProfile?.location || ''
        }));
    } catch (error) {
        console.error('Error fetching teammates:', error);
        return [];
    }
}

/**
 * Fetch team recruitment posts
 * @param {Object} userProfile - User's profile
 * @param {number} limit - Max posts to return
 * @param {string} searchRole - Optional: specific role to search for (from user's question)
 */
async function fetchTeamPosts(userProfile, limit = 5, searchRole = null) {
    try {
        const teamsCollection = getCollection('team_posts');
        const now = new Date();

        const userSkills = userProfile?.matchingProfile?.skills || [];
        const userRole = userProfile?.matchingProfile?.primaryRole || '';

        // Find active team posts - include recently expired (within 7 days) for better results
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const query = {
            status: 'active',
            $or: [
                { expiresAt: { $gte: now } },
                { expiresAt: { $gte: sevenDaysAgo } } // Include recently expired
            ]
        };

        // If searching for specific role, add to query to filter at DB level
        if (searchRole) {
            const roleRegex = new RegExp(searchRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.rolesNeeded = roleRegex;
        }

        // Projection to fetch only required fields
        const projection = {
            title: 1,
            rolesNeeded: 1,
            maxMembers: 1,
            'members': 1,
            contestId: 1,
            description: 1,
            expiresAt: 1,
            createdAt: 1
        };

        let posts = await teamsCollection
            .find(query)
            .project(projection)
            .sort({ createdAt: -1 })
            .limit(Math.min(limit * 2, 20))
            .toArray();

        // Score and filter posts
        posts = posts.map(p => {
            const rolesNeeded = p.rolesNeeded || [];
            let matchScore = 0;

            // If searching for specific role, prioritize posts needing that role
            if (searchRole) {
                const searchRoleLower = searchRole.toLowerCase();
                const hasSearchRole = rolesNeeded.some(r =>
                    r.toLowerCase().includes(searchRoleLower) ||
                    searchRoleLower.includes(r.toLowerCase())
                );
                if (hasSearchRole) matchScore += 10;
            }

            // Match user's role
            if (userRole && rolesNeeded.includes(userRole)) {
                matchScore += 3;
            }

            // Prefer non-expired posts
            if (p.expiresAt && new Date(p.expiresAt) >= now) {
                matchScore += 2;
            }

            return { ...p, matchScore };
        }).sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);

        return posts.map(p => ({
            id: p._id.toString(),
            title: p.title,
            rolesNeeded: p.rolesNeeded || [],
            maxMembers: p.maxMembers,
            currentMembers: p.members?.length || 1,
            contestId: p.contestId || null,
            description: p.description?.substring(0, 100) || '',
            isExpired: p.expiresAt && new Date(p.expiresAt) < now
        }));
    } catch (error) {
        console.error('Error fetching team posts:', error);
        return [];
    }
}

/**
 * Extract role being searched from message
 */
function extractSearchRole(message) {
    const lowerMessage = message.toLowerCase();
    const rolePatterns = [
        { pattern: /frontend/i, role: 'Frontend Dev' },
        { pattern: /back.?end/i, role: 'Backend Dev' },
        { pattern: /full.?stack/i, role: 'Fullstack Dev' },
        { pattern: /mobile/i, role: 'Mobile Dev' },
        { pattern: /ui.?ux|ux.?ui/i, role: 'UI/UX Designer' },
        { pattern: /designer|thiết kế/i, role: 'Designer' },
        { pattern: /devops/i, role: 'DevOps' },
        { pattern: /qa|tester|test/i, role: 'QA/Tester' },
        { pattern: /data|analyst/i, role: 'Data Analyst' },
        { pattern: /pm|product manager|quản lý/i, role: 'Product Manager' },
        { pattern: /marketing/i, role: 'Marketing' },
        { pattern: /content|writer|viết/i, role: 'Content Writer' },
        { pattern: /business/i, role: 'Business Analyst' },
    ];

    for (const { pattern, role } of rolePatterns) {
        if (pattern.test(lowerMessage)) {
            return role;
        }
    }
    return null;
}

/**
 * Build context for RAG based on intent
 */
async function buildRAGContext(intent, userProfile, userMessage = '') {
    let context = '';
    let data = {};

    switch (intent) {
        case 'find_contest':
            data.contests = await fetchRelevantContests(userProfile);
            if (data.contests.length > 0) {
                context = `\n\n📋 DANH SÁCH CUỘC THI PHÙ HỢP:\n`;
                data.contests.forEach((c, i) => {
                    context += `${i + 1}. "${c.title}" - BTC: ${c.organizer}\n`;
                    context += `   Deadline: ${new Date(c.deadline).toLocaleDateString('vi-VN')}\n`;
                    context += `   Tags: ${c.tags.join(', ') || 'Không có'}\n`;
                    context += `   Phí: ${c.fee > 0 ? c.fee.toLocaleString('vi-VN') + ' VNĐ' : 'Miễn phí'}\n\n`;
                });
            } else {
                context = '\n\n⚠️ Hiện tại không có cuộc thi nào đang mở đăng ký.\n';
            }
            break;

        case 'find_teammate':
            // Extract role from user's question
            const searchRole = extractSearchRole(userMessage);

            data.teammates = await fetchPotentialTeammates(userProfile);
            data.teamPosts = await fetchTeamPosts(userProfile, 5, searchRole);

            // If user is asking about specific role recruitment
            if (searchRole) {
                context = `\n\n🔍 TÌM KIẾM: "${searchRole}"\n`;

                if (data.teamPosts.length > 0) {
                    const matchingPosts = data.teamPosts.filter(p =>
                        p.rolesNeeded.some(r => r.toLowerCase().includes(searchRole.toLowerCase()) ||
                            searchRole.toLowerCase().includes(r.toLowerCase()))
                    );

                    if (matchingPosts.length > 0) {
                        context += `\n📋 BÀI ĐĂNG ĐANG TÌM ${searchRole.toUpperCase()}:\n`;
                        matchingPosts.forEach((p, i) => {
                            context += `${i + 1}. "${p.title}"\n`;
                            context += `   📝 ${p.description || 'Không có mô tả'}...\n`;
                            context += `   🎯 Cần: ${p.rolesNeeded.join(', ')}\n`;
                            context += `   👥 Thành viên: ${p.currentMembers}/${p.maxMembers}\n`;
                            if (p.isExpired) {
                                context += `   ⚠️ Bài đăng đã hết hạn, có thể vẫn đang tuyển\n`;
                            }
                            context += `\n`;
                        });
                    } else {
                        context += `\n⚠️ Không tìm thấy bài đăng nào đang tuyển ${searchRole} cụ thể.\n`;
                        context += `\n📋 CÁC BÀI ĐĂNG TÌM ĐỘI KHÁC:\n`;
                        data.teamPosts.slice(0, 3).forEach((p, i) => {
                            context += `${i + 1}. "${p.title}" - Cần: ${p.rolesNeeded.join(', ')}\n`;
                        });
                    }
                } else {
                    context += `\n⚠️ Hiện không có bài đăng tìm đội nào.\n`;
                }
            } else {
                // General teammate search
                if (data.teammates.length > 0) {
                    context = `\n\n👥 GỢI Ý 5 ĐỒNG ĐỘI ĐA DẠNG CHO TEAM 6 NGƯỜI:\n`;
                    context += `(Đã tính toán độ phù hợp dựa trên vai trò, kỹ năng, lịch và phong cách làm việc)\n\n`;
                    data.teammates.forEach((t, i) => {
                        context += `${i + 1}. ${t.name} - ${t.role}`;
                        if (t.matchScore) {
                            context += ` (Độ phù hợp: ${t.matchScore}%)\n`;
                        } else {
                            context += `\n`;
                        }
                        context += `   📚 Skills: ${t.skills.join(', ') || 'Chưa cập nhật'}\n`;
                        context += `   🎯 Kinh nghiệm: ${t.experience || 'Chưa xác định'}\n`;
                        if (t.availability) {
                            context += `   ⏰ Lịch: ${t.availability}\n`;
                        }
                        if (t.location) {
                            context += `   📍 Khu vực: ${t.location}\n`;
                        }
                        context += `\n`;
                    });
                    context += `💡 5 người này có vai trò và kỹ năng khác nhau, tạo thành team đa dạng và cân bằng.\n`;
                }

                if (data.teamPosts.length > 0) {
                    context += `\n\n🔍 BÀI ĐĂNG TÌM ĐỘI GẦN ĐÂY:\n`;
                    data.teamPosts.forEach((p, i) => {
                        context += `${i + 1}. "${p.title}"\n`;
                        context += `   Cần: ${p.rolesNeeded.join(', ')}\n`;
                        context += `   Thành viên: ${p.currentMembers}/${p.maxMembers}\n`;
                        if (p.isExpired) {
                            context += `   ⚠️ Đã hết hạn\n`;
                        }
                        context += `\n`;
                    });
                }
            }

            if (!data.teammates.length && !data.teamPosts.length) {
                context = '\n\n⚠️ Chưa tìm thấy đồng đội phù hợp. Hãy hoàn thiện hồ sơ để tăng khả năng ghép đội!\n';
            }
            break;

        case 'getting_started':
            context = `\n\n📚 HƯỚNG DẪN BẮT ĐẦU:\n
1. **Hoàn thiện hồ sơ**: Vào Cài đặt > Hồ sơ matching để cập nhật kỹ năng, vai trò mong muốn
2. **Khám phá cuộc thi**: Xem danh sách cuộc thi tại trang Contests
3. **Tìm đồng đội**: Truy cập Community để xem các bài đăng tìm đội hoặc đăng bài tìm teammate
4. **Đăng ký tham gia**: Chọn cuộc thi phù hợp và đăng ký solo hoặc cùng team

💡 Mẹo: Hồ sơ càng đầy đủ, cơ hội được ghép đội và gợi ý cuộc thi phù hợp càng cao!
`;
            break;

        case 'profile_help':
            const profile = userProfile?.matchingProfile || {};
            context = `\n\n📊 TRẠNG THÁI HỒ SƠ CỦA BẠN:\n`;
            context += `- Vai trò chính: ${profile.primaryRole || '❌ Chưa cập nhật'}\n`;
            context += `- Kỹ năng: ${(profile.skills || []).length > 0 ? profile.skills.slice(0, 5).join(', ') : '❌ Chưa cập nhật'}\n`;
            context += `- Kinh nghiệm: ${profile.experienceLevel || '❌ Chưa cập nhật'}\n`;
            context += `- Sẵn sàng ghép đội: ${profile.openToNewTeams ? '✅ Có' : '❌ Không'}\n`;

            const missing = [];
            if (!profile.primaryRole) missing.push('vai trò chính');
            if (!(profile.skills || []).length) missing.push('kỹ năng');
            if (!profile.experienceLevel) missing.push('cấp độ kinh nghiệm');

            if (missing.length > 0) {
                context += `\n⚠️ Bạn nên bổ sung: ${missing.join(', ')} để tăng cơ hội ghép đội!`;
            } else {
                context += `\n✅ Hồ sơ của bạn khá đầy đủ!`;
            }
            break;

        default:
            context = '';
    }

    return { context, data };
}

/**
 * Build system prompt for the AI
 */
function buildSystemPrompt(userProfile) {
    const userName = userProfile?.name || 'bạn';
    const userRole = userProfile?.matchingProfile?.primaryRole || '';
    const userSkills = (userProfile?.matchingProfile?.skills || []).slice(0, 5).join(', ');

    return `Bạn là ContestHub Assistant - trợ lý AI của nền tảng ContestHub, chuyên hỗ trợ sinh viên Việt Nam tìm kiếm và tham gia các cuộc thi.

THÔNG TIN NGƯỜI DÙNG ĐANG TRÒ CHUYỆN:
- Tên: ${userName}
- Vai trò: ${userRole || 'Chưa xác định'}
- Kỹ năng: ${userSkills || 'Chưa cập nhật'}

QUY TẮC TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt, thân thiện và hữu ích
2. Giữ câu trả lời ngắn gọn, súc tích (tối đa 300 từ)
3. Khi gợi ý cuộc thi/đồng đội, dựa trên dữ liệu được cung cấp trong context
4. Nếu không có dữ liệu phù hợp, hướng dẫn người dùng cách tìm kiếm thủ công
5. Khuyến khích người dùng hoàn thiện hồ sơ để nhận gợi ý tốt hơn
6. Không bịa đặt thông tin về cuộc thi hoặc người dùng không có trong database
7. Sử dụng emoji phù hợp để tăng tính thân thiện
8. Nếu câu hỏi ngoài phạm vi ContestHub, lịch sự từ chối và hướng về chủ đề chính

PHẠM VI HỖ TRỢ:
- Tìm cuộc thi phù hợp với kỹ năng/sở thích
- Gợi ý đồng đội tiềm năng
- Hướng dẫn sử dụng nền tảng
- Tư vấn cách hoàn thiện hồ sơ`;
}

// ============ ROUTES ============

// POST /api/chat - Send message to AI
router.post('/', authGuard, chatLimiter, async (req, res, next) => {
    try {
        await connectToDatabase();

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check user rate limit (membership-aware)
        let limitPerHour = USER_RATE_LIMIT;
        try {
            const membership = await getCachedUserMembership(userId);
            const entitlements = getMembershipEntitlements(membership?.effectiveTier || 'free');
            limitPerHour = entitlements.chatMessagesPerHour || USER_RATE_LIMIT;
        } catch {
            // fallback to default limit
        }

        if (!checkUserRateLimit(userId, limitPerHour)) {
            return res.status(429).json({
                code: 'CHAT_RATE_LIMIT',
                limitPerHour,
                error: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.'
            });
        }

        // Validate input
        const rawMessage = req.body?.message;
        const conversationHistory = req.body?.history || [];

        if (!rawMessage || typeof rawMessage !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const message = sanitizeInput(rawMessage);
        if (message.length < 2) {
            return res.status(400).json({ error: 'Message too short' });
        }

        // Validate conversation history (limit to last 10 messages)
        const validHistory = Array.isArray(conversationHistory)
            ? conversationHistory
                .slice(-10)
                .filter(m => m.role && m.content && ['user', 'assistant'].includes(m.role))
                .map(m => ({
                    role: m.role,
                    content: sanitizeInput(m.content, 2000)
                }))
            : [];

        // Fetch user profile for personalization
        const usersCollection = getCollection('users');
        const userProfile = await usersCollection.findOne(
            { email: req.user.email },
            {
                projection: {
                    name: 1,
                    matchingProfile: 1,
                    contestPreferences: 1,
                    consents: 1
                }
            }
        );

        // Detect intent and build RAG context
        const intent = detectIntent(message);
        const { context, data } = await buildRAGContext(intent, userProfile, message);

        // Build messages for API
        const systemPrompt = buildSystemPrompt(userProfile);
        const userMessageWithContext = context
            ? `${message}\n\n---\nDỮ LIỆU TỪ HỆ THỐNG:${context}`
            : message;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...validHistory,
            { role: 'user', content: userMessageWithContext }
        ];

        // Call AI (with fallback models)
        const { content: aiResponse, model: modelUsed } = await callOpenRouterChat({
            apiKey: OPENROUTER_API_KEY,
            models: CHAT_MODELS,
            messages,
            frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
            title: 'ContestHub Assistant',
        });

        // Log chat for analytics (without storing full conversation)
        try {
            const chatLogsCollection = getCollection('chat_logs');
            await chatLogsCollection.insertOne({
                userId,
                intent,
                messageLength: message.length,
                responseLength: aiResponse.length,
                hasContext: !!context,
                timestamp: new Date(),
                model: modelUsed
            });
        } catch (logError) {
            console.error('Failed to log chat:', logError);
            // Non-critical, continue
        }

        res.json({
            response: aiResponse,
            intent,
            suggestions: getSuggestions(intent),
            // Include structured data for rich UI rendering
            data: {
                teamPosts: data.teamPosts || [],
                teammates: data.teammates || [],
                contests: data.contests || []
            }
        });

    } catch (error) {
        console.error('Chat error:', error);

        if (error.message === 'OpenRouter API key not configured') {
            return res.status(503).json({
                error: 'Tính năng chat AI đang được bảo trì. Vui lòng thử lại sau.'
            });
        }

        next(error);
    }
});

// GET /api/chat/suggestions - Get suggested prompts
router.get('/suggestions', authGuard, async (req, res) => {
    res.json({
        suggestions: [
            {
                id: 'find_contest',
                text: 'Cuộc thi nào phù hợp với tôi?',
                icon: '🏆'
            },
            {
                id: 'find_teammate',
                text: 'Tìm đồng đội ăn ý',
                icon: '👥'
            },
            {
                id: 'getting_started',
                text: 'Tôi muốn tham gia cuộc thi nhưng chưa biết bắt đầu từ đâu',
                icon: '🚀'
            }
        ]
    });
});

/**
 * Get follow-up suggestions based on intent
 */
function getSuggestions(intent) {
    const suggestions = {
        find_contest: [
            'Cho tôi xem thêm cuộc thi',
            'Có cuộc thi nào về AI không?',
            'Cuộc thi nào miễn phí?'
        ],
        find_teammate: [
            'Làm sao để đăng bài tìm đội?',
            'Tôi nên viết gì trong hồ sơ?',
            'Có ai đang tìm Frontend Dev không?'
        ],
        getting_started: [
            'Hướng dẫn tìm đồng đội',
            'Làm sao để hoàn thiện hồ sơ?',
            'Cuộc thi nào dễ cho người mới?'
        ],
        profile_help: [
            'Kỹ năng nào nên thêm vào?',
            'Làm sao để tăng khả năng ghép đội?',
            'Vai trò nào phù hợp với tôi?'
        ],
        general: [
            'Cuộc thi nào phù hợp với tôi?',
            'Tìm đồng đội ăn ý',
            'Hướng dẫn sử dụng nền tảng'
        ]
    };

    return suggestions[intent] || suggestions.general;
}

export default router;
