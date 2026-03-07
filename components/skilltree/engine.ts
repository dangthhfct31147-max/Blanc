// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skill Tree Engine — XP, Unlock, and Recommendation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import type {
    BranchId,
    ComputedBranch,
    ComputedNode,
    NodeState,
    Recommendation,
    SkillNodeDef,
    UnlockCondition,
    UserSkillTreeState,
} from './types';
import { BRANCHES, getNodesForBranch, NODE_MAP } from './data';

// ── Evaluate a single unlock condition ───────────
function evaluateCondition(
    condition: UnlockCondition,
    userState: UserSkillTreeState,
    computedNodes: Record<string, ComputedNode>
): boolean {
    switch (condition.type) {
        case 'branch_xp': {
            // We need to know which branch this condition belongs to — infer from context
            // This will be passed correctly from computeNode
            return true; // handled at computeNode level
        }
        case 'parent_completed': {
            const parentNode = computedNodes[condition.target || ''];
            return parentNode?.state === 'completed' || parentNode?.state === 'active';
        }
        case 'contest_count':
            return userState.contestsCompleted >= condition.value;
        case 'project_count':
            return userState.projectsSubmitted >= condition.value;
        case 'course_count':
            return (userState.coursesCompleted || 0) >= condition.value;
        case 'cross_branch': {
            const branchId = condition.target as BranchId;
            const branchNodes = getNodesForBranch(branchId);
            const targetTier = condition.value;
            const targetNode = branchNodes.find(n => n.tier === targetTier);
            if (!targetNode) return false;
            const computed = computedNodes[targetNode.id];
            return computed?.state === 'completed' || computed?.state === 'active';
        }
        case 'global_level':
            return userState.globalLevel >= condition.value;
        default:
            return false;
    }
}

// ── Compute all nodes with states ────────────────
export function computeSkillTree(userState: UserSkillTreeState): {
    branches: ComputedBranch[];
    recommendations: Recommendation[];
} {
    const computedNodes: Record<string, ComputedNode> = {};

    // First pass: compute nodes branch by branch, tier by tier
    // This ensures parent nodes are computed before children
    for (const branch of BRANCHES) {
        const branchNodes = getNodesForBranch(branch.id);
        const branchXP = userState.branchXP[branch.id] || 0;

        for (const nodeDef of branchNodes) {
            const nodeProgress = userState.nodeProgress[nodeDef.id];
            const xpCurrent = branchXP;
            const xpNeeded = nodeDef.xpRequired;
            const xpProgress = xpNeeded === 0 ? 1 : Math.min(1, xpCurrent / xpNeeded);

            // Evaluate conditions
            const conditionResults = nodeDef.unlockConditions.map(cond => {
                let met = false;
                if (cond.type === 'branch_xp') {
                    met = branchXP >= cond.value;
                } else {
                    met = evaluateCondition(cond, userState, computedNodes);
                }
                return { condition: cond, met };
            });

            const allConditionsMet =
                conditionResults.length === 0 || conditionResults.every(r => r.met);

            // Determine state
            let state: NodeState;
            if (nodeProgress?.state === 'completed' || nodeProgress?.state === 'milestone-completed') {
                state = nodeDef.isMilestone ? 'milestone-completed' : 'completed';
            } else if (allConditionsMet && branchXP >= xpNeeded) {
                // Auto-complete tier 1 nodes, mark others as active
                if (nodeDef.tier === 1) {
                    state = 'completed';
                } else {
                    // Check if next tier is also met — if so this tier is completed
                    const nextTierNode = branchNodes.find(n => n.tier === nodeDef.tier + 1);
                    if (nextTierNode) {
                        const nextXPMet = branchXP >= nextTierNode.xpRequired;
                        if (nextXPMet) {
                            state = nodeDef.isMilestone ? 'milestone-completed' : 'completed';
                        } else {
                            state = 'active';
                        }
                    } else {
                        state = 'active'; // last tier
                    }
                }
            } else if (allConditionsMet || (conditionResults.length > 0 && conditionResults.filter(r => r.met).length >= conditionResults.length - 1)) {
                // Available if all or almost all conditions met
                state = allConditionsMet ? 'available' : 'locked';
            } else {
                state = nodeDef.isMilestone ? 'milestone-locked' : 'locked';
            }

            computedNodes[nodeDef.id] = {
                def: nodeDef,
                state,
                xpProgress,
                xpCurrent,
                xpNeeded,
                conditionResults,
                allConditionsMet,
            };
        }
    }

    // Build computed branches
    const computedBranches: ComputedBranch[] = BRANCHES.map(branchDef => {
        const nodes = getNodesForBranch(branchDef.id).map(n => computedNodes[n.id]);
        const totalXP = userState.branchXP[branchDef.id] || 0;
        const completedNodes = nodes.filter(n =>
            n.state === 'completed' || n.state === 'milestone-completed' || n.state === 'active'
        );
        const currentTier = completedNodes.length;
        const maxTier = nodes.length;
        const progressPercent = maxTier > 0 ? (currentTier / maxTier) * 100 : 0;

        return {
            def: branchDef,
            nodes,
            totalXP,
            currentTier,
            maxTier,
            progressPercent,
        };
    });

    // Generate recommendations
    const recommendations = generateRecommendations(computedBranches, userState);

    return { branches: computedBranches, recommendations };
}

