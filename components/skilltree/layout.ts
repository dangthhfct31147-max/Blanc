import type { BranchId, ComputedBranch, Locale } from './types';

export type DesktopLayoutMode = 'wide' | 'compact';
export type LayoutTextAlign = 'left' | 'center' | 'right';

interface SafePadding {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface NodeLayoutSpec {
    x: number;
    y: number;
    labelOffsetX: number;
    labelOffsetY: number;
    labelAlign: LayoutTextAlign;
    labelMaxWidth: number;
    subtitleOffsetX?: number;
    subtitleOffsetY?: number;
    subtitleMaxWidth?: number;
    mobileX?: number;
    mobileY?: number;
}

interface BranchTitleLayoutSpec {
    x: number;
    y: number;
    labelAlign: LayoutTextAlign;
    maxWidth: number;
}

interface BranchLayoutSpec {
    title: BranchTitleLayoutSpec;
    nodes: NodeLayoutSpec[];
}

interface DesktopLayoutSpec {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    safePadding: SafePadding;
    guideRings: number[];
    collisionGap: number;
    branches: Record<BranchId, BranchLayoutSpec>;
}

interface CollisionInput {
    id: string;
    kind: 'branch' | 'node';
    anchorX: number;
    anchorY: number;
    align: LayoutTextAlign;
    maxWidth: number;
    title: string;
    secondaryText?: string;
    priority: number;
    nudgeX: number;
    nudgeY: number;
}

interface CollisionResult {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PositionedNodeLayout {
    nodeId: string;
    branchId: BranchId;
    x: number;
    y: number;
    left: number;
    top: number;
    align: LayoutTextAlign;
    maxWidth: number;
    title: string;
    subtitle?: string;
    subtitleLeft?: number;
    subtitleTop?: number;
    subtitleMaxWidth?: number;
    tier: number;
    isOuter: boolean;
}

export interface PositionedBranchLabel {
    branchId: BranchId;
    left: number;
    top: number;
    align: LayoutTextAlign;
    maxWidth: number;
    title: string;
    meta: string;
}

export interface DesktopConstellationLayout {
    artboard: Pick<DesktopLayoutSpec, 'width' | 'height' | 'centerX' | 'centerY' | 'guideRings' | 'safePadding' | 'collisionGap'>;
    nodePositions: Record<string, { x: number; y: number }>;
    nodeLabels: PositionedNodeLayout[];
    branchLabels: PositionedBranchLabel[];
}

const BASE_LAYOUT: DesktopLayoutSpec = {
    width: 1180,
    height: 1140,
    centerX: 590,
    centerY: 620,
    safePadding: { top: 162, right: 122, bottom: 118, left: 122 },
    guideRings: [148, 238, 330, 420, 510],
    collisionGap: 14,
    branches: {
        research: {
            title: { x: 0, y: -584, labelAlign: 'center', maxWidth: 156 },
            nodes: [
                { x: 0, y: -168, labelOffsetX: 58, labelOffsetY: 2, labelAlign: 'left', labelMaxWidth: 112 },
                { x: 8, y: -260, labelOffsetX: 62, labelOffsetY: 0, labelAlign: 'left', labelMaxWidth: 116 },
                { x: -8, y: -352, labelOffsetX: 66, labelOffsetY: -4, labelAlign: 'left', labelMaxWidth: 118 },
                { x: 10, y: -444, labelOffsetX: 70, labelOffsetY: -2, labelAlign: 'left', labelMaxWidth: 120 },
                { x: 0, y: -536, labelOffsetX: 74, labelOffsetY: 2, labelAlign: 'left', labelMaxWidth: 122 },
            ],
        },
        coding: {
            title: { x: 420, y: -150, labelAlign: 'left', maxWidth: 136 },
            nodes: [
                { x: 168, y: -12, labelOffsetX: 0, labelOffsetY: 54, labelAlign: 'center', labelMaxWidth: 86 },
                { x: 266, y: -38, labelOffsetX: 0, labelOffsetY: 52, labelAlign: 'center', labelMaxWidth: 88 },
                { x: 358, y: -66, labelOffsetX: 0, labelOffsetY: 50, labelAlign: 'center', labelMaxWidth: 90 },
                { x: 446, y: -92, labelOffsetX: 0, labelOffsetY: 46, labelAlign: 'center', labelMaxWidth: 92 },
                { x: 522, y: -64, labelOffsetX: 0, labelOffsetY: 40, labelAlign: 'center', labelMaxWidth: 94 },
            ],
        },
        entrepreneurship: {
            title: { x: 364, y: 474, labelAlign: 'left', maxWidth: 146 },
            nodes: [
                { x: 126, y: 118, labelOffsetX: 34, labelOffsetY: 38, labelAlign: 'left', labelMaxWidth: 92 },
                { x: 208, y: 202, labelOffsetX: 38, labelOffsetY: 44, labelAlign: 'left', labelMaxWidth: 96 },
                { x: 292, y: 286, labelOffsetX: 44, labelOffsetY: 48, labelAlign: 'left', labelMaxWidth: 100 },
                { x: 372, y: 352, labelOffsetX: 48, labelOffsetY: 50, labelAlign: 'left', labelMaxWidth: 104 },
                { x: 448, y: 418, labelOffsetX: 54, labelOffsetY: 54, labelAlign: 'left', labelMaxWidth: 108 },
            ],
        },
        creativity: {
            title: { x: -364, y: 474, labelAlign: 'right', maxWidth: 146 },
            nodes: [
                { x: -126, y: 118, labelOffsetX: -34, labelOffsetY: 38, labelAlign: 'right', labelMaxWidth: 92 },
                { x: -208, y: 202, labelOffsetX: -38, labelOffsetY: 44, labelAlign: 'right', labelMaxWidth: 96 },
                { x: -292, y: 286, labelOffsetX: -44, labelOffsetY: 48, labelAlign: 'right', labelMaxWidth: 100 },
                { x: -372, y: 352, labelOffsetX: -48, labelOffsetY: 50, labelAlign: 'right', labelMaxWidth: 104 },
                { x: -448, y: 418, labelOffsetX: -54, labelOffsetY: 54, labelAlign: 'right', labelMaxWidth: 108 },
            ],
        },
        presentation: {
            title: { x: -420, y: -150, labelAlign: 'right', maxWidth: 136 },
            nodes: [
                { x: -168, y: -12, labelOffsetX: 0, labelOffsetY: 54, labelAlign: 'center', labelMaxWidth: 86 },
                { x: -266, y: -38, labelOffsetX: 0, labelOffsetY: 52, labelAlign: 'center', labelMaxWidth: 88 },
                { x: -358, y: -66, labelOffsetX: 0, labelOffsetY: 50, labelAlign: 'center', labelMaxWidth: 90 },
                { x: -446, y: -92, labelOffsetX: 0, labelOffsetY: 46, labelAlign: 'center', labelMaxWidth: 92 },
                { x: -522, y: -64, labelOffsetX: 0, labelOffsetY: 40, labelAlign: 'center', labelMaxWidth: 94 },
            ],
        },
    },
};

function scaleLayoutSpec(layout: DesktopLayoutSpec, scale: number, overrides: Partial<DesktopLayoutSpec>): DesktopLayoutSpec {
    return {
        ...layout,
        ...overrides,
        centerX: overrides.centerX ?? Math.round(layout.centerX * scale),
        centerY: overrides.centerY ?? Math.round(layout.centerY * scale),
        width: overrides.width ?? Math.round(layout.width * scale),
        height: overrides.height ?? Math.round(layout.height * scale),
        collisionGap: overrides.collisionGap ?? Math.max(10, Math.round(layout.collisionGap * scale)),
        guideRings: overrides.guideRings ?? layout.guideRings.map((ring) => Math.round(ring * scale)),
        safePadding: overrides.safePadding ?? {
            top: Math.round(layout.safePadding.top * scale),
            right: Math.round(layout.safePadding.right * scale),
            bottom: Math.round(layout.safePadding.bottom * scale),
            left: Math.round(layout.safePadding.left * scale),
        },
        branches: (Object.keys(layout.branches) as BranchId[]).reduce<Record<BranchId, BranchLayoutSpec>>((acc, branchId) => {
            const branch = layout.branches[branchId];
            acc[branchId] = {
                title: {
                    x: Math.round(branch.title.x * scale),
                    y: Math.round(branch.title.y * scale),
                    labelAlign: branch.title.labelAlign,
                    maxWidth: Math.max(108, Math.round(branch.title.maxWidth * scale)),
                },
                nodes: branch.nodes.map((node) => ({
                    ...node,
                    x: Math.round(node.x * scale),
                    y: Math.round(node.y * scale),
                    labelOffsetX: Math.round(node.labelOffsetX * scale),
                    labelOffsetY: Math.round(node.labelOffsetY * scale),
                    labelMaxWidth: Math.max(76, Math.round(node.labelMaxWidth * scale)),
                    subtitleOffsetX: node.subtitleOffsetX == null ? undefined : Math.round(node.subtitleOffsetX * scale),
                    subtitleOffsetY: node.subtitleOffsetY == null ? undefined : Math.round(node.subtitleOffsetY * scale),
                    subtitleMaxWidth: node.subtitleMaxWidth == null ? undefined : Math.max(92, Math.round(node.subtitleMaxWidth * scale)),
                    mobileX: node.mobileX == null ? undefined : Math.round(node.mobileX * scale),
                    mobileY: node.mobileY == null ? undefined : Math.round(node.mobileY * scale),
                })),
            };
            return acc;
        }, {} as Record<BranchId, BranchLayoutSpec>),
    };
}

const COMPACT_LAYOUT = scaleLayoutSpec(BASE_LAYOUT, 0.9, {
    width: 1080,
    height: 1040,
    centerX: 540,
    centerY: 586,
    safePadding: { top: 170, right: 108, bottom: 104, left: 108 },
    collisionGap: 12,
});

function getDesktopLayoutSpec(mode: DesktopLayoutMode): DesktopLayoutSpec {
    return mode === 'compact' ? COMPACT_LAYOUT : BASE_LAYOUT;
}

function estimateLabelSize(title: string, maxWidth: number, kind: CollisionInput['kind'], secondaryText?: string): { width: number; height: number } {
    const minWidth = kind === 'branch' ? 96 : 72;
    const charWidth = kind === 'branch' ? 7.1 : 6.2;
    const lineHeight = kind === 'branch' ? 13 : 12;
    const titleLineCount = Math.max(1, Math.ceil((title.length * charWidth) / maxWidth));
    const secondaryHeight = secondaryText ? 14 : 0;
    const width = Math.min(
        maxWidth,
        Math.max(
            minWidth,
            Math.max(title.length * charWidth * 0.72, (secondaryText?.length || 0) * 5.4)
        )
    );
    const height = titleLineCount * lineHeight + secondaryHeight;
    return { width, height };
}

function toBox(anchorX: number, anchorY: number, align: LayoutTextAlign, width: number, height: number): CollisionResult {
    const left = align === 'center' ? anchorX - width / 2 : align === 'right' ? anchorX - width : anchorX;
    return {
        left,
        top: anchorY - height / 2,
        width,
        height,
    };
}

function clampBox(box: CollisionResult, bounds: { left: number; top: number; right: number; bottom: number }): CollisionResult {
    let nextLeft = box.left;
    let nextTop = box.top;

    if (nextLeft < bounds.left) nextLeft = bounds.left;
    if (nextLeft + box.width > bounds.right) nextLeft = bounds.right - box.width;
    if (nextTop < bounds.top) nextTop = bounds.top;
    if (nextTop + box.height > bounds.bottom) nextTop = bounds.bottom - box.height;

    return { ...box, left: nextLeft, top: nextTop };
}

function boxesOverlap(a: CollisionResult, b: CollisionResult, gap: number) {
    return !(
        a.left + a.width + gap <= b.left ||
        b.left + b.width + gap <= a.left ||
        a.top + a.height + gap <= b.top ||
        b.top + b.height + gap <= a.top
    );
}

function resolveLabelCollisions(items: CollisionInput[], layout: DesktopLayoutSpec): Record<string, CollisionResult> {
    const bounds = {
        left: layout.safePadding.left,
        top: layout.safePadding.top,
        right: layout.width - layout.safePadding.right,
        bottom: layout.height - layout.safePadding.bottom,
    };
    const placed: Array<CollisionResult & { id: string }> = [];
    const resolved: Record<string, CollisionResult> = {};

    const ordered = [...items].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    for (const item of ordered) {
        const { width, height } = estimateLabelSize(item.title, item.maxWidth, item.kind, item.secondaryText);
        let anchorX = item.anchorX;
        let anchorY = item.anchorY;
        let box = clampBox(toBox(anchorX, anchorY, item.align, width, height), bounds);

        for (let attempt = 0; attempt < 6; attempt += 1) {
            const collision = placed.find((placedBox) => boxesOverlap(box, placedBox, layout.collisionGap));
            if (!collision) break;
            anchorX += item.nudgeX;
            anchorY += item.nudgeY;
            box = clampBox(toBox(anchorX, anchorY, item.align, width, height), bounds);
        }

        resolved[item.id] = box;
        placed.push({ id: item.id, ...box });
    }

    return resolved;
}

function preferredNudge(offsetX: number, offsetY: number): { x: number; y: number } {
    const x = offsetX === 0 ? 0 : offsetX > 0 ? 10 : -10;
    const y = offsetY === 0 ? 12 : offsetY > 0 ? 10 : -10;
    return { x, y };
}

function branchNudge(spec: BranchTitleLayoutSpec): { x: number; y: number } {
    return {
        x: spec.x === 0 ? 0 : spec.x > 0 ? 12 : -12,
        y: spec.y > 0 ? 10 : -10,
    };
}

export function buildDesktopConstellationLayout(
    branches: ComputedBranch[],
    locale: Locale,
    mode: DesktopLayoutMode
): DesktopConstellationLayout {
    const layout = getDesktopLayoutSpec(mode);
    const nodePositions: Record<string, { x: number; y: number }> = {};
    const nodeLabelMeta: Array<PositionedNodeLayout & { collisionId: string }> = [];
    const branchLabelMeta: Array<PositionedBranchLabel & { collisionId: string }> = [];
    const collisionInputs: CollisionInput[] = [];

    for (const branch of branches) {
        const branchSpec = layout.branches[branch.def.id];
        const branchTitle = locale === 'en' ? branch.def.nameEn : branch.def.name;
        const titleAnchorX = layout.centerX + branchSpec.title.x;
        const titleAnchorY = layout.centerY + branchSpec.title.y;
        const titleNudge = branchNudge(branchSpec.title);
        const branchCollisionId = `branch:${branch.def.id}`;

        collisionInputs.push({
            id: branchCollisionId,
            kind: 'branch',
            anchorX: titleAnchorX,
            anchorY: titleAnchorY,
            align: branchSpec.title.labelAlign,
            maxWidth: branchSpec.title.maxWidth,
            title: branchTitle,
            secondaryText: `${branch.totalXP} XP · T${branch.currentTier}/${branch.maxTier}`,
            priority: 4,
            nudgeX: titleNudge.x,
            nudgeY: titleNudge.y,
        });

        branchLabelMeta.push({
            collisionId: branchCollisionId,
            branchId: branch.def.id,
            left: 0,
            top: 0,
            align: branchSpec.title.labelAlign,
            maxWidth: branchSpec.title.maxWidth,
            title: branchTitle,
            meta: `${branch.totalXP} XP · T${branch.currentTier}/${branch.maxTier}`,
        });

        branch.nodes.forEach((node, tierIdx) => {
            const nodeSpec = branchSpec.nodes[tierIdx];
            const x = layout.centerX + nodeSpec.x;
            const y = layout.centerY + nodeSpec.y;
            const title = locale === 'en' ? node.def.titleEn : node.def.title;
            const collisionId = `node:${node.def.id}`;
            const nudge = preferredNudge(nodeSpec.labelOffsetX, nodeSpec.labelOffsetY);
            const isOuter = node.def.tier >= 4;

            nodePositions[node.def.id] = { x, y };

            collisionInputs.push({
                id: collisionId,
                kind: 'node',
                anchorX: x + nodeSpec.labelOffsetX,
                anchorY: y + nodeSpec.labelOffsetY,
                align: nodeSpec.labelAlign,
                maxWidth: nodeSpec.labelMaxWidth,
                title,
                priority: isOuter ? 3 : 2,
                nudgeX: nudge.x,
                nudgeY: nudge.y,
            });

            nodeLabelMeta.push({
                collisionId,
                nodeId: node.def.id,
                branchId: branch.def.id,
                x,
                y,
                left: 0,
                top: 0,
                align: nodeSpec.labelAlign,
                maxWidth: nodeSpec.labelMaxWidth,
                title,
                subtitle: undefined,
                tier: node.def.tier,
                isOuter,
            });
        });
    }

    const resolved = resolveLabelCollisions(collisionInputs, layout);

    return {
        artboard: {
            width: layout.width,
            height: layout.height,
            centerX: layout.centerX,
            centerY: layout.centerY,
            guideRings: layout.guideRings,
            safePadding: layout.safePadding,
            collisionGap: layout.collisionGap,
        },
        nodePositions,
        nodeLabels: nodeLabelMeta.map((nodeLabel) => ({
            ...nodeLabel,
            left: resolved[nodeLabel.collisionId]?.left ?? nodeLabel.left,
            top: resolved[nodeLabel.collisionId]?.top ?? nodeLabel.top,
        })),
        branchLabels: branchLabelMeta.map((branchLabel) => ({
            ...branchLabel,
            left: resolved[branchLabel.collisionId]?.left ?? branchLabel.left,
            top: resolved[branchLabel.collisionId]?.top ?? branchLabel.top,
        })),
    };
}
