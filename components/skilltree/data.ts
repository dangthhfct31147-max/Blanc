// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skill Tree Data — Branch Definitions & Node Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import type { BranchDef, BranchId, SkillNodeDef, UnlockCondition } from './types';

// ── Branch Definitions ───────────────────────────
export const BRANCHES: BranchDef[] = [
    {
        id: 'research',
        name: 'Nghiên cứu',
        nameEn: 'Research',
        subtitle: 'Khám phá & phân tích khoa học',
        subtitleEn: 'Scientific exploration & analysis',
        icon: 'Microscope',
        accentColor: '#3b82f6',
        accentLight: '#93c5fd',
        accentDark: '#1d4ed8',
        gradientFrom: '#3b82f6',
        gradientTo: '#1d4ed8',
        tags: ['nghiên cứu', 'khoa học', 'research', 'science', 'stem', 'toán', 'math', 'vật lý', 'physics', 'hóa học', 'chemistry', 'sinh học', 'biology', 'môi trường', 'environment'],
    },
    {
        id: 'coding',
        name: 'Lập trình',
        nameEn: 'Coding',
        subtitle: 'Xây dựng giải pháp công nghệ',
        subtitleEn: 'Building tech solutions',
        icon: 'Code2',
        accentColor: '#10b981',
        accentLight: '#6ee7b7',
        accentDark: '#059669',
        gradientFrom: '#10b981',
        gradientTo: '#059669',
        tags: ['lập trình', 'công nghệ', 'programming', 'technology', 'tech', 'code', 'coding', 'hackathon', 'ai', 'machine learning', 'web', 'app', 'phần mềm', 'software', 'it', 'data'],
    },
    {
        id: 'entrepreneurship',
        name: 'Khởi nghiệp',
        nameEn: 'Entrepreneurship',
        subtitle: 'Từ ý tưởng đến giá trị',
        subtitleEn: 'From ideas to impact',
        icon: 'Rocket',
        accentColor: '#f59e0b',
        accentLight: '#fcd34d',
        accentDark: '#d97706',
        gradientFrom: '#f59e0b',
        gradientTo: '#d97706',
        tags: ['khởi nghiệp', 'startup', 'kinh doanh', 'business', 'marketing', 'quản trị', 'management', 'tài chính', 'finance', 'thương mại', 'innovation', 'đổi mới', 'entrepreneurship'],
    },
    {
        id: 'creativity',
        name: 'Sáng tạo',
        nameEn: 'Creativity',
        subtitle: 'Thiết kế & truyền thông sáng tạo',
        subtitleEn: 'Design & creative storytelling',
        icon: 'Palette',
        accentColor: '#ec4899',
        accentLight: '#f9a8d4',
        accentDark: '#db2777',
        gradientFrom: '#ec4899',
        gradientTo: '#db2777',
        tags: ['sáng tạo', 'thiết kế', 'design', 'creative', 'nghệ thuật', 'art', 'ux', 'ui', 'đồ họa', 'multimedia', 'video', 'ảnh', 'photography', 'âm nhạc', 'music', 'văn hóa', 'culture'],
    },
    {
        id: 'presentation',
        name: 'Thuyết trình',
        nameEn: 'Presentation',
        subtitle: 'Giao tiếp & tạo ảnh hưởng',
        subtitleEn: 'Communication & influence',
        icon: 'Mic2',
        accentColor: '#8b5cf6',
        accentLight: '#c4b5fd',
        accentDark: '#7c3aed',
        gradientFrom: '#8b5cf6',
        gradientTo: '#7c3aed',
        tags: ['thuyết trình', 'giao tiếp', 'communication', 'presentation', 'debate', 'hùng biện', 'mc', 'diễn thuyết', 'public speaking', 'ngoại ngữ', 'tiếng anh', 'english', 'writing', 'viết', 'báo chí', 'journalism'],
    },
];

export const BRANCH_MAP: Record<BranchId, BranchDef> = Object.fromEntries(
    BRANCHES.map((b) => [b.id, b])
) as Record<BranchId, BranchDef>;

