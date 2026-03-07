import React from 'react';

export type NodeStatus = 'locked' | 'unlocked' | 'in-progress';

interface SkillTreeNodeProps {
    id: string;
    title: string;
    description: string;
    xpRequired: number;
    status: NodeStatus;
    branchColor: string;
    branchColorLight: string;
    icon: string;
    tierIndex: number;
    isActive: boolean;
    onClick: () => void;
}

export default function SkillTreeNode({
    title,
    description,
    xpRequired,
    status,
    branchColor,
    branchColorLight,
    icon,
    tierIndex,
    isActive,
    onClick,
}: SkillTreeNodeProps) {
    const size = tierIndex === 0 ? 56 : 48;
    const outerSize = size + 8;

    return (
        <g
            onClick={onClick}
            style={{ cursor: 'pointer' }}
            className="skill-tree-node-group"
            role="button"
            tabIndex={0}
        >
            {/* Glow effect for unlocked/in-progress */}
            {status !== 'locked' && (
                <circle
                    r={outerSize / 2 + 6}
                    fill="none"
                    stroke={branchColor}
                    strokeWidth={status === 'in-progress' ? 2 : 1}
                    opacity={status === 'in-progress' ? 0.6 : 0.3}
                    className={status === 'in-progress' ? 'skill-node-pulse' : ''}
                />
            )}

            {/* Outer ring */}
            <circle
                r={outerSize / 2}
                fill={status === 'locked' ? '#1e293b' : 'rgba(15, 23, 42, 0.9)'}
                stroke={status === 'locked' ? '#334155' : branchColor}
                strokeWidth={status === 'in-progress' ? 3 : 2}
                className={isActive ? 'skill-node-selected' : ''}
            />

            {/* Inner circle */}
            <circle
                r={size / 2}
                fill={
                    status === 'locked'
                        ? '#0f172a'
                        : status === 'in-progress'
                            ? `${branchColor}30`
                            : `${branchColor}20`
                }
                stroke={status === 'locked' ? '#1e293b' : `${branchColor}80`}
                strokeWidth={1}
            />

            {/* Lock icon for locked nodes */}
            {status === 'locked' ? (
                <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={18}
                    fill="#475569"
                    style={{ pointerEvents: 'none' }}
                >
                    🔒
                </text>
            ) : (
                <>
                    {/* Tier icon */}
                    <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={tierIndex === 0 ? 22 : 18}
                        style={{ pointerEvents: 'none' }}
                    >
                        {icon}
                    </text>

                    {/* Level badge */}
                    <g transform={`translate(${size / 2 - 4}, ${-size / 2 + 4})`}>
                        <circle
                            r={9}
                            fill={branchColor}
                            stroke="#0f172a"
                            strokeWidth={2}
                        />
                        <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={10}
                            fill="white"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                        >
                            {tierIndex + 1}
                        </text>
                    </g>
                </>
            )}

            {/* Title label */}
            <text
                y={outerSize / 2 + 14}
                textAnchor="middle"
                fill={status === 'locked' ? '#64748b' : '#e2e8f0'}
                fontSize={11}
                fontWeight={status !== 'locked' ? '600' : '400'}
                style={{ pointerEvents: 'none' }}
            >
                {title}
            </text>

            {/* XP badge */}
            <text
                y={outerSize / 2 + 28}
                textAnchor="middle"
                fill={status === 'locked' ? '#475569' : branchColorLight}
                fontSize={9}
                style={{ pointerEvents: 'none' }}
            >
                {xpRequired > 0 ? `${xpRequired} XP` : 'Start'}
            </text>
        </g>
    );
}
