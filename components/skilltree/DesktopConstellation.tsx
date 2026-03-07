// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Desktop Constellation — Radial skill tree view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ComputedBranch, BranchId, Locale, Recommendation } from './types';
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
    const {
        width: contentWidth,
        height: contentHeight,
        centerX: contentCenterX,
        centerY: contentCenterY,
        branchAngles,
        tierDistances,
    } = DESKTOP_LAYOUT;
    const canvasPadding = { top: 88, right: 92, bottom: 92, left: 92 };
    const width = contentWidth + canvasPadding.left + canvasPadding.right;
    const height = contentHeight + canvasPadding.top + canvasPadding.bottom;
    const centerX = contentCenterX + canvasPadding.left;
    const centerY = contentCenterY + canvasPadding.top;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

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

    // Generate starfield positions (stable across renders)
    const stars = useMemo(() => {
        const seed = 42;
        const result: { x: number; y: number; r: number; delay: number; dur: number }[] = [];
        for (let i = 0; i < 80; i++) {
            const s = Math.sin(seed + i * 127.1) * 43758.5453;
            const x = (s - Math.floor(s)) * width;
            const s2 = Math.sin(seed + i * 269.5) * 43758.5453;
            const y = (s2 - Math.floor(s2)) * height;
            const s3 = Math.sin(seed + i * 419.2) * 43758.5453;
            const r = 0.4 + (s3 - Math.floor(s3)) * 1.2;
            result.push({ x, y, r, delay: i * 0.12, dur: 3 + (i % 5) * 1.2 });
        }
        return result;
    }, [width, height]);

    return (
        <div className="relative" style={{ width: '100%', maxWidth: width }}>
            {/* SVG — in normal flow, creates the aspect ratio & height */}
            <svg
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
            >
                <defs>
                    <radialGradient id="constellation-bg" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </radialGradient>
                    {/* Branch path gradients */}
                    {branches.map(b => (
                        <React.Fragment key={`defs-${b.def.id}`}>
                            <linearGradient id={`path-grad-${b.def.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={b.def.accentColor} stopOpacity="0.7" />
                                <stop offset="100%" stopColor={b.def.accentColor} stopOpacity="0.2" />
                            </linearGradient>
                            <filter id={`glow-${b.def.id}`} x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <radialGradient id={`nebula-${b.def.id}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor={b.def.accentColor} stopOpacity="0.08" />
                                <stop offset="60%" stopColor={b.def.accentColor} stopOpacity="0.03" />
                                <stop offset="100%" stopColor={b.def.accentColor} stopOpacity="0" />
                            </radialGradient>
                        </React.Fragment>
                    ))}
                    {/* Central glow */}
                    <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
                        <stop offset="50%" stopColor="#6366f1" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>
                    <filter id="star-glow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="1.5" />
                    </filter>
                </defs>

                {/* Ambient background glow */}
                <circle cx={centerX} cy={centerY} r={420} fill="url(#constellation-bg)" />

                {/* Central hub radial glow */}
                <circle cx={centerX} cy={centerY} r={150} fill="url(#hub-glow)">
                    <animate attributeName="r" values="140;160;140" dur="5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="5s" repeatCount="indefinite" />
                </circle>

                {/* Starfield */}
                {stars.map((star, i) => (
                    <circle key={`star-${i}`} cx={star.x} cy={star.y} r={star.r} fill="#cbd5e1">
                        <animate
                            attributeName="opacity"
                            values="0;0.5;0.15;0.4;0"
                            dur={`${star.dur}s`}
                            begin={`${star.delay}s`}
                            repeatCount="indefinite"
                        />
                    </circle>
                ))}

                {/* Concentric guide rings with animation */}
                {tierDistances.map((r, i) => (
                    <circle
                        key={`ring-${i}`}
                        cx={centerX}
                        cy={centerY}
                        r={r}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth={0.6}
                        opacity={mounted ? 0.3 : 0}
                        strokeDasharray="6 12"
                        style={{ transition: `opacity 0.6s ease ${0.2 + i * 0.15}s` }}
                    >
                        <animate attributeName="stroke-dashoffset" from="0" to="36" dur="20s" repeatCount="indefinite" />
                    </circle>
                ))}

                {/* Branch nebula clouds */}
                {branches.map((branch, branchIdx) => {
                    const angle = branchAngles[branchIdx];
                    const nebulaPos = polarToXY(angle, tierDistances[2], centerX, centerY);
                    return (
                        <circle
                            key={`nebula-${branch.def.id}`}
                            cx={nebulaPos.x}
                            cy={nebulaPos.y}
                            r={90}
                            fill={`url(#nebula-${branch.def.id})`}
                            opacity={branch.totalXP > 0 ? 0.8 : 0.2}
                        >
                            <animate attributeName="r" values="85;95;85" dur="6s" begin={`${branchIdx * 0.7}s`} repeatCount="indefinite" />
                        </circle>
                    );
                })}

                {/* Branch connection paths */}
                {branches.map((branch, branchIdx) => {
                    const positions = nodePositions[branchIdx];
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                    const dimOpacity = isFocusDimmed ? 0.06 : 1;

                    return (
                        <g key={`paths-${branch.def.id}`} opacity={dimOpacity} style={{ transition: 'opacity 0.5s ease' }}>
                            {/* Center → first node */}
                            {(() => {
                                const firstActive = branch.nodes[0].state !== 'locked';
                                return (
                                    <>
                                        <line
                                            x1={centerX}
                                            y1={centerY}
                                            x2={positions[0].x}
                                            y2={positions[0].y}
                                            stroke={firstActive ? branch.def.accentColor : '#1e293b'}
                                            strokeWidth={firstActive ? 1.5 : 0.8}
                                            opacity={mounted ? (firstActive ? 0.5 : 0.15) : 0}
                                            style={{ transition: `opacity 0.8s ease ${0.3 + branchIdx * 0.1}s` }}
                                        />
                                        {/* Glow line for active paths */}
                                        {firstActive && (
                                            <line
                                                x1={centerX}
                                                y1={centerY}
                                                x2={positions[0].x}
                                                y2={positions[0].y}
                                                stroke={branch.def.accentColor}
                                                strokeWidth={4}
                                                opacity={0.08}
                                                filter={`url(#glow-${branch.def.id})`}
                                            />
                                        )}
                                        {/* Energy particle from center */}
                                        {firstActive && (
                                            <circle r={2.5} fill={branch.def.accentColor} opacity={0.8}>
                                                <animateMotion
                                                    dur="2.5s"
                                                    repeatCount="indefinite"
                                                    begin={`${branchIdx * 0.5}s`}
                                                    path={`M${centerX},${centerY} L${positions[0].x},${positions[0].y}`}
                                                />
                                                <animate attributeName="opacity" values="0;0.8;0.8;0" dur="2.5s" begin={`${branchIdx * 0.5}s`} repeatCount="indefinite" />
                                                <animate attributeName="r" values="1.5;3;1.5" dur="2.5s" begin={`${branchIdx * 0.5}s`} repeatCount="indefinite" />
                                            </circle>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Between tiers */}
                            {positions.slice(0, -1).map((pos, i) => {
                                const nextPos = positions[i + 1];
                                const nextNode = branch.nodes[i + 1];
                                const isPathActive = nextNode && nextNode.state !== 'locked' && nextNode.state !== 'milestone-locked';
                                const isPrevCompleted = branch.nodes[i].state === 'completed' || branch.nodes[i].state === 'milestone-completed';

                                return (
                                    <g key={`path-${branch.def.id}-${i}`}>
                                        {/* Background dash line */}
                                        <line
                                            x1={pos.x}
                                            y1={pos.y}
                                            x2={nextPos.x}
                                            y2={nextPos.y}
                                            stroke={isPathActive ? branch.def.accentColor : '#1e293b'}
                                            strokeWidth={isPathActive ? 1.5 : 0.8}
                                            opacity={mounted ? (isPathActive ? 0.45 : 0.12) : 0}
                                            strokeDasharray={isPathActive ? 'none' : '3 6'}
                                            style={{ transition: `opacity 0.8s ease ${0.4 + branchIdx * 0.1 + i * 0.12}s` }}
                                        />
                                        {/* Glow overlay for active paths */}
                                        {isPathActive && (
                                            <line
                                                x1={pos.x}
                                                y1={pos.y}
                                                x2={nextPos.x}
                                                y2={nextPos.y}
                                                stroke={branch.def.accentColor}
                                                strokeWidth={5}
                                                opacity={0.06}
                                                filter={`url(#glow-${branch.def.id})`}
                                            />
                                        )}
                                        {/* Animated energy particles on active paths */}
                                        {isPrevCompleted && isPathActive && (
                                            <>
                                                <circle r={2} fill={branch.def.accentColor}>
                                                    <animateMotion
                                                        dur="3s"
                                                        repeatCount="indefinite"
                                                        begin={`${i * 0.8}s`}
                                                        path={`M${pos.x},${pos.y} L${nextPos.x},${nextPos.y}`}
                                                    />
                                                    <animate attributeName="opacity" values="0;0.7;0.7;0" dur="3s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                                                    <animate attributeName="r" values="1;2.5;1" dur="3s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                                                </circle>
                                                {/* Second particle with offset */}
                                                <circle r={1.5} fill={branch.def.accentLight || branch.def.accentColor}>
                                                    <animateMotion
                                                        dur="3s"
                                                        repeatCount="indefinite"
                                                        begin={`${i * 0.8 + 1.5}s`}
                                                        path={`M${pos.x},${pos.y} L${nextPos.x},${nextPos.y}`}
                                                    />
                                                    <animate attributeName="opacity" values="0;0.5;0.5;0" dur="3s" begin={`${i * 0.8 + 1.5}s`} repeatCount="indefinite" />
                                                </circle>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            {/* HTML nodes — absolute overlay matching SVG dimensions exactly */}
            <div className="absolute inset-0">
                {/* Central Hub */}
                <div
                    className="absolute z-20"
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
                                initial={{ opacity: 0, scale: 0, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{
                                    duration: 0.6,
                                    delay: 0.2 + branchIdx * 0.08 + tierIdx * 0.1,
                                    type: 'spring',
                                    damping: 18,
                                    stiffness: 150,
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
                    const angleRad = (angle * Math.PI) / 180;
                    const labelDist = tierDistances[tierDistances.length - 1] + 44;
                    const pos = polarToXY(angle, labelDist, centerX, centerY);
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                    const isTopLabel = Math.sin(angleRad) < -0.75;
                    const isBottomLabel = Math.sin(angleRad) > 0.75;
                    const isRightLabel = Math.cos(angleRad) > 0.45;
                    const isLeftLabel = Math.cos(angleRad) < -0.45;
                    const textAlign = isLeftLabel ? 'left' : isRightLabel ? 'right' : 'center';
                    const translateX = isLeftLabel ? '0%' : isRightLabel ? '-100%' : '-50%';
                    const translateY = isTopLabel ? '0%' : isBottomLabel ? '-100%' : '-50%';

                    return (
                        <motion.div
                            key={`label-${branch.def.id}`}
                            className="absolute z-[5] pointer-events-none"
                            style={{
                                left: `${(pos.x / width) * 100}%`,
                                top: `${(pos.y / height) * 100}%`,
                                transform: `translate(${translateX}, ${translateY})`,
                                textAlign,
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isFocusDimmed ? 0.12 : 0.75, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 + branchIdx * 0.1 }}
                        >
                            <div
                                className="text-[11px] font-bold uppercase tracking-[0.15em]"
                                style={{ color: branch.def.accentLight, textShadow: `0 0 12px ${branch.def.accentColor}40` }}
                            >
                                {locale === 'en' ? branch.def.nameEn : branch.def.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {branch.totalXP} XP · T{branch.currentTier}/{branch.maxTier}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
