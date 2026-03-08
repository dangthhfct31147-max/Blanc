import React, { useMemo } from 'react';
import type { ComputedBranch } from './types';
import type { ConnectorSegment, PositionedBranchZone, PositionedNodeSlot, SkillTreeDesktopLayout } from './layout';

interface ConnectorLayerProps {
    artboard: SkillTreeDesktopLayout['artboard'];
    branches: ComputedBranch[];
    branchZones: PositionedBranchZone[];
    nodeSlots: PositionedNodeSlot[];
    connectors: ConnectorSegment[];
    focusedBranchId: ComputedBranch['def']['id'] | null;
}

function deterministicStars(width: number, height: number) {
    const stars: Array<{ x: number; y: number; radius: number; delay: number; duration: number }> = [];
    const seed = 73;

    for (let index = 0; index < 88; index += 1) {
        const a = Math.sin(seed + index * 91.17) * 43758.5453;
        const b = Math.sin(seed + index * 171.31) * 24634.6345;
        const c = Math.sin(seed + index * 277.73) * 19234.2132;
        stars.push({
            x: (a - Math.floor(a)) * width,
            y: (b - Math.floor(b)) * height,
            radius: 0.5 + (c - Math.floor(c)) * 1.15,
            delay: index * 0.11,
            duration: 3.5 + (index % 6),
        });
    }

    return stars;
}

export default function ConnectorLayer({
    artboard,
    branches,
    branchZones,
    nodeSlots,
    connectors,
    focusedBranchId,
}: ConnectorLayerProps) {
    const stars = useMemo(() => deterministicStars(artboard.width, artboard.height), [artboard.height, artboard.width]);

    return (
        <svg
            viewBox={`0 0 ${artboard.width} ${artboard.height}`}
            width={artboard.width}
            height={artboard.height}
            className="block h-auto w-full pointer-events-none"
        >
            <defs>
                <radialGradient id="skilltree-shell" cx="50%" cy="50%" r="58%">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </radialGradient>
                {branches.map((branch) => (
                    <React.Fragment key={branch.def.id}>
                        <linearGradient id={`slot-line-${branch.def.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={branch.def.accentLight} stopOpacity="0.8" />
                            <stop offset="100%" stopColor={branch.def.accentColor} stopOpacity="0.16" />
                        </linearGradient>
                        <filter id={`slot-glow-${branch.def.id}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </React.Fragment>
                ))}
            </defs>

            <rect x="0" y="0" width={artboard.width} height={artboard.height} fill="url(#skilltree-shell)" />

            <circle
                cx={artboard.centerSlot.x}
                cy={artboard.centerSlot.y}
                r={artboard.guideRings[artboard.guideRings.length - 1] + 48}
                fill="url(#skilltree-shell)"
            />

            {stars.map((star, index) => (
                <circle key={`star-${index}`} cx={star.x} cy={star.y} r={star.radius} fill="#dbeafe" opacity="0.45">
                    <animate
                        attributeName="opacity"
                        values="0.1;0.6;0.2;0.45;0.1"
                        dur={`${star.duration}s`}
                        begin={`${star.delay}s`}
                        repeatCount="indefinite"
                    />
                </circle>
            ))}

            {artboard.guideRings.map((ring, index) => (
                <circle
                    key={`guide-${index}`}
                    cx={artboard.centerSlot.x}
                    cy={artboard.centerSlot.y}
                    r={ring}
                    fill="none"
                    stroke="rgba(148,163,184,0.16)"
                    strokeWidth="0.9"
                    strokeDasharray="8 14"
                >
                    <animate attributeName="stroke-dashoffset" from="0" to="44" dur="24s" repeatCount="indefinite" />
                </circle>
            ))}

            {branchZones.map((zone) => {
                const branch = branches.find((item) => item.def.id === zone.branchId);
                if (!branch) return null;
                const dimmed = focusedBranchId !== null && focusedBranchId !== zone.branchId;

                return (
                    <g key={`zone-${zone.branchId}`} opacity={dimmed ? 0.12 : 1}>
                        <rect
                            x={zone.bounds.x}
                            y={zone.bounds.y}
                            width={zone.bounds.width}
                            height={zone.bounds.height}
                            rx="28"
                            fill={branch.def.accentColor}
                            fillOpacity="0.035"
                            stroke={branch.def.accentColor}
                            strokeOpacity="0.18"
                            strokeDasharray="7 10"
                        />
                        <polyline
                            points={zone.axis.map((point) => `${point.x},${point.y}`).join(' ')}
                            fill="none"
                            stroke={branch.def.accentColor}
                            strokeOpacity="0.18"
                            strokeWidth="1.2"
                        />
                    </g>
                );
            })}

            {branches.map((branch) => {
                const dimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                const ambientNode = nodeSlots.filter((slot) => slot.branchId === branch.def.id)[2];
                if (!ambientNode) return null;

                return (
                    <circle
                        key={`ambient-${branch.def.id}`}
                        cx={ambientNode.nodeSlot.x}
                        cy={ambientNode.nodeSlot.y}
                        r="86"
                        fill={branch.def.accentColor}
                        fillOpacity={dimmed ? 0.02 : 0.05}
                    >
                        <animate attributeName="r" values="80;92;80" dur="6.5s" repeatCount="indefinite" />
                    </circle>
                );
            })}

            {connectors.map((segment, index) => {
                const branch = branches.find((item) => item.def.id === segment.branchId);
                if (!branch) return null;
                const dimmed = focusedBranchId !== null && focusedBranchId !== branch.def.id;
                const stroke = segment.state === 'locked' ? 'rgba(71,85,105,0.45)' : branch.def.accentColor;
                const strokeWidth = segment.state === 'locked' ? 1 : 1.7;
                const opacity = dimmed ? 0.08 : segment.state === 'locked' ? 0.34 : 0.78;
                const path = `M${segment.from.x},${segment.from.y} L${segment.to.x},${segment.to.y}`;

                return (
                    <g key={segment.id} opacity={opacity}>
                        <line
                            x1={segment.from.x}
                            y1={segment.from.y}
                            x2={segment.to.x}
                            y2={segment.to.y}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            strokeDasharray={segment.state === 'locked' ? '4 8' : undefined}
                        />
                        {segment.state !== 'locked' && (
                            <>
                                <line
                                    x1={segment.from.x}
                                    y1={segment.from.y}
                                    x2={segment.to.x}
                                    y2={segment.to.y}
                                    stroke={`url(#slot-line-${branch.def.id})`}
                                    strokeWidth="4.5"
                                    opacity="0.12"
                                    filter={`url(#slot-glow-${branch.def.id})`}
                                />
                                <circle r="2.5" fill={branch.def.accentLight}>
                                    <animateMotion dur="3s" begin={`${0.18 * index}s`} repeatCount="indefinite" path={path} />
                                    <animate attributeName="opacity" values="0;0.9;0.9;0" dur="3s" begin={`${0.18 * index}s`} repeatCount="indefinite" />
                                </circle>
                            </>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}