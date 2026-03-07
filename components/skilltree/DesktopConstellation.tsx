// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Desktop Constellation — Radial skill tree view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ComputedBranch, ComputedNode, BranchId, Locale, Recommendation } from './types';
import { DESKTOP_LAYOUT } from './data';
import CentralHub from './CentralHub';
import TreeNode from './TreeNode';

interface DesktopConstellationProps {
    branches: ComputedBranch[];
    globalXP: number;
    globalLevel: number;
    nextLevelProgress: number;
    userName: string;
    userAvatar: string | null;
    locale: Locale;
    selectedNodeId: string | null;
    focusedBranchId: BranchId | null;
    recommendations: Recommendation[];
    onSelectNode: (nodeId: string, branchId: BranchId) => void;
}

interface NodePos {
    x: number;
    y: number;
    nodeId: string;
    branchId: BranchId;
}

function polarToXY(angleDeg: number, distance: number, cx: number, cy: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + distance * Math.cos(rad), y: cy + distance * Math.sin(rad) };
}

export default function DesktopConstellation({
    branches,
    globalXP,
    globalLevel,
    nextLevelProgress,
    userName,
    userAvatar,
    locale,
    selectedNodeId,
    focusedBranchId,
    onSelectNode,
}: DesktopConstellationProps) {
    const { width, height, centerX, centerY, branchAngles, tierDistances } = DESKTOP_LAYOUT;

    // Compute node positions
    const nodePositions = useMemo<NodePos[][]>(() => {
        return branches.map((branch, branchIdx) => {
            const angle = branchAngles[branchIdx];
            return branch.nodes.map((node, tierIdx) => {
                const pos = polarToXY(angle, tierDistances[tierIdx], centerX, centerY);
                return { ...pos, nodeId: node.def.id, branchId: branch.def.id };
            });
        });
    }, [branches, branchAngles, tierDistances, centerX, centerY]);

    return (
        <div className="relative" style={{ width: '100%', maxWidth: width }}>
            {/* SVG Overlay — paths and decorations */}
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
            >
                <defs>
                    <radialGradient id="constellation-bg" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </radialGradient>
                    {branches.map(b => (
                        <linearGradient key={`grad-${b.def.id}`} id={`path-grad-${b.def.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={b.def.accentColor} stopOpacity="0.6" />
                            <stop offset="100%" stopColor={b.def.accentColor} stopOpacity="0.15" />
                        </linearGradient>
                    ))}
                </defs>

                {/* Ambient background */}
                <circle cx={centerX} cy={centerY} r={400} fill="url(#constellation-bg)" />

                {/* Concentric guide rings */}
                {tierDistances.map((r, i) => (
                    <circle
                        key={`ring-${i}`}
                        cx={centerX}
                        cy={centerY}
                        r={r}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth={0.5}
                        opacity={0.35}
                        strokeDasharray="4 8"
                    />
                ))}

                {/* Branch connection paths */}
                {branches.map((branch, branchIdx) => {
                    const positions = nodePositions[branchIdx];
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                    const dimOpacity = isFocusDimmed ? 0.06 : 1;

                    return (
                        <g key={`paths-${branch.def.id}`} opacity={dimOpacity} style={{ transition: 'opacity 0.4s ease' }}>
                            {/* Center → first node */}
                            <line
                                x1={centerX}
                                y1={centerY}
                                x2={positions[0].x}
                                y2={positions[0].y}
                                stroke={branch.nodes[0].state !== 'locked' ? branch.def.accentColor : '#1e293b'}
                                strokeWidth={branch.nodes[0].state !== 'locked' ? 2 : 1}
                                opacity={branch.nodes[0].state !== 'locked' ? 0.5 : 0.2}
                            />
                            {/* Between tiers */}
                            {positions.slice(0, -1).map((pos, i) => {
                                const nextPos = positions[i + 1];
                                const nextNode = branch.nodes[i + 1];
                                const isPathActive = nextNode && nextNode.state !== 'locked' && nextNode.state !== 'milestone-locked';
                                const isPrevCompleted = branch.nodes[i].state === 'completed' || branch.nodes[i].state === 'milestone-completed';

                                return (
                                    <g key={`path-${branch.def.id}-${i}`}>
                                        {/* Main path */}
                                        <line
                                            x1={pos.x}
                                            y1={pos.y}
                                            x2={nextPos.x}
                                            y2={nextPos.y}
                                            stroke={isPathActive ? branch.def.accentColor : '#1e293b'}
                                            strokeWidth={isPathActive ? 2 : 1}
                                            opacity={isPathActive ? 0.5 : 0.15}
                                        />
                                        {/* Animated particles on active paths */}
                                        {isPrevCompleted && isPathActive && (
                                            <circle r={2} fill={branch.def.accentColor} opacity={0.7}>
                                                <animateMotion
                                                    dur="3s"
                                                    repeatCount="indefinite"
                                                    path={`M${pos.x},${pos.y} L${nextPos.x},${nextPos.y}`}
                                                />
                                            </circle>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            {/* HTML nodes positioned absolutely */}
            <div className="relative" style={{ width: '100%', paddingTop: `${(height / width) * 100}%` }}>
                {/* Central Hub */}
                <div
                    className="absolute z-10"
                    style={{
                        left: `${(centerX / width) * 100}%`,
                        top: `${(centerY / height) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <CentralHub
                        level={globalLevel}
                        globalXP={globalXP}
                        nextLevelProgress={nextLevelProgress}
                        userName={userName}
                        userAvatar={userAvatar}
                        locale={locale}
                    />
                </div>

                {/* Branch Nodes */}
                {branches.map((branch, branchIdx) => {
                    const positions = nodePositions[branchIdx];
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;

                    return positions.map((pos, tierIdx) => {
                        const cnode = branch.nodes[tierIdx];
                        if (!cnode) return null;

                        return (
                            <motion.div
                                key={cnode.def.id}
                                className="absolute z-10"
                                style={{
                                    left: `${(pos.x / width) * 100}%`,
                                    top: `${(pos.y / height) * 100}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: 0.4,
                                    delay: 0.15 + branchIdx * 0.05 + tierIdx * 0.08,
                                    type: 'spring',
                                    damping: 20,
                                }}
                            >
                                <TreeNode
                                    node={cnode}
                                    color={branch.def.accentColor}
                                    colorLight={branch.def.accentLight}
                                    isSelected={selectedNodeId === cnode.def.id}
                                    isFocusDimmed={isFocusDimmed}
                                    locale={locale}
                                    onClick={() => onSelectNode(cnode.def.id, branch.def.id)}
                                    size="md"
                                />
                            </motion.div>
                        );
                    });
                })}

                {/* Branch labels at the outer edge */}
                {branches.map((branch, branchIdx) => {
                    const angle = branchAngles[branchIdx];
                    const labelDist = tierDistances[tierDistances.length - 1] + 55;
                    const pos = polarToXY(angle, labelDist, centerX, centerY);
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;

                    return (
                        <motion.div
                            key={`label-${branch.def.id}`}
                            className="absolute z-5 text-center pointer-events-none"
                            style={{
                                left: `${(pos.x / width) * 100}%`,
                                top: `${(pos.y / height) * 100}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                            animate={{ opacity: isFocusDimmed ? 0.15 : 0.6 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: branch.def.accentLight }}>
                                {locale === 'en' ? branch.def.nameEn : branch.def.name}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                {branch.totalXP} XP · T{branch.currentTier}/{branch.maxTier}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
