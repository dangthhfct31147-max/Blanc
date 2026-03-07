import React, { useState, useMemo } from 'react';
import SkillTreeNode, { NodeStatus } from './SkillTreeNode';

// ============== Types ==============

interface TierData {
    id: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    xpRequired: number;
    status: NodeStatus;
}

interface BranchData {
    id: string;
    icon: string;
    color: string;
    colorLight: string;
    xp: number;
    currentTier: number;
    tiers: TierData[];
    activities: {
        type: string;
        title: string;
        xp: number;
        status: string;
        date: string;
    }[];
}

interface SkillTreeData {
    user: { id: string; name: string; avatar: string | null };
    totalXP: number;
    overallLevel: number;
    branches: BranchData[];
}

interface SkillTreeProps {
    data: SkillTreeData;
    locale?: 'vi' | 'en';
}

// ============== Layout Config ==============

const SVG_WIDTH = 900;
const SVG_HEIGHT = 760;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;

// Branch angles (5 branches, evenly spaced) — start from top
const BRANCH_ANGLES = [
    -90,   // top (research)
    -18,   // top-right (programming)
    54,    // bottom-right (startup)
    126,   // bottom-left (creative)
    198,   // top-left (presentation)
];

// Node positions along each branch (distance from center for each tier)
const TIER_DISTANCES = [90, 160, 230, 290, 340];

function polarToCartesian(angleDeg: number, distance: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: CENTER_X + distance * Math.cos(rad),
        y: CENTER_Y + distance * Math.sin(rad),
    };
}

// ============== Component ==============