// ── Helper to build unlock conditions ────────────
function branchXP(value: number): UnlockCondition {
    return { type: 'branch_xp', value, label: `${value} XP nhánh`, labelEn: `${value} branch XP` };
}
function parentDone(parentId: string): UnlockCondition {
    return { type: 'parent_completed', target: parentId, value: 1, label: 'Hoàn thành cấp trước', labelEn: 'Complete previous tier' };
}
function contestCount(n: number): UnlockCondition {
    return { type: 'contest_count', value: n, label: `${n} cuộc thi đã tham gia`, labelEn: `${n} contest(s) joined` };
}
function projectCount(n: number): UnlockCondition {
    return { type: 'project_count', value: n, label: `${n} dự án đã nộp`, labelEn: `${n} project(s) submitted` };
}
function courseCount(n: number): UnlockCondition {
    return { type: 'course_count', value: n, label: `${n} khóa học hoàn thành`, labelEn: `${n} course(s) completed` };
}
function crossBranch(branchId: string, tier: number): UnlockCondition {
    return { type: 'cross_branch', target: branchId, value: tier, label: `Cấp ${tier} nhánh khác`, labelEn: `Tier ${tier} in another branch` };
}

// ── Node Definitions ─────────────────────────────
export const SKILL_NODES: SkillNodeDef[] = [
    // ═══ RESEARCH ═══
    {
        id: 'research-1', branchId: 'research', tier: 1,
        title: 'Người tò mò', titleEn: 'Curious Mind',
        subtitle: 'Bắt đầu hành trình', subtitleEn: 'Starting the journey',
        description: 'Tìm hiểu thế giới nghiên cứu khoa học — bước đầu tiên trong hành trình khám phá.', descriptionEn: 'Explore the world of scientific research — your first step into discovery.',
        icon: 'Search', xpRequired: 0, isMilestone: false,
        unlockConditions: [],
        rewards: { badge: 'Khởi đầu Nghiên cứu', badgeEn: 'Research Starter', profileBoost: 5 },
        relatedCategories: ['science', 'stem'],
        suggestedActions: [
            { label: 'Tham gia cuộc thi STEM', labelEn: 'Join a STEM contest', type: 'contest' },
            { label: 'Khám phá khóa học phương pháp nghiên cứu', labelEn: 'Explore research methodology courses', type: 'course' },
        ],
    },
    {
        id: 'research-2', branchId: 'research', tier: 2,
        title: 'Nhà quan sát', titleEn: 'Explorer',
        subtitle: 'Học cách đặt câu hỏi', subtitleEn: 'Learning to ask questions',
        description: 'Thu thập dữ liệu, quan sát hiện tượng, rèn luyện tư duy phản biện.', descriptionEn: 'Collect data, observe phenomena, develop critical thinking.',
        icon: 'Eye', xpRequired: 80, isMilestone: false,
        unlockConditions: [branchXP(80), parentDone('research-1')],
        rewards: { badge: 'Nhà quan sát', badgeEn: 'Observer', profileBoost: 10 },
        relatedCategories: ['science', 'research'],
        suggestedActions: [
            { label: 'Nộp bài phân tích đầu tiên', labelEn: 'Submit first analysis', type: 'project' },
        ],
    },
    {
        id: 'research-3', branchId: 'research', tier: 3,
        title: 'Nhà phân tích', titleEn: 'Analyst',
        subtitle: 'Xử lý dữ liệu & lập luận', subtitleEn: 'Data processing & reasoning',
        description: 'Phân tích dữ liệu, lập luận khoa học, viết báo cáo chuyên nghiệp.', descriptionEn: 'Analyze data, scientific reasoning, write professional reports.',
        icon: 'BarChart3', xpRequired: 200, isMilestone: false,
        unlockConditions: [branchXP(200), parentDone('research-2'), contestCount(1)],
        rewards: { badge: 'Nhà phân tích', badgeEn: 'Analyst', profileBoost: 15, portfolioTag: 'research-analyst' },
        relatedCategories: ['science', 'research', 'data'],
        suggestedActions: [
            { label: 'Tham gia cuộc thi khoa học', labelEn: 'Join a science competition', type: 'contest' },
            { label: 'Nộp dự án nghiên cứu', labelEn: 'Submit a research project', type: 'project' },
        ],
    },
    {
        id: 'research-4', branchId: 'research', tier: 4,
        title: 'Nhà nghiên cứu', titleEn: 'Researcher',
        subtitle: 'Nghiên cứu chuyên sâu', subtitleEn: 'Deep research practice',
        description: 'Thực hiện nghiên cứu độc lập, mentoring đồng đội, đóng góp tri thức.', descriptionEn: 'Conduct independent research, mentor teammates, contribute knowledge.',
        icon: 'FlaskConical', xpRequired: 400, isMilestone: true,
        unlockConditions: [branchXP(400), parentDone('research-3'), projectCount(1), courseCount(1)],
        rewards: { badge: 'Nhà nghiên cứu', badgeEn: 'Researcher', profileBoost: 25, portfolioTag: 'researcher' },
        relatedCategories: ['science', 'research'],
        suggestedActions: [
            { label: 'Làm dự án nghiên cứu nhóm', labelEn: 'Start a team research project', type: 'team' },
        ],
    },
    {
        id: 'research-5', branchId: 'research', tier: 5,
        title: 'Nhà khoa học trẻ', titleEn: 'Young Scientist',
        subtitle: 'Đỉnh cao nghiên cứu', subtitleEn: 'Research pinnacle',
        description: 'Tầm nhìn rộng, nghiên cứu liên ngành, truyền cảm hứng khoa học.', descriptionEn: 'Broad vision, interdisciplinary research, inspiring scientific pursuit.',
        icon: 'Atom', xpRequired: 700, isMilestone: true,
        unlockConditions: [branchXP(700), parentDone('research-4'), contestCount(3), projectCount(2), crossBranch('presentation', 2)],
        rewards: { badge: 'Nhà khoa học trẻ', badgeEn: 'Young Scientist', profileBoost: 40, portfolioTag: 'young-scientist' },
        relatedCategories: ['science', 'research', 'stem'],
        suggestedActions: [
            { label: 'Đăng ký cuộc thi khoa học quốc tế', labelEn: 'Register for an international science competition', type: 'contest' },
        ],
    },

    // ═══ CODING ═══
    {
        id: 'coding-1', branchId: 'coding', tier: 1,
        title: 'Tập sự', titleEn: 'Beginner',
        subtitle: 'Bước chân vào code', subtitleEn: 'First steps into code',
        description: 'Viết dòng code đầu tiên, làm quen với tư duy logic lập trình.', descriptionEn: 'Write your first line of code, learn programming logic.',
        icon: 'Terminal', xpRequired: 0, isMilestone: false,
        unlockConditions: [],
        rewards: { badge: 'Hello World', badgeEn: 'Hello World', profileBoost: 5 },
        relatedCategories: ['programming', 'tech'],
        suggestedActions: [
            { label: 'Tham gia hackathon đầu tiên', labelEn: 'Join your first hackathon', type: 'contest' },
            { label: 'Bắt đầu khóa học lập trình', labelEn: 'Start a coding course', type: 'course' },
        ],
    },
    {
        id: 'coding-2', branchId: 'coding', tier: 2,
        title: 'Builder', titleEn: 'Builder',
        subtitle: 'Xây dựng sản phẩm nhỏ', subtitleEn: 'Building small products',
        description: 'Tạo ứng dụng đầu tiên, làm việc với dữ liệu và giao diện.', descriptionEn: 'Build your first app, work with data and interfaces.',
        icon: 'Hammer', xpRequired: 80, isMilestone: false,
        unlockConditions: [branchXP(80), parentDone('coding-1')],
        rewards: { badge: 'Builder', badgeEn: 'Builder', profileBoost: 10 },
        relatedCategories: ['programming', 'hackathon'],
        suggestedActions: [
            { label: 'Nộp dự án công nghệ', labelEn: 'Submit a tech project', type: 'project' },
        ],
    },
    {
        id: 'coding-3', branchId: 'coding', tier: 3,
        title: 'Developer', titleEn: 'Developer',
        subtitle: 'Phát triển giải pháp', subtitleEn: 'Developing solutions',
        description: 'Xây dựng ứng dụng phức tạp, làm việc nhóm, sử dụng công cụ chuyên nghiệp.', descriptionEn: 'Build complex apps, collaborate in teams, use professional tools.',
        icon: 'Braces', xpRequired: 200, isMilestone: false,
        unlockConditions: [branchXP(200), parentDone('coding-2'), contestCount(1)],
        rewards: { badge: 'Developer', badgeEn: 'Developer', profileBoost: 15, portfolioTag: 'developer' },
        relatedCategories: ['programming', 'software'],
        suggestedActions: [
            { label: 'Tạo dự án mã nguồn mở', labelEn: 'Create an open source project', type: 'project' },
            { label: 'Tham gia hackathon lớn', labelEn: 'Join a major hackathon', type: 'contest' },
        ],
    },
    {
        id: 'coding-4', branchId: 'coding', tier: 4,
        title: 'Engineer', titleEn: 'Engineer',
        subtitle: 'Kỹ sư giải pháp', subtitleEn: 'Solution engineer',
        description: 'Xử lý vấn đề phức tạp, kiến trúc hệ thống, tối ưu hiệu năng.', descriptionEn: 'Solve complex problems, system architecture, optimize performance.',
        icon: 'Cpu', xpRequired: 400, isMilestone: true,
        unlockConditions: [branchXP(400), parentDone('coding-3'), projectCount(2), courseCount(1)],
        rewards: { badge: 'Engineer', badgeEn: 'Engineer', profileBoost: 25, portfolioTag: 'engineer' },
        relatedCategories: ['programming', 'software', 'ai'],
        suggestedActions: [
            { label: 'Lead nhóm trong hackathon', labelEn: 'Lead a hackathon team', type: 'team' },
        ],
    },
    {
        id: 'coding-5', branchId: 'coding', tier: 5,
        title: 'Architect', titleEn: 'Architect',
        subtitle: 'Kiến trúc sư số', subtitleEn: 'Digital architect',
        description: 'Thiết kế hệ thống, dẫn dắt dự án, tầm nhìn công nghệ.', descriptionEn: 'Design systems, lead projects, technology vision.',
        icon: 'Blocks', xpRequired: 700, isMilestone: true,
        unlockConditions: [branchXP(700), parentDone('coding-4'), contestCount(3), projectCount(3), crossBranch('entrepreneurship', 2)],
        rewards: { badge: 'Architect', badgeEn: 'Architect', profileBoost: 40, portfolioTag: 'architect' },
        relatedCategories: ['programming', 'software', 'tech'],
        suggestedActions: [
            { label: 'Xây dựng sản phẩm hoàn chỉnh', labelEn: 'Build a complete product', type: 'project' },
        ],
    },

    // ═══ ENTREPRENEURSHIP ═══
    {
        id: 'entrepreneurship-1', branchId: 'entrepreneurship', tier: 1,
        title: 'Người mơ lớn', titleEn: 'Dreamer',
        subtitle: 'Ý tưởng đầu tiên', subtitleEn: 'First ideas',
        description: 'Quan sát vấn đề xung quanh, tìm cơ hội, bắt đầu suy nghĩ như nhà khởi nghiệp.', descriptionEn: 'Observe problems around you, find opportunities, start thinking like an entrepreneur.',
        icon: 'Lightbulb', xpRequired: 0, isMilestone: false,
        unlockConditions: [],
        rewards: { badge: 'Người mơ lớn', badgeEn: 'Dreamer', profileBoost: 5 },
        relatedCategories: ['business', 'startup'],
        suggestedActions: [
            { label: 'Tham gia cuộc thi start-up', labelEn: 'Join a startup competition', type: 'contest' },
        ],
    },
    {
        id: 'entrepreneurship-2', branchId: 'entrepreneurship', tier: 2,
        title: 'Khởi xướng', titleEn: 'Initiator',
        subtitle: 'Từ ý tưởng đến hành động', subtitleEn: 'From idea to action',
        description: 'Viết kế hoạch kinh doanh đầu tiên, xác thực ý tưởng.', descriptionEn: 'Write your first business plan, validate your idea.',
        icon: 'Sparkles', xpRequired: 80, isMilestone: false,
        unlockConditions: [branchXP(80), parentDone('entrepreneurship-1')],
        rewards: { badge: 'Khởi xướng', badgeEn: 'Initiator', profileBoost: 10 },
        relatedCategories: ['business', 'innovation'],
        suggestedActions: [
            { label: 'Nộp đề án kinh doanh', labelEn: 'Submit a business proposal', type: 'project' },
        ],
    },
    {
        id: 'entrepreneurship-3', branchId: 'entrepreneurship', tier: 3,
        title: 'Nhà kiến tạo', titleEn: 'Maker',
        subtitle: 'Xây dựng MVP', subtitleEn: 'Building your MVP',
        description: 'Phát triển sản phẩm tối thiểu, tìm khách hàng đầu tiên.', descriptionEn: 'Develop a minimum viable product, find first customers.',
        icon: 'Wrench', xpRequired: 200, isMilestone: false,
        unlockConditions: [branchXP(200), parentDone('entrepreneurship-2'), contestCount(1)],
        rewards: { badge: 'Maker', badgeEn: 'Maker', profileBoost: 15, portfolioTag: 'maker' },
        relatedCategories: ['business', 'startup'],
        suggestedActions: [
            { label: 'Tìm đồng đội khởi nghiệp', labelEn: 'Find co-founders', type: 'team' },
        ],
    },
    {
        id: 'entrepreneurship-4', branchId: 'entrepreneurship', tier: 4,
        title: 'Founder', titleEn: 'Founder',
        subtitle: 'Nhà sáng lập trẻ', subtitleEn: 'Young founder',
        description: 'Dẫn dắt đội nhóm, gọi vốn, xây dựng tổ chức.', descriptionEn: 'Lead teams, pitch to investors, build an organization.',
        icon: 'Crown', xpRequired: 400, isMilestone: true,
        unlockConditions: [branchXP(400), parentDone('entrepreneurship-3'), projectCount(1), crossBranch('coding', 2)],
        rewards: { badge: 'Founder', badgeEn: 'Founder', profileBoost: 25, portfolioTag: 'founder' },
        relatedCategories: ['business', 'startup', 'leadership'],
        suggestedActions: [
            { label: 'Tham gia incubator', labelEn: 'Join an incubator program', type: 'course' },
        ],
    },
    {
        id: 'entrepreneurship-5', branchId: 'entrepreneurship', tier: 5,
        title: 'Visionary', titleEn: 'Visionary',
        subtitle: 'Tầm nhìn tạo thay đổi', subtitleEn: 'Vision that creates change',
        description: 'Tạo ảnh hưởng kinh tế - xã hội, tầm nhìn dẫn dắt cộng đồng.', descriptionEn: 'Create socio-economic impact, visionary community leadership.',
        icon: 'Gem', xpRequired: 700, isMilestone: true,
        unlockConditions: [branchXP(700), parentDone('entrepreneurship-4'), contestCount(3), projectCount(2), crossBranch('creativity', 2)],
        rewards: { badge: 'Visionary', badgeEn: 'Visionary', profileBoost: 40, portfolioTag: 'visionary' },
        relatedCategories: ['business', 'startup', 'innovation'],
        suggestedActions: [
            { label: 'Chia sẻ câu chuyện khởi nghiệp', labelEn: 'Share your startup story', type: 'project' },
        ],
    },

    // ═══ CREATIVITY ═══
    {
        id: 'creativity-1', branchId: 'creativity', tier: 1,
        title: 'Tập sự sáng tạo', titleEn: 'Apprentice',
        subtitle: 'Khơi nguồn cảm hứng', subtitleEn: 'Sparking inspiration',
        description: 'Khám phá các hình thức biểu đạt sáng tạo: thiết kế, video, nghệ thuật.', descriptionEn: 'Discover creative expression: design, video, art.',
        icon: 'Brush', xpRequired: 0, isMilestone: false,
        unlockConditions: [],
        rewards: { badge: 'Tập sự sáng tạo', badgeEn: 'Creative Apprentice', profileBoost: 5 },
        relatedCategories: ['design', 'art', 'creative'],
        suggestedActions: [
            { label: 'Tham gia cuộc thi thiết kế', labelEn: 'Join a design contest', type: 'contest' },
        ],
    },
    {
        id: 'creativity-2', branchId: 'creativity', tier: 2,
        title: 'Nhà thiết kế', titleEn: 'Designer',
        subtitle: 'Thẩm mỹ & ý tưởng', subtitleEn: 'Aesthetics & ideas',
        description: 'Phát triển kỹ năng thiết kế, xây dựng phong cách cá nhân.', descriptionEn: 'Develop design skills, build your personal style.',
        icon: 'PenTool', xpRequired: 80, isMilestone: false,
        unlockConditions: [branchXP(80), parentDone('creativity-1')],
        rewards: { badge: 'Nhà thiết kế', badgeEn: 'Designer', profileBoost: 10 },
        relatedCategories: ['design', 'ux'],
        suggestedActions: [
            { label: 'Nộp bài thiết kế portfolio', labelEn: 'Submit design to portfolio', type: 'project' },
        ],
    },
    {
        id: 'creativity-3', branchId: 'creativity', tier: 3,
        title: 'Nhà sáng tạo', titleEn: 'Creator',
        subtitle: 'Kể chuyện bằng hình ảnh', subtitleEn: 'Visual storytelling',
        description: 'Tạo nội dung multimedia, branding, kể chuyện bằng thiết kế.', descriptionEn: 'Create multimedia content, branding, design storytelling.',
        icon: 'Film', xpRequired: 200, isMilestone: false,
        unlockConditions: [branchXP(200), parentDone('creativity-2'), contestCount(1)],
        rewards: { badge: 'Creator', badgeEn: 'Creator', profileBoost: 15, portfolioTag: 'creator' },
        relatedCategories: ['design', 'multimedia'],
        suggestedActions: [
            { label: 'Tạo dự án thiết kế đồng đội', labelEn: 'Start a team design project', type: 'team' },
        ],
    },
    {
        id: 'creativity-4', branchId: 'creativity', tier: 4,
        title: 'Storyteller', titleEn: 'Storyteller',
        subtitle: 'Truyền tải cảm xúc', subtitleEn: 'Conveying emotions',
        description: 'Xây dựng thương hiệu, tạo ảnh hưởng sáng tạo, mentoring.', descriptionEn: 'Build brands, create creative impact, mentor others.',
        icon: 'BookOpen', xpRequired: 400, isMilestone: true,
        unlockConditions: [branchXP(400), parentDone('creativity-3'), projectCount(2), courseCount(1)],
        rewards: { badge: 'Storyteller', badgeEn: 'Storyteller', profileBoost: 25, portfolioTag: 'storyteller' },
        relatedCategories: ['design', 'art', 'creative'],
        suggestedActions: [
            { label: 'Xây dựng portfolio sáng tạo', labelEn: 'Build a creative portfolio', type: 'project' },
        ],
    },
    {
        id: 'creativity-5', branchId: 'creativity', tier: 5,
        title: 'Nghệ sĩ', titleEn: 'Artist',
        subtitle: 'Tầm nhìn sáng tạo', subtitleEn: 'Creative vision',
        description: 'Tạo phong cách riêng, ảnh hưởng đến cộng đồng sáng tạo.', descriptionEn: 'Create your own style, influence the creative community.',
        icon: 'Wand2', xpRequired: 700, isMilestone: true,
        unlockConditions: [branchXP(700), parentDone('creativity-4'), contestCount(3), crossBranch('presentation', 2)],
        rewards: { badge: 'Nghệ sĩ', badgeEn: 'Artist', profileBoost: 40, portfolioTag: 'artist' },
        relatedCategories: ['design', 'art'],
        suggestedActions: [
            { label: 'Thi sáng tạo quốc tế', labelEn: 'Enter an international creative competition', type: 'contest' },
        ],
    },

    // ═══ PRESENTATION ═══
    {
        id: 'presentation-1', branchId: 'presentation', tier: 1,
        title: 'Người mới nói', titleEn: 'First Voice',
        subtitle: 'Bắt đầu lên tiếng', subtitleEn: 'Start speaking up',
        description: 'Tập nói trước đám đông, tham gia thảo luận nhóm.', descriptionEn: 'Practice public speaking, join group discussions.',
        icon: 'MessageCircle', xpRequired: 0, isMilestone: false,
        unlockConditions: [],
        rewards: { badge: 'Người mới nói', badgeEn: 'First Voice', profileBoost: 5 },
        relatedCategories: ['communication', 'speaking'],
        suggestedActions: [
            { label: 'Tham gia cuộc thi hùng biện', labelEn: 'Join a debate competition', type: 'contest' },
        ],
    },
    {
        id: 'presentation-2', branchId: 'presentation', tier: 2,
        title: 'Communicator', titleEn: 'Communicator',
        subtitle: 'Truyền đạt rõ ràng', subtitleEn: 'Clear communication',
        description: 'Thuyết phục bằng lập luận, kỹ năng trình bày chuyên nghiệp.', descriptionEn: 'Persuade through arguments, professional presentation skills.',
        icon: 'Users', xpRequired: 80, isMilestone: false,
        unlockConditions: [branchXP(80), parentDone('presentation-1')],
        rewards: { badge: 'Communicator', badgeEn: 'Communicator', profileBoost: 10 },
        relatedCategories: ['communication', 'debate'],
        suggestedActions: [
            { label: 'Thuyết trình dự án', labelEn: 'Present a project', type: 'project' },
        ],
    },
    {
        id: 'presentation-3', branchId: 'presentation', tier: 3,
        title: 'Presenter', titleEn: 'Presenter',
        subtitle: 'Trên sân khấu lớn', subtitleEn: 'On the big stage',
        description: 'Dẫn dắt đội nhóm trình bày, thuyết trình tự tin trước hội đồng.', descriptionEn: 'Lead team presentations, present confidently to panels.',
        icon: 'Presentation', xpRequired: 200, isMilestone: false,
        unlockConditions: [branchXP(200), parentDone('presentation-2'), contestCount(1)],
        rewards: { badge: 'Presenter', badgeEn: 'Presenter', profileBoost: 15, portfolioTag: 'presenter' },
        relatedCategories: ['communication', 'leadership'],
        suggestedActions: [
            { label: 'Xây dựng portfolio thuyết trình', labelEn: 'Build presentation portfolio', type: 'project' },
        ],
    },
    {
        id: 'presentation-4', branchId: 'presentation', tier: 4,
        title: 'Influencer', titleEn: 'Influencer',
        subtitle: 'Tạo ảnh hưởng', subtitleEn: 'Creating influence',
        description: 'Truyền cảm hứng cho cộng đồng, mentor đồng đội về trình bày.', descriptionEn: 'Inspire communities, mentor teammates on presentation skills.',
        icon: 'Award', xpRequired: 400, isMilestone: true,
        unlockConditions: [branchXP(400), parentDone('presentation-3'), projectCount(1), courseCount(1)],
        rewards: { badge: 'Influencer', badgeEn: 'Influencer', profileBoost: 25, portfolioTag: 'influencer' },
        relatedCategories: ['communication', 'leadership'],
        suggestedActions: [
            { label: 'Hướng dẫn nhóm thuyết trình', labelEn: 'Coach a team on presenting', type: 'team' },
        ],
    },
    {
        id: 'presentation-5', branchId: 'presentation', tier: 5,
        title: 'Public Voice', titleEn: 'Public Voice',
        subtitle: 'Tiếng nói cộng đồng', subtitleEn: 'Voice of the community',
        description: 'Diễn giả trước đám đông lớn, tạo phong trào, truyền cảm hứng.', descriptionEn: 'Speak to large audiences, start movements, inspire.',
        icon: 'Megaphone', xpRequired: 700, isMilestone: true,
        unlockConditions: [branchXP(700), parentDone('presentation-4'), contestCount(3), crossBranch('research', 2)],
        rewards: { badge: 'Public Voice', badgeEn: 'Public Voice', profileBoost: 40, portfolioTag: 'public-voice' },
        relatedCategories: ['communication', 'leadership', 'speaking'],
        suggestedActions: [
            { label: 'Diễn thuyết tại sự kiện', labelEn: 'Speak at an event', type: 'contest' },
        ],
    },
];

