import { Router } from 'express';
import { ObjectId } from '../lib/objectId.js';
import { connectToDatabase, getCollection } from '../lib/db.js';
import { authGuard } from '../middleware/auth.js';

const router = Router();

// ============ SKILL TREE CONFIGURATION ============

/**
 * 5 Skill Branches — each maps to contest tags / course categories.
 * Each branch has 5 tier nodes that unlock as the user accumulates XP.
 */
const SKILL_BRANCHES = [
    {
        id: 'research',
        icon: '🔬',
        color: '#3b82f6',       // blue-500
        colorLight: '#93c5fd',  // blue-300
        tags: ['nghiên cứu', 'khoa học', 'research', 'science', 'stem', 'toán', 'math', 'vật lý', 'physics', 'hóa học', 'chemistry', 'sinh học', 'biology', 'môi trường', 'environment'],
        tiers: [
            { id: 'research-1', title: 'Người tò mò', titleEn: 'Curious Mind', xpRequired: 0, description: 'Bắt đầu hành trình nghiên cứu', descriptionEn: 'Begin your research journey' },
            { id: 'research-2', title: 'Nhà quan sát', titleEn: 'Observer', xpRequired: 50, description: 'Tham gia 1 cuộc thi nghiên cứu', descriptionEn: 'Join your first research contest' },
            { id: 'research-3', title: 'Nhà phân tích', titleEn: 'Analyst', xpRequired: 150, description: 'Hoàn thành 2 hoạt động nghiên cứu', descriptionEn: 'Complete 2 research activities' },
            { id: 'research-4', title: 'Nhà nghiên cứu', titleEn: 'Researcher', xpRequired: 300, description: 'Thành thạo nghiên cứu khoa học', descriptionEn: 'Master scientific research' },
            { id: 'research-5', title: 'Viện sĩ', titleEn: 'Academician', xpRequired: 500, description: 'Đỉnh cao nghiên cứu', descriptionEn: 'Research pinnacle' },
        ],
    },
    {
        id: 'programming',
        icon: '💻',
        color: '#10b981',       // emerald-500
        colorLight: '#6ee7b7',  // emerald-300
        tags: ['lập trình', 'công nghệ', 'programming', 'technology', 'tech', 'code', 'coding', 'hackathon', 'ai', 'machine learning', 'web', 'app', 'phần mềm', 'software', 'it', 'data'],
        tiers: [
            { id: 'programming-1', title: 'Newbie', titleEn: 'Newbie', xpRequired: 0, description: 'Viết dòng code đầu tiên', descriptionEn: 'Write your first line of code' },
            { id: 'programming-2', title: 'Coder', titleEn: 'Coder', xpRequired: 50, description: 'Tham gia 1 hackathon', descriptionEn: 'Join your first hackathon' },
            { id: 'programming-3', title: 'Developer', titleEn: 'Developer', xpRequired: 150, description: 'Hoàn thành 2 dự án công nghệ', descriptionEn: 'Complete 2 tech projects' },
            { id: 'programming-4', title: 'Engineer', titleEn: 'Engineer', xpRequired: 300, description: 'Thành thạo kỹ thuật phần mềm', descriptionEn: 'Master software engineering' },
            { id: 'programming-5', title: 'Architect', titleEn: 'Architect', xpRequired: 500, description: 'Kiến trúc sư giải pháp', descriptionEn: 'Solution architect' },
        ],
    },
    {
        id: 'startup',
        icon: '🚀',
        color: '#f59e0b',       // amber-500
        colorLight: '#fcd34d',  // amber-300
        tags: ['khởi nghiệp', 'startup', 'kinh doanh', 'business', 'marketing', 'quản trị', 'management', 'tài chính', 'finance', 'thương mại', 'innovation', 'đổi mới', 'sáng tạo kinh doanh', 'entrepreneurship'],
        tiers: [
            { id: 'startup-1', title: 'Mơ ước lớn', titleEn: 'Dreamer', xpRequired: 0, description: 'Bắt đầu tìm hiểu khởi nghiệp', descriptionEn: 'Start learning about startups' },
            { id: 'startup-2', title: 'Ý tưởng gia', titleEn: 'Ideator', xpRequired: 50, description: 'Tham gia 1 cuộc thi kinh doanh', descriptionEn: 'Join your first business contest' },
            { id: 'startup-3', title: 'Nhà sáng lập', titleEn: 'Founder', xpRequired: 150, description: 'Phát triển 2 vấn đề kinh doanh', descriptionEn: 'Develop 2 business ideas' },
            { id: 'startup-4', title: 'CEO trẻ', titleEn: 'Young CEO', xpRequired: 300, description: 'Thành thạo kỹ năng khởi nghiệp', descriptionEn: 'Master startup skills' },
            { id: 'startup-5', title: 'Kỳ lân', titleEn: 'Unicorn', xpRequired: 500, description: 'Huyền thoại khởi nghiệp', descriptionEn: 'Startup legend' },
        ],
    },
    {
        id: 'creative',
        icon: '🎨',
        color: '#ec4899',       // pink-500
        colorLight: '#f9a8d4',  // pink-300
        tags: ['sáng tạo', 'thiết kế', 'design', 'creative', 'nghệ thuật', 'art', 'ux', 'ui', 'đồ họa', 'multimedia', 'video', 'ảnh', 'photography', 'âm nhạc', 'music', 'văn hóa', 'culture'],
        tiers: [
            { id: 'creative-1', title: 'Tập sự', titleEn: 'Apprentice', xpRequired: 0, description: 'Khám phá thế giới sáng tạo', descriptionEn: 'Explore the creative world' },
            { id: 'creative-2', title: 'Nghệ nhân', titleEn: 'Artisan', xpRequired: 50, description: 'Tham gia 1 cuộc thi sáng tạo', descriptionEn: 'Join your first creative contest' },
            { id: 'creative-3', title: 'Nhà thiết kế', titleEn: 'Designer', xpRequired: 150, description: 'Hoàn thành 2 dự án sáng tạo', descriptionEn: 'Complete 2 creative projects' },
            { id: 'creative-4', title: 'Nghệ sĩ', titleEn: 'Artist', xpRequired: 300, description: 'Thành thạo kỹ năng sáng tạo', descriptionEn: 'Master creative skills' },
            { id: 'creative-5', title: 'Bậc thầy', titleEn: 'Master', xpRequired: 500, description: 'Đỉnh cao sáng tạo', descriptionEn: 'Creative pinnacle' },
        ],
    },
    {
        id: 'presentation',
        icon: '🎤',
        color: '#8b5cf6',       // violet-500
        colorLight: '#c4b5fd',  // violet-300
        tags: ['thuyết trình', 'giao tiếp', 'communication', 'presentation', 'debate', 'hùng biện', 'mc', 'diễn thuyết', 'public speaking', 'ngoại ngữ', 'tiếng anh', 'english', 'writing', 'viết', 'báo chí', 'journalism'],
        tiers: [
            { id: 'presentation-1', title: 'Người mới', titleEn: 'Beginner', xpRequired: 0, description: 'Bắt đầu rèn luyện giao tiếp', descriptionEn: 'Start communication training' },
            { id: 'presentation-2', title: 'Diễn giả nhí', titleEn: 'Junior Speaker', xpRequired: 50, description: 'Tham gia 1 cuộc thi thuyết trình', descriptionEn: 'Join your first speaking contest' },
            { id: 'presentation-3', title: 'Diễn giả', titleEn: 'Speaker', xpRequired: 150, description: 'Hoàn thành 2 hoạt động giao tiếp', descriptionEn: 'Complete 2 communication activities' },
            { id: 'presentation-4', title: 'Nhà hùng biện', titleEn: 'Orator', xpRequired: 300, description: 'Thành thạo kỹ năng thuyết trình', descriptionEn: 'Master presentation skills' },
            { id: 'presentation-5', title: 'Truyền cảm hứng', titleEn: 'Inspirer', xpRequired: 500, description: 'Đỉnh cao truyền đạt', descriptionEn: 'Communication pinnacle' },
        ],
    },
];