export default function SkillTree({ data, locale = 'vi' }: SkillTreeProps) {
    const [selectedNode, setSelectedNode] = useState<{ branchIdx: number; tierIdx: number } | null>(null);

    // Precompute node positions
    const nodePositions = useMemo(() => {
        return BRANCH_ANGLES.map((angle) =>
            TIER_DISTANCES.map((dist) => polarToCartesian(angle, dist))
        );
    }, []);

    const selectedInfo = useMemo(() => {
        if (!selectedNode) return null;
        const branch = data.branches[selectedNode.branchIdx];
        if (!branch) return null;
        const tier = branch.tiers[selectedNode.tierIdx];
        if (!tier) return null;
        return { branch, tier };
    }, [selectedNode, data.branches]);

    return (
        <div className="skill-tree-container">
            {/* CSS Animations */}
            <style>{`
                .skill-tree-container {
                    width: 100%;
                    max-width: 920px;
                    margin: 0 auto;
                }
                .skill-tree-svg {
                    width: 100%;
                    height: auto;
                    display: block;
                }
                .skill-node-pulse {
                    animation: nodePulse 2s ease-in-out infinite;
                }
                @keyframes nodePulse {
                    0%, 100% { opacity: 0.3; r: inherit; }
                    50% { opacity: 0.7; }
                }
                .skill-node-selected {
                    filter: drop-shadow(0 0 8px var(--node-glow-color, #6366f1));
                }
                .skill-path-animated {
                    stroke-dasharray: 8 4;
                    animation: pathFlow 1.5s linear infinite;
                }
                @keyframes pathFlow {
                    from { stroke-dashoffset: 0; }
                    to { stroke-dashoffset: -24; }
                }
                .skill-tree-node-group {
                    transition: transform 0.2s ease;
                }
                .skill-tree-node-group:hover {
                    filter: brightness(1.2);
                }
                .skill-tree-detail-card {
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(148, 163, 184, 0.15);
                    border-radius: 16px;
                    padding: 20px;
                    margin-top: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                }
                .xp-progress-bar {
                    height: 8px;
                    border-radius: 4px;
                    background: #1e293b;
                    overflow: hidden;
                    position: relative;
                }
                .xp-progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.6s ease;
                    background: linear-gradient(90deg, var(--branch-color), var(--branch-color-light));
                }
                .branch-legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    border-radius: 999px;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    font-size: 13px;
                    color: #cbd5e1;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    white-space: nowrap;
                }
                .branch-legend-item:hover {
                    background: rgba(51, 65, 85, 0.8);
                    border-color: rgba(148, 163, 184, 0.25);
                }
                .branch-legend-item.active {
                    border-color: var(--branch-color);
                    box-shadow: 0 0 8px var(--branch-color-30);
                }
                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    background: rgba(30, 41, 59, 0.6);
                    font-size: 13px;
                    color: #94a3b8;
                }
                .activity-item + .activity-item {
                    margin-top: 6px;
                }
            `}</style>

            {/* SVG Tree */}
            <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="skill-tree-svg"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Background radial gradient */}
                    <radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </radialGradient>

                    {/* Glow filters for each branch */}
                    {data.branches.map((branch) => (
                        <filter key={`glow-${branch.id}`} id={`glow-${branch.id}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                        </filter>
                    ))}
                </defs>

                {/* Background circle */}
                <circle cx={CENTER_X} cy={CENTER_Y} r={370} fill="url(#bg-gradient)" />

                {/* Decorative rings */}
                {[100, 170, 240, 300, 350].map((r, i) => (
                    <circle
                        key={`ring-${i}`}
                        cx={CENTER_X}
                        cy={CENTER_Y}
                        r={r}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth={0.5}
                        opacity={0.5}
                    />
                ))}

                {/* Branch connection paths */}
                {data.branches.map((branch, branchIdx) => {
                    const positions = nodePositions[branchIdx];
                    return (
                        <g key={`paths-${branch.id}`}>
                            {/* Center to first node */}
                            <line
                                x1={CENTER_X}
                                y1={CENTER_Y}
                                x2={positions[0].x}
                                y2={positions[0].y}
                                stroke={branch.tiers[0].status !== 'locked' ? branch.color : '#1e293b'}
                                strokeWidth={2}
                                opacity={branch.tiers[0].status !== 'locked' ? 0.6 : 0.3}
                                className={branch.tiers[0].status !== 'locked' ? 'skill-path-animated' : ''}
                            />
                            {/* Between tiers */}
                            {positions.slice(0, -1).map((pos, i) => {
                                const nextPos = positions[i + 1];
                                const nextTier = branch.tiers[i + 1];
                                const isPathUnlocked = nextTier && nextTier.status !== 'locked';
                                return (
                                    <line
                                        key={`path-${branch.id}-${i}`}
                                        x1={pos.x}
                                        y1={pos.y}
                                        x2={nextPos.x}
                                        y2={nextPos.y}
                                        stroke={isPathUnlocked ? branch.color : '#1e293b'}
                                        strokeWidth={2}
                                        opacity={isPathUnlocked ? 0.6 : 0.2}
                                        className={isPathUnlocked ? 'skill-path-animated' : ''}
                                    />
                                );
                            })}
                        </g>
                    );
                })}

                {/* Central Hub Node */}
                <g transform={`translate(${CENTER_X}, ${CENTER_Y})`}>
                    {/* Outer glow */}
                    <circle
                        r={46}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth={1.5}
                        opacity={0.4}
                        className="skill-node-pulse"
                    />
                    {/* Ring */}
                    <circle
                        r={40}
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                    />
                    {/* Inner */}
                    <circle r={35} fill="#0f172a" stroke="#4f46e5" strokeWidth={1} />

                    {/* Level text */}
                    <text
                        textAnchor="middle"
                        y={-6}
                        fill="#c7d2fe"
                        fontSize={10}
                        fontWeight="500"
                        style={{ pointerEvents: 'none' }}
                    >
                        LEVEL
                    </text>
                    <text
                        textAnchor="middle"
                        y={14}
                        fill="#e0e7ff"
                        fontSize={22}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                    >
                        {data.overallLevel}
                    </text>
                </g>

                {/* Branch Nodes */}
                {data.branches.map((branch, branchIdx) => (
                    <g key={`nodes-${branch.id}`}>
                        {branch.tiers.map((tier, tierIdx) => {
                            const pos = nodePositions[branchIdx][tierIdx];
                            const isActive =
                                selectedNode?.branchIdx === branchIdx && selectedNode?.tierIdx === tierIdx;
                            return (
                                <g
                                    key={tier.id}
                                    transform={`translate(${pos.x}, ${pos.y})`}
                                    style={
                                        {
                                            '--node-glow-color': branch.color,
                                        } as React.CSSProperties
                                    }
                                >
                                    <SkillTreeNode
                                        id={tier.id}
                                        title={locale === 'en' ? tier.titleEn : tier.title}
                                        description={locale === 'en' ? tier.descriptionEn : tier.description}
                                        xpRequired={tier.xpRequired}
                                        status={tier.status}
                                        branchColor={branch.color}
                                        branchColorLight={branch.colorLight}
                                        icon={branch.icon}
                                        tierIndex={tierIdx}
                                        isActive={isActive}
                                        onClick={() =>
                                            setSelectedNode(
                                                isActive ? null : { branchIdx, tierIdx }
                                            )
                                        }
                                    />
                                </g>
                            );
                        })}
                    </g>
                ))}
            </svg>

            {/* Branch Legend */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    marginTop: 12,
                }}
            >
                {data.branches.map((branch, idx) => {
                    const isActive = selectedNode?.branchIdx === idx;
                    return (
                        <div
                            key={branch.id}
                            className={`branch-legend-item ${isActive ? 'active' : ''}`}
                            style={
                                {
                                    '--branch-color': branch.color,
                                    '--branch-color-30': `${branch.color}50`,
                                } as React.CSSProperties
                            }
                            onClick={() => setSelectedNode(isActive ? null : { branchIdx: idx, tierIdx: branch.currentTier })}
                        >
                            <span>{branch.icon}</span>
                            <span style={{ fontWeight: 600, color: isActive ? branch.color : '#e2e8f0' }}>
                                {locale === 'en' ? branch.id.charAt(0).toUpperCase() + branch.id.slice(1) :
                                    branch.id === 'research' ? 'Nghiên cứu' :
                                        branch.id === 'programming' ? 'Lập trình' :
                                            branch.id === 'startup' ? 'Khởi nghiệp' :
                                                branch.id === 'creative' ? 'Sáng tạo' : 'Thuyết trình'
                                }
                            </span>
                            <span style={{
                                fontSize: 11,
                                color: branch.colorLight,
                                fontWeight: 500,
                                background: `${branch.color}20`,
                                padding: '2px 6px',
                                borderRadius: 6,
                            }}>
                                {branch.xp} XP
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Detail Card (when node selected) */}
            {selectedInfo && (
                <div className="skill-tree-detail-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 24,
                                background: `${selectedInfo.branch.color}20`,
                                border: `1px solid ${selectedInfo.branch.color}40`,
                            }}
                        >
                            {selectedInfo.branch.icon}
                        </div>
                        <div>
                            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>
                                {locale === 'en' ? selectedInfo.tier.titleEn : selectedInfo.tier.title}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>
                                {locale === 'en' ? selectedInfo.tier.descriptionEn : selectedInfo.tier.description}
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <div style={{
                                color: selectedInfo.branch.colorLight,
                                fontWeight: 700,
                                fontSize: 18,
                            }}>
                                {selectedInfo.branch.xp} / {selectedInfo.tier.xpRequired || '∞'} XP
                            </div>
                            <div style={{
                                fontSize: 12,
                                color: selectedInfo.tier.status === 'unlocked' ? '#10b981' :
                                    selectedInfo.tier.status === 'in-progress' ? '#f59e0b' : '#64748b',
                                fontWeight: 600,
                            }}>
                                {selectedInfo.tier.status === 'unlocked' ? '✓ Đã mở khóa' :
                                    selectedInfo.tier.status === 'in-progress' ? '⚡ Đang tiến hành' : '🔒 Chưa mở khóa'}
                            </div>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    {selectedInfo.tier.xpRequired > 0 && (
                        <div
                            className="xp-progress-bar"
                            style={
                                {
                                    '--branch-color': selectedInfo.branch.color,
                                    '--branch-color-light': selectedInfo.branch.colorLight,
                                } as React.CSSProperties
                            }
                        >
                            <div
                                className="xp-progress-fill"
                                style={{
                                    width: `${Math.min(100, (selectedInfo.branch.xp / selectedInfo.tier.xpRequired) * 100)}%`,
                                }}
                            />
                        </div>
                    )}

                    {/* Recent activities */}
                    {selectedInfo.branch.activities.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {locale === 'en' ? 'Recent Activities' : 'Hoạt động gần đây'}
                            </div>
                            {selectedInfo.branch.activities.map((activity, i) => (
                                <div key={i} className="activity-item">
                                    <span style={{ fontSize: 16 }}>
                                        {activity.type === 'contest' ? '🏆' : '📚'}
                                    </span>
                                    <span style={{ flex: 1, color: '#cbd5e1', fontSize: 13 }}>
                                        {activity.title}
                                    </span>
                                    <span style={{
                                        color: selectedInfo.branch.colorLight,
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}>
                                        +{activity.xp} XP
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