export const NODE_MAP: Record<string, SkillNodeDef> = Object.fromEntries(
    SKILL_NODES.map((n) => [n.id, n])
);

export function getNodesForBranch(branchId: BranchId): SkillNodeDef[] {
    return SKILL_NODES.filter((n) => n.branchId === branchId).sort((a, b) => a.tier - b.tier);
}

// ── XP Reward Table ──────────────────────────────
export const XP_REWARDS: Record<string, number> = {
    contest_join: 30,
    contest_complete: 80,
    project_submit: 50,
    course_complete: 60,
    peer_review: 15,
    portfolio_entry: 25,
    team_collab: 20,
    streak_bonus: 10,
};

// ── Level Thresholds (cumulative XP) ─────────────
export const LEVEL_THRESHOLDS = [
    0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000,
    6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000, 26000,
];

export function xpToLevel(xp: number): number {
    let level = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
        else break;
    }
    return level;
}

export function xpToNextLevel(xp: number): { current: number; next: number; progress: number } {
    const level = xpToLevel(xp);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 500;
    const progress = (xp - currentThreshold) / (nextThreshold - currentThreshold);
    return { current: currentThreshold, next: nextThreshold, progress: Math.min(1, Math.max(0, progress)) };
}

// ── Desktop Layout Config ────────────────────────
export const DESKTOP_LAYOUT = {
    width: 960,
    height: 800,
    centerX: 480,
    centerY: 400,
    branchAngles: [-90, -18, 54, 126, 198] as const,
    tierDistances: [100, 175, 250, 320, 385],
    centerRadius: 52,
};