// XP rewards for activities
const XP_CONTEST_REGISTRATION = 30;
const XP_CONTEST_COMPLETED = 80;
const XP_COURSE_ENROLLED = 20;
const XP_COURSE_COMPLETED = 60;

/**
 * Match contest tags to skill branches.
 * Returns an array of branch IDs that the tags belong to.
 */
function matchTagsToBranches(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return [];

    const normalizedTags = tags.map(t => String(t).toLowerCase().trim());
    const matched = new Set();

    for (const branch of SKILL_BRANCHES) {
        for (const tag of normalizedTags) {
            if (branch.tags.some(bt => tag.includes(bt) || bt.includes(tag))) {
                matched.add(branch.id);
                break;
            }
        }
    }

    // If no branch matched, distribute to a random branch based on tag hash
    if (matched.size === 0 && normalizedTags.length > 0) {
        const hashIndex = normalizedTags[0].length % SKILL_BRANCHES.length;
        matched.add(SKILL_BRANCHES[hashIndex].id);
    }

    return Array.from(matched);
}

/**
 * GET /api/skill-tree/:userId
 * Compute and return skill tree data for a user.
 */
router.get('/:userId', authGuard, async (req, res, next) => {
    try {
        await connectToDatabase();
        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const userObjectId = new ObjectId(userId);

        // Fetch user basic info
        const users = getCollection('users');
        const user = await users.findOne(
            { _id: userObjectId },
            { projection: { name: 1, avatar: 1 } }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch contest registrations
        const registrations = getCollection('registrations');
        const userRegistrations = await registrations
            .find({ userId: userObjectId })
            .toArray();

        // Fetch contest details for tags
        const contestIds = userRegistrations
            .map(r => r.contestId)
            .filter(id => id && ObjectId.isValid(id))
            .map(id => new ObjectId(id));

        const contests = contestIds.length > 0
            ? await getCollection('contests')
                .find(
                    { _id: { $in: contestIds } },
                    { projection: { tags: 1, title: 1, category: 1 } }
                )
                .toArray()
            : [];

        const contestMap = new Map(contests.map(c => [c._id.toString(), c]));

        // Fetch course enrollments
        const courseEnrollments = getCollection('course_enrollments');
        const userEnrollments = await courseEnrollments
            .find({ userId: userId })
            .toArray();

        // Fetch course details
        const courseIds = userEnrollments
            .map(e => e.courseId)
            .filter(id => id && ObjectId.isValid(id))
            .map(id => new ObjectId(id));

        const courses = courseIds.length > 0
            ? await getCollection('courses')
                .find(
                    { _id: { $in: courseIds } },
                    { projection: { title: 1, level: 1 } }
                )
                .toArray()
            : [];

        const courseMap = new Map(courses.map(c => [c._id.toString(), c]));

        // Calculate XP per branch
        const branchXP = {};
        const branchActivities = {};
        for (const branch of SKILL_BRANCHES) {
            branchXP[branch.id] = 0;
            branchActivities[branch.id] = [];
        }

        // Process contest registrations → XP
        for (const reg of userRegistrations) {
            const contest = contestMap.get(reg.contestId?.toString());
            if (!contest) continue;

            const tags = [...(contest.tags || [])];
            if (contest.category) tags.push(contest.category);

            const matchedBranches = matchTagsToBranches(tags);
            const xp = reg.status === 'completed' ? XP_CONTEST_COMPLETED : XP_CONTEST_REGISTRATION;

            for (const branchId of matchedBranches) {
                branchXP[branchId] += xp;
                branchActivities[branchId].push({
                    type: 'contest',
                    title: contest.title || 'Cuộc thi',
                    xp,
                    status: reg.status,
                    date: reg.registeredAt,
                });
            }
        }

        // Process course enrollments → XP
        for (const enrollment of userEnrollments) {
            const course = courseMap.get(enrollment.courseId?.toString());
            if (!course) continue;

            // Use course title as tag for matching
            const tags = [course.title || '', course.level || ''];
            const matchedBranches = matchTagsToBranches(tags);
            const xp = enrollment.status === 'completed' ? XP_COURSE_COMPLETED : XP_COURSE_ENROLLED;

            // If no branches matched, assign to a default branch
            const branchesToAssign = matchedBranches.length > 0
                ? matchedBranches
                : [SKILL_BRANCHES[0].id];

            for (const branchId of branchesToAssign) {
                branchXP[branchId] += xp;
                branchActivities[branchId].push({
                    type: 'course',
                    title: course.title || 'Khóa học',
                    xp,
                    status: enrollment.status,
                    date: enrollment.enrolledAt,
                });
            }
        }

        // Build response with tier unlocks
        let totalXP = 0;
        const branches = SKILL_BRANCHES.map(branch => {
            const xp = branchXP[branch.id];
            totalXP += xp;

            const tiers = branch.tiers.map((tier, idx) => {
                const isUnlocked = xp >= tier.xpRequired;
                const nextTier = branch.tiers[idx + 1];
                const isInProgress = isUnlocked && nextTier && xp < nextTier.xpRequired;

                return {
                    id: tier.id,
                    title: tier.title,
                    titleEn: tier.titleEn,
                    description: tier.description,
                    descriptionEn: tier.descriptionEn,
                    xpRequired: tier.xpRequired,
                    status: isInProgress ? 'in-progress' : isUnlocked ? 'unlocked' : 'locked',
                };
            });

            // Current tier = highest unlocked
            const currentTierIndex = tiers.reduce((maxIdx, tier, idx) =>
                tier.status !== 'locked' ? idx : maxIdx, 0);

            return {
                id: branch.id,
                icon: branch.icon,
                color: branch.color,
                colorLight: branch.colorLight,
                xp,
                currentTier: currentTierIndex,
                tiers,
                activities: branchActivities[branch.id].slice(0, 5), // Last 5
            };
        });

        // Compute overall level based on total XP
        const overallLevel = Math.floor(totalXP / 100) + 1;

        // ── v2 enriched fields ───────────────────
        const completedContestsCount = userRegistrations.filter(r => r.status === 'completed').length;
        const completedCoursesCount = userEnrollments.filter(e => e.status === 'completed').length;

        // Count project submissions
        let projectsSubmittedCount = 0;
        try {
            const submissions = getCollection('project_submissions');
            projectsSubmittedCount = await submissions.countDocuments({ userId: userObjectId });
        } catch { /* collection may not exist */ }

        // Streak (placeholder — real implementation would track daily login)
        const streakDays = 0;

        res.json({
            user: {
                id: user._id.toString(),
                name: user.name || 'Ẩn danh',
                avatar: user.avatar || null,
            },
            totalXP,
            overallLevel,
            branches,
            // v2 fields
            contestsCompleted: completedContestsCount,
            projectsSubmitted: projectsSubmittedCount,
            coursesCompleted: completedCoursesCount,
            streakDays,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