// ── Recommendation Engine ────────────────────────
function generateRecommendations(
    branches: ComputedBranch[],
    userState: UserSkillTreeState
): Recommendation[] {
    const recs: Recommendation[] = [];

    // 1. Next step — find the highest priority available/active node
    for (const branch of branches) {
        const nextNode = branch.nodes.find(n => n.state === 'available' || n.state === 'active');
        if (nextNode) {
            recs.push({
                nodeId: nextNode.def.id,
                branchId: branch.def.id,
                reason: `Bước tiếp theo trong ${branch.def.name}`,
                reasonEn: `Next step in ${branch.def.nameEn}`,
                priority: nextNode.state === 'active' ? 'high' : 'medium',
                type: 'next_step',
                progressPercent: nextNode.xpProgress * 100,
            });
        }
    }

    // 2. Balance — find the weakest branch and suggest improvement
    const branchXPs = branches.map(b => ({ branch: b, xp: b.totalXP }));
    branchXPs.sort((a, b) => a.xp - b.xp);
    const weakest = branchXPs[0];
    const strongest = branchXPs[branchXPs.length - 1];
    if (strongest.xp > 0 && weakest.xp < strongest.xp * 0.4) {
        const nextNode = weakest.branch.nodes.find(n =>
            n.state === 'available' || n.state === 'active' || n.state === 'locked'
        );
        if (nextNode) {
            recs.push({
                nodeId: nextNode.def.id,
                branchId: weakest.branch.def.id,
                reason: `${weakest.branch.def.name} cần được cải thiện để cân bằng`,
                reasonEn: `${weakest.branch.def.nameEn} needs improvement for balance`,
                priority: 'medium',
                type: 'balance',
                progressPercent: nextNode.xpProgress * 100,
            });
        }
    }

    // 3. Interest-aligned — based on recent activities
    if (userState.recentActivities.length > 0) {
        const branchActivityCount: Record<string, number> = {};
        for (const act of userState.recentActivities.slice(0, 10)) {
            branchActivityCount[act.branchId] = (branchActivityCount[act.branchId] || 0) + 1;
        }
        const mostActive = Object.entries(branchActivityCount).sort(
            ([, a], [, b]) => b - a
        )[0];
        if (mostActive) {
            const branch = branches.find(b => b.def.id === mostActive[0]);
            const nextNode = branch?.nodes.find(
                n => n.state === 'available' || n.state === 'active'
            );
            if (nextNode) {
                const existing = recs.find(r => r.nodeId === nextNode.def.id && r.type === 'next_step');
                if (!existing) {
                    recs.push({
                        nodeId: nextNode.def.id,
                        branchId: branch!.def.id,
                        reason: `Phù hợp với hoạt động gần đây của bạn`,
                        reasonEn: `Matches your recent activity pattern`,
                        priority: 'medium',
                        type: 'interest',
                        progressPercent: nextNode.xpProgress * 100,
                    });
                }
            }
        }
    }

    // Sort: high priority first, then by progress (closer to unlock = higher)
    recs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return b.progressPercent - a.progressPercent;
    });

    return recs.slice(0, 5);
}

// ── Mock user state for demo ─────────────────────
export function createMockUserState(): UserSkillTreeState {
    return {
        userId: 'demo-user',
        userName: 'Nguyễn Minh',
        userAvatar: null,
        globalXP: 520,
        globalLevel: 4,
        branchXP: {
            research: 120,
            coding: 250,
            entrepreneurship: 60,
            creativity: 50,
            presentation: 40,
        },
        nodeProgress: {
            'research-1': { nodeId: 'research-1', state: 'completed', xpEarned: 80, conditionsMet: {} },
            'coding-1': { nodeId: 'coding-1', state: 'completed', xpEarned: 80, conditionsMet: {} },
            'coding-2': { nodeId: 'coding-2', state: 'completed', xpEarned: 120, conditionsMet: {} },
            'entrepreneurship-1': { nodeId: 'entrepreneurship-1', state: 'completed', xpEarned: 60, conditionsMet: {} },
            'creativity-1': { nodeId: 'creativity-1', state: 'completed', xpEarned: 50, conditionsMet: {} },
            'presentation-1': { nodeId: 'presentation-1', state: 'completed', xpEarned: 40, conditionsMet: {} },
        },
        achievements: ['first_contest', 'first_project'],
        contestsCompleted: 2,
        projectsSubmitted: 1,
        coursesCompleted: 1,
        streakDays: 5,
        recentActivities: [
            { id: '1', type: 'contest_complete', branchId: 'coding', title: 'Hackathon Đổi Mới 2025', xpAmount: 80, timestamp: '2025-12-01' },
            { id: '2', type: 'project_submit', branchId: 'coding', title: 'App Quản lý Thời gian', xpAmount: 50, timestamp: '2025-11-15' },
            { id: '3', type: 'contest_join', branchId: 'research', title: 'Cuộc thi STEM Quốc gia', xpAmount: 30, timestamp: '2025-11-01' },
            { id: '4', type: 'course_complete', branchId: 'coding', title: 'Nhập môn React', xpAmount: 60, timestamp: '2025-10-20' },
            { id: '5', type: 'contest_join', branchId: 'entrepreneurship', title: 'Startup Weekend', xpAmount: 30, timestamp: '2025-10-10' },
        ],
    };
}
