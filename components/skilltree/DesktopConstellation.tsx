// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Desktop Constellation — Radial skill tree view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ComputedBranch, BranchId, Locale } from './types';
import CentralHub from './CentralHub';
import TreeNode from './TreeNode';
import {
    buildDesktopConstellationLayout,
    type DesktopLayoutMode,
} from './layout';

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
    onSelectNode: (nodeId: string, branchId: BranchId) => void;
    layoutMode?: DesktopLayoutMode;
}

interface BranchNodePosition {
    x: number;
    y: number;
    nodeId: string;
    branchId: BranchId;
    tier: number;
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
    layoutMode = 'wide',
}: DesktopConstellationProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const desktopLayout = useMemo(
        () => buildDesktopConstellationLayout(branches, locale, layoutMode),
        [branches, locale, layoutMode]
    );

    const { artboard, nodePositions, nodeLabels, branchLabels } = desktopLayout;
    const { width, height, centerX, centerY, guideRings } = artboard;

    const branchNodePositions = useMemo<BranchNodePosition[][]>(
        () => branches.map((branch) => branch.nodes.map((node) => ({
            ...nodePositions[node.def.id],
            nodeId: node.def.id,
            branchId: branch.def.id,
            tier: node.def.tier,
        }))),
        [branches, nodePositions]
    );

    const nodeIndexMap = useMemo(
        () => Object.fromEntries(
            branches.flatMap((branch, branchIdx) =>
                branch.nodes.map((node, tierIdx) => [
                    node.def.id,
                    { branch, branchIdx, node, tierIdx },
                ])
            )
        ),
        [branches]
    );

    const stars = useMemo(() => {
        const seed = 42;
        const result: { x: number; y: number; r: number; delay: number; dur: number }[] = [];
        for (let i = 0; i < 80; i += 1) {
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
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: width }}>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
            >
                <defs>
                    <radialGradient id="constellation-bg" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0a0f1e" stopOpacity="0" />
                    </radialGradient>
                    {branches.map((branch) => (
                        <React.Fragment key={`defs-${branch.def.id}`}>
                            <linearGradient id={`path-grad-${branch.def.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={branch.def.accentColor} stopOpacity="0.8" />
                                <stop offset="100%" stopColor={branch.def.accentColor} stopOpacity="0.15" />
                            </linearGradient>
                            <filter id={`glow-${branch.def.id}`} x="-60%" y="-60%" width="220%" height="220%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <radialGradient id={`nebula-${branch.def.id}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor={branch.def.accentColor} stopOpacity="0.1" />
                                <stop offset="55%" stopColor={branch.def.accentColor} stopOpacity="0.04" />
                                <stop offset="100%" stopColor={branch.def.accentColor} stopOpacity="0" />
                            </radialGradient>
                        </React.Fragment>
                    ))}
                    <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                        <stop offset="45%" stopColor="#6366f1" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>
                    <filter id="hub-filter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <circle
                    cx={centerX}
                    cy={centerY}
                    r={guideRings[guideRings.length - 1] + 96}
                    fill="url(#constellation-bg)"
                />

                <circle cx={centerX} cy={centerY} r={180} fill="url(#hub-glow)" filter="url(#hub-filter)">
                    <animate attributeName="r" values="168;188;168" dur="6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />
                </circle>

                {stars.map((star, i) => (
                    <circle key={`star-${i}`} cx={star.x} cy={star.y} r={star.r} fill="#94a3b8">
                        <animate
                            attributeName="opacity"
                            values="0;0.4;0.1;0.35;0"
                            dur={`${star.dur}s`}
                            begin={`${star.delay}s`}
                            repeatCount="indefinite"
                        />
                    </circle>
                ))}

                {guideRings.map((ring, i) => (
                    <circle
                        key={`ring-${i}`}
                        cx={centerX}
                        cy={centerY}
                        r={ring}
                        fill="none"
                        stroke="rgba(99,102,241,0.12)"
                        strokeWidth={0.5}
                        opacity={mounted ? 0.6 : 0}
                        strokeDasharray="4 14"
                        style={{ transition: `opacity 0.8s ease ${0.15 + i * 0.12}s` }}
                    >
                        <animate attributeName="stroke-dashoffset" from="0" to="36" dur="25s" repeatCount="indefinite" />
                    </circle>
                ))}

                {branches.map((branch, branchIdx) => {
                    const positions = branchNodePositions[branchIdx];
                    const nebulaNode = positions[Math.min(2, positions.length - 1)];
                    return (
                        <circle
                            key={`nebula-${branch.def.id}`}
                            cx={nebulaNode.x}
                            cy={nebulaNode.y}
                            r={92}
                            fill={`url(#nebula-${branch.def.id})`}
                            opacity={branch.totalXP > 0 ? 0.82 : 0.2}
                        >
                            <animate attributeName="r" values="88;98;88" dur="6s" begin={`${branchIdx * 0.7}s`} repeatCount="indefinite" />
                        </circle>
                    );
                })}

                {branches.map((branch, branchIdx) => {
                    const positions = branchNodePositions[branchIdx];
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                    const dimOpacity = isFocusDimmed ? 0.04 : 1;

                    return (
                        <g key={`paths-${branch.def.id}`} opacity={dimOpacity} style={{ transition: 'opacity 0.4s ease' }}>
                            {(() => {
                                const firstNode = branch.nodes[0];
                                const firstPos = positions[0];
                                const firstActive = firstNode.state !== 'locked' && firstNode.state !== 'milestone-locked';

                                return (
                                    <>
                                        <line
                                            x1={centerX}
                                            y1={centerY}
                                            x2={firstPos.x}
                                            y2={firstPos.y}
                                            stroke={firstActive ? branch.def.accentColor : 'rgba(30,41,59,0.6)'}
                                            strokeWidth={firstActive ? 1.5 : 0.8}
                                            opacity={mounted ? (firstActive ? 0.55 : 0.2) : 0}
                                            style={{ transition: `opacity 0.8s ease ${0.3 + branchIdx * 0.1}s` }}
                                        />
                                        {firstActive && (
                                            <>
                                                <line
                                                    x1={centerX}
                                                    y1={centerY}
                                                    x2={firstPos.x}
                                                    y2={firstPos.y}
                                                    stroke={branch.def.accentColor}
                                                    strokeWidth={5}
                                                    opacity={0.07}
                                                    filter={`url(#glow-${branch.def.id})`}
                                                />
                                                <circle r={2.5} fill={branch.def.accentColor} opacity={0.9}>
                                                    <animateMotion
                                                        dur="2.5s"
                                                        repeatCount="indefinite"
                                                        begin={`${branchIdx * 0.5}s`}
                                                        path={`M${centerX},${centerY} L${firstPos.x},${firstPos.y}`}
                                                    />
                                                    <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.5s" begin={`${branchIdx * 0.5}s`} repeatCount="indefinite" />
                                                    <animate attributeName="r" values="1.5;3;1.5" dur="2.5s" begin={`${branchIdx * 0.5}s`} repeatCount="indefinite" />
                                                </circle>
                                            </>
                                        )}
                                    </>
                                );
                            })()}

                            {positions.slice(0, -1).map((pos, i) => {
                                const nextPos = positions[i + 1];
                                const nextNode = branch.nodes[i + 1];
                                const isPathActive = nextNode && nextNode.state !== 'locked' && nextNode.state !== 'milestone-locked';
                                const isPrevCompleted = branch.nodes[i].state === 'completed' || branch.nodes[i].state === 'milestone-completed';

                                return (
                                    <g key={`path-${branch.def.id}-${i}`}>
                                        <line
                                            x1={pos.x}
                                            y1={pos.y}
                                            x2={nextPos.x}
                                            y2={nextPos.y}
                                            stroke={isPathActive ? branch.def.accentColor : 'rgba(30,41,59,0.5)'}
                                            strokeWidth={isPathActive ? 1.5 : 0.8}
                                            opacity={mounted ? (isPathActive ? 0.5 : 0.15) : 0}
                                            strokeDasharray={isPathActive ? 'none' : '3 8'}
                                            style={{ transition: `opacity 0.8s ease ${0.42 + branchIdx * 0.1 + i * 0.12}s` }}
                                        />
                                        {isPathActive && (
                                            <line
                                                x1={pos.x}
                                                y1={pos.y}
                                                x2={nextPos.x}
                                                y2={nextPos.y}
                                                stroke={branch.def.accentColor}
                                                strokeWidth={6}
                                                opacity={0.06}
                                                filter={`url(#glow-${branch.def.id})`}
                                            />
                                        )}
                                        {isPrevCompleted && isPathActive && (
                                            <>
                                                <circle r={2} fill={branch.def.accentColor}>
                                                    <animateMotion
                                                        dur="3s"
                                                        repeatCount="indefinite"
                                                        begin={`${i * 0.8}s`}
                                                        path={`M${pos.x},${pos.y} L${nextPos.x},${nextPos.y}`}
                                                    />
                                                    <animate attributeName="opacity" values="0;0.8;0.8;0" dur="3s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                                                    <animate attributeName="r" values="1;2.5;1" dur="3s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                                                </circle>
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

            <div className="absolute inset-0">
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

                {branches.map((branch, branchIdx) => {
                    const positions = branchNodePositions[branchIdx];
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
                                    size={layoutMode === 'compact' ? 'sm' : 'md'}
                                    showLabel={false}
                                    showProgressLabel={false}
                                />
                            </motion.div>
                        );
                    });
                })}

                {nodeLabels.map((label) => {
                    const nodeEntry = nodeIndexMap[label.nodeId];
                    if (!nodeEntry) return null;

                    const { node, branchIdx, tierIdx, branch } = nodeEntry;
                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                    const isCompleted = node.state === 'completed' || node.state === 'milestone-completed';
                    const isActive = node.state === 'active';
                    const isLocked = node.state === 'locked' || node.state === 'milestone-locked';

                    return (
                        <motion.div
                            key={`label-${label.nodeId}`}
                            className="absolute z-30 pointer-events-none"
                            style={{
                                left: `${(label.left / width) * 100}%`,
                                top: `${(label.top / height) * 100}%`,
                                width: `${(label.maxWidth / width) * 100}%`,
                                minWidth: label.isOuter ? 76 : 64,
                                textAlign: label.align,
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isFocusDimmed ? 0.14 : 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.28 + branchIdx * 0.08 + tierIdx * 0.1 }}
                        >
                            <div
                                className={layoutMode === 'compact' ? 'text-[10px] font-medium leading-[1.08]' : 'text-[11px] font-medium leading-[1.08]'}
                                style={{
                                    color: isLocked ? '#64748b' : isCompleted ? '#e2e8f0' : isActive ? '#f8fafc' : '#cbd5e1',
                                    textShadow: isCompleted || isActive
                                        ? `0 0 10px ${branch.def.accentColor}24, 0 0 16px rgba(2,6,23,0.92)`
                                        : '0 0 14px rgba(2,6,23,0.92)',
                                }}
                            >
                                {label.title}
                            </div>
                            {label.subtitle && (
                                <div
                                    className="mt-1 text-[9px] leading-[1.15]"
                                    style={{
                                        color: `${branch.def.accentLight}cc`,
                                        textShadow: '0 0 12px rgba(2,6,23,0.9)',
                                    }}
                                >
                                    {label.subtitle}
                                </div>
                            )}
                        </motion.div>
                    );
                })}

                {branchLabels.map((label, index) => {
                    const branch = branches.find((item) => item.def.id === label.branchId);
                    if (!branch) return null;

                    const isFocusDimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;

                    return (
                        <motion.div
                            key={`branch-label-${label.branchId}`}
                            className="absolute z-40 pointer-events-none"
                            style={{
                                left: `${(label.left / width) * 100}%`,
                                top: `${(label.top / height) * 100}%`,
                                width: `${(label.maxWidth / width) * 100}%`,
                                minWidth: 86,
                                textAlign: label.align,
                            }}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: isFocusDimmed ? 0.12 : 0.82, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.45 + index * 0.08 }}
                        >
                            <div
                                className={layoutMode === 'compact' ? 'text-[10px] font-bold uppercase tracking-[0.14em] leading-[1.1]' : 'text-[11px] font-bold uppercase tracking-[0.15em] leading-[1.1]'}
                                style={{
                                    color: branch.def.accentLight,
                                    textShadow: `0 0 12px ${branch.def.accentColor}40, 0 0 18px rgba(2,6,23,0.95)`,
                                }}
                            >
                                {label.title}
                            </div>
                            <div
                                className="mt-1 text-[10px] font-medium leading-none"
                                style={{
                                    color: 'rgba(203,213,225,0.84)',
                                    textShadow: '0 0 14px rgba(2,6,23,0.95)',
                                }}
                            >
                                {label.meta}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
