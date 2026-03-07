// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skill Tree Type System — ContestHub
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Node States ──────────────────────────────────
export type NodeState = 'locked' | 'available' | 'active' | 'completed' | 'milestone-locked' | 'milestone-completed';

// ── Branch identifiers ───────────────────────────
export type BranchId = 'research' | 'coding' | 'entrepreneurship' | 'creativity' | 'presentation';

// ── XP Source Types ──────────────────────────────
export type XPSourceType =
    | 'contest_join'
    | 'contest_complete'
    | 'project_submit'
    | 'course_complete'
    | 'peer_review'
    | 'portfolio_entry'
    | 'team_collab'
    | 'streak_bonus';

// ── Unlock Condition ─────────────────────────────
export interface UnlockCondition {
    type: 'branch_xp' | 'parent_completed' | 'contest_count' | 'project_count' | 'course_count' | 'cross_branch' | 'global_level';
    /** For cross_branch: branchId; for parent_completed: parentNodeId */
    target?: string;
    value: number;
    label: string;
    labelEn: string;
}

// ── Skill Node Definition ────────────────────────
export interface SkillNodeDef {
    id: string;
    branchId: BranchId;
    tier: number; // 1–5
    title: string;
    titleEn: string;
    subtitle: string;
    subtitleEn: string;
    description: string;
    descriptionEn: string;
    /** lucide-react icon name */
    icon: string;
    xpRequired: number;
    isMilestone: boolean;
    unlockConditions: UnlockCondition[];
    rewards: {
        badge?: string;
        badgeEn?: string;
        profileBoost?: number;
        portfolioTag?: string;
    };
    relatedCategories: string[];
    suggestedActions: SuggestedAction[];
}

export interface SuggestedAction {
    label: string;
    labelEn: string;
    type: 'contest' | 'course' | 'project' | 'team';
}

// ── Branch Definition ────────────────────────────
export interface BranchDef {
    id: BranchId;
    name: string;
    nameEn: string;
    subtitle: string;
    subtitleEn: string;
    icon: string; // lucide icon name
    accentColor: string;
    accentLight: string;
    accentDark: string;
    gradientFrom: string;
    gradientTo: string;
    tags: string[];
}

// ── User Node Progress ───────────────────────────
export interface UserNodeProgress {
    nodeId: string;
    state: NodeState;
    xpEarned: number;
    completedAt?: string;
    unlockedAt?: string;
    conditionsMet: Record<string, boolean>;
}

// ── XP Activity ──────────────────────────────────
export interface XPActivity {
    id: string;
    type: XPSourceType;
    branchId: BranchId;
    title: string;
    xpAmount: number;
    timestamp: string;
}

// ── Recommendation ───────────────────────────────
export interface Recommendation {
    nodeId: string;
    branchId: BranchId;
    reason: string;
    reasonEn: string;
    priority: 'high' | 'medium' | 'low';
    type: 'next_step' | 'balance' | 'interest' | 'contest_aligned';
    progressPercent: number;
}

// ── User Skill Tree State (API Response) ─────────
export interface UserSkillTreeState {
    userId: string;
    userName: string;
    userAvatar: string | null;
    globalXP: number;
    globalLevel: number;
    branchXP: Record<BranchId, number>;
    nodeProgress: Record<string, UserNodeProgress>;
    achievements: string[];
    contestsCompleted: number;
    projectsSubmitted: number;
    coursesCompleted: number;
    streakDays: number;
    recentActivities: XPActivity[];
}

// ── Computed Node (after engine processing) ──────
export interface ComputedNode {
    def: SkillNodeDef;
    state: NodeState;
    xpProgress: number; // 0-1 fraction
    xpCurrent: number;
    xpNeeded: number;
    conditionResults: { condition: UnlockCondition; met: boolean }[];
    allConditionsMet: boolean;
}

// ── Computed Branch ──────────────────────────────
export interface ComputedBranch {
    def: BranchDef;
    nodes: ComputedNode[];
    totalXP: number;
    currentTier: number;
    maxTier: number;
    progressPercent: number;
}

// ── Locale ───────────────────────────────────────
export type Locale = 'vi' | 'en';

// ── Layout position for desktop radial view ──────
export interface NodePosition {
    x: number;
    y: number;
    nodeId: string;
    branchId: BranchId;
    tier: number;
}
