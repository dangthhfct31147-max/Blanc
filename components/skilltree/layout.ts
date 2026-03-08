import type { BranchId, ComputedBranch, Locale } from './types';

export type DesktopLayoutMode = 'wide' | 'compact';
export type LayoutTextAlign = 'left' | 'center' | 'right';
export type BranchZoneId = 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right';

const LEVEL_SLOT_IDS = ['level1Slot', 'level2Slot', 'level3Slot', 'level4Slot', 'level5Slot'] as const;

type LevelSlotId = typeof LEVEL_SLOT_IDS[number];
type LayoutSlotId = 'centerSlot' | 'branchTitleSlot' | LevelSlotId;

interface PercentagePointSlot {
    slotId: LayoutSlotId;
    x: number;
    y: number;
}

interface PercentageBoxSlot extends PercentagePointSlot {
    width: number;
    align: LayoutTextAlign;
}

interface PercentageRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface BranchFrameConfig {
    branchId: BranchId;
    zoneId: BranchZoneId;
    bounds: PercentageRect;
    titleSlot: PercentageBoxSlot;
    nodeSlots: PercentagePointSlot[];
    labelSlots: PercentageBoxSlot[];
}

interface FrameLayoutSpec {
    width: number;
    height: number;
    centerSlot: PercentagePointSlot;
    guideRingRatios: number[];
    branches: Record<BranchId, BranchFrameConfig>;
}

interface PositionedPointSlot {
    slotId: LayoutSlotId;
    x: number;
    y: number;
    xPercent: number;
    yPercent: number;
}

interface PositionedBoxSlot extends PositionedPointSlot {
    width: number;
    widthPercent: number;
    align: LayoutTextAlign;
    transform: string;
}

export interface PositionedRect {
    x: number;
    y: number;
    width: number;
    height: number;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
}

export interface PositionedBranchZone {
    branchId: BranchId;
    zoneId: BranchZoneId;
    bounds: PositionedRect;
    axis: PositionedPointSlot[];
}

export interface PositionedBranchTitle {
    branchId: BranchId;
    title: string;
    meta: string;
    slot: PositionedBoxSlot;
    zoneId: BranchZoneId;
}

export interface PositionedNodeSlot {
    nodeId: string;
    branchId: BranchId;
    tier: number;
    title: string;
    subtitle?: string;
    nodeSlot: PositionedPointSlot;
    labelSlot: PositionedBoxSlot;
    isOuter: boolean;
}

export interface ConnectorSegment {
    id: string;
    branchId: BranchId;
    from: PositionedPointSlot;
    to: PositionedPointSlot;
    tier: number;
    type: 'hub' | 'branch';
    state: 'locked' | 'active' | 'completed';
}

export interface SkillTreeDesktopLayout {
    artboard: {
        width: number;
        height: number;
        centerSlot: PositionedPointSlot;
        guideRings: number[];
    };
    branchZones: PositionedBranchZone[];
    branchTitles: PositionedBranchTitle[];
    nodeSlots: PositionedNodeSlot[];
    connectors: ConnectorSegment[];
}

const FRAME_LAYOUTS: Record<DesktopLayoutMode, FrameLayoutSpec> = {
    wide: {
        width: 1240,
        height: 1040,
        centerSlot: { slotId: 'centerSlot', x: 50, y: 53 },
        guideRingRatios: [0.14, 0.22, 0.3, 0.38, 0.46],
        branches: {
            research: {
                branchId: 'research',
                zoneId: 'top',
                bounds: { x: 34, y: 4, width: 32, height: 42 },
                titleSlot: { slotId: 'branchTitleSlot', x: 50, y: 6, width: 18, align: 'center' },
                nodeSlots: LEVEL_SLOT_IDS.map((slotId, index) => ({ slotId, x: 50, y: 43 - index * 8 })),
                labelSlots: LEVEL_SLOT_IDS.map((slotId, index) => ({ slotId, x: 58.5, y: 43 - index * 8, width: 15, align: 'left' })),
            },
            presentation: {
                branchId: 'presentation',
                zoneId: 'left',
                bounds: { x: 4, y: 31, width: 33, height: 27 },
                titleSlot: { slotId: 'branchTitleSlot', x: 13, y: 34, width: 15, align: 'right' },
                nodeSlots: [
                    { slotId: 'level1Slot', x: 39, y: 55 },
                    { slotId: 'level2Slot', x: 31, y: 52 },
                    { slotId: 'level3Slot', x: 23, y: 49 },
                    { slotId: 'level4Slot', x: 15, y: 46 },
                    { slotId: 'level5Slot', x: 8, y: 43 },
                ],
                labelSlots: [
                    { slotId: 'level1Slot', x: 34, y: 55, width: 13, align: 'right' },
                    { slotId: 'level2Slot', x: 26, y: 52, width: 13, align: 'right' },
                    { slotId: 'level3Slot', x: 18, y: 49, width: 13, align: 'right' },
                    { slotId: 'level4Slot', x: 10, y: 46, width: 13, align: 'right' },
                    { slotId: 'level5Slot', x: 4, y: 43, width: 12, align: 'right' },
                ],
            },
            coding: {
                branchId: 'coding',
                zoneId: 'right',
                bounds: { x: 63, y: 31, width: 33, height: 27 },
                titleSlot: { slotId: 'branchTitleSlot', x: 87, y: 34, width: 15, align: 'left' },
                nodeSlots: [
                    { slotId: 'level1Slot', x: 61, y: 55 },
                    { slotId: 'level2Slot', x: 69, y: 52 },
                    { slotId: 'level3Slot', x: 77, y: 49 },
                    { slotId: 'level4Slot', x: 85, y: 46 },
                    { slotId: 'level5Slot', x: 92, y: 43 },
                ],
                labelSlots: [
                    { slotId: 'level1Slot', x: 66, y: 55, width: 13, align: 'left' },
                    { slotId: 'level2Slot', x: 74, y: 52, width: 13, align: 'left' },
                    { slotId: 'level3Slot', x: 82, y: 49, width: 13, align: 'left' },
                    { slotId: 'level4Slot', x: 90, y: 46, width: 13, align: 'left' },
                    { slotId: 'level5Slot', x: 96, y: 43, width: 12, align: 'left' },
                ],
            },
            creativity: {
                branchId: 'creativity',
                zoneId: 'bottom-left',
                bounds: { x: 6, y: 63, width: 34, height: 31 },
                titleSlot: { slotId: 'branchTitleSlot', x: 14, y: 84, width: 16, align: 'right' },
                nodeSlots: [
                    { slotId: 'level1Slot', x: 41, y: 61 },
                    { slotId: 'level2Slot', x: 34, y: 69 },
                    { slotId: 'level3Slot', x: 27, y: 77 },
                    { slotId: 'level4Slot', x: 20, y: 85 },
                    { slotId: 'level5Slot', x: 13, y: 93 },
                ],
                labelSlots: [
                    { slotId: 'level1Slot', x: 35, y: 65, width: 14, align: 'right' },
                    { slotId: 'level2Slot', x: 28, y: 73, width: 14, align: 'right' },
                    { slotId: 'level3Slot', x: 21, y: 81, width: 14, align: 'right' },
                    { slotId: 'level4Slot', x: 14, y: 89, width: 14, align: 'right' },
                    { slotId: 'level5Slot', x: 7, y: 97, width: 13, align: 'right' },
                ],
            },
            entrepreneurship: {
                branchId: 'entrepreneurship',
                zoneId: 'bottom-right',
                bounds: { x: 60, y: 63, width: 34, height: 31 },
                titleSlot: { slotId: 'branchTitleSlot', x: 86, y: 84, width: 16, align: 'left' },
                nodeSlots: [
                    { slotId: 'level1Slot', x: 59, y: 61 },
                    { slotId: 'level2Slot', x: 66, y: 69 },
                    { slotId: 'level3Slot', x: 73, y: 77 },
                    { slotId: 'level4Slot', x: 80, y: 85 },
                    { slotId: 'level5Slot', x: 87, y: 93 },
                ],
                labelSlots: [
                    { slotId: 'level1Slot', x: 65, y: 65, width: 14, align: 'left' },
                    { slotId: 'level2Slot', x: 72, y: 73, width: 14, align: 'left' },
                    { slotId: 'level3Slot', x: 79, y: 81, width: 14, align: 'left' },
                    { slotId: 'level4Slot', x: 86, y: 89, width: 14, align: 'left' },
                    { slotId: 'level5Slot', x: 93, y: 97, width: 13, align: 'left' },
                ],
            },
        },
    },
    compact: {
        width: 1080,
        height: 920,
        centerSlot: { slotId: 'centerSlot', x: 50, y: 53 },
        guideRingRatios: [0.135, 0.215, 0.295, 0.375, 0.445],
        branches: {} as Record<BranchId, BranchFrameConfig>,
    },
};

FRAME_LAYOUTS.compact.branches = FRAME_LAYOUTS.wide.branches;

function alignTransform(align: LayoutTextAlign) {
    if (align === 'center') return 'translate(-50%, -50%)';
    if (align === 'right') return 'translate(-100%, -50%)';
    return 'translate(0, -50%)';
}

function toPoint(spec: FrameLayoutSpec, slot: PercentagePointSlot): PositionedPointSlot {
    return {
        slotId: slot.slotId,
        x: (slot.x / 100) * spec.width,
        y: (slot.y / 100) * spec.height,
        xPercent: slot.x,
        yPercent: slot.y,
    };
}

function toBox(spec: FrameLayoutSpec, slot: PercentageBoxSlot): PositionedBoxSlot {
    return {
        ...toPoint(spec, slot),
        width: (slot.width / 100) * spec.width,
        widthPercent: slot.width,
        align: slot.align,
        transform: alignTransform(slot.align),
    };
}

function toRect(spec: FrameLayoutSpec, rect: PercentageRect): PositionedRect {
    return {
        x: (rect.x / 100) * spec.width,
        y: (rect.y / 100) * spec.height,
        width: (rect.width / 100) * spec.width,
        height: (rect.height / 100) * spec.height,
        xPercent: rect.x,
        yPercent: rect.y,
        widthPercent: rect.width,
        heightPercent: rect.height,
    };
}

function connectorState(sourceState: string, targetState: string): ConnectorSegment['state'] {
    const targetLocked = targetState === 'locked' || targetState === 'milestone-locked';
    if (targetLocked) return 'locked';

    const completedTarget = targetState === 'completed' || targetState === 'milestone-completed';
    const completedSource = sourceState === 'completed' || sourceState === 'milestone-completed';
    if (completedTarget && completedSource) return 'completed';

    return 'active';
}

export function getDesktopFrameSpec(mode: DesktopLayoutMode) {
    return FRAME_LAYOUTS[mode];
}

export function mapNodeToSlot(branch: ComputedBranch, tierIndex: number, mode: DesktopLayoutMode) {
    const spec = getDesktopFrameSpec(mode).branches[branch.def.id];
    return spec.nodeSlots[tierIndex] ?? spec.nodeSlots[spec.nodeSlots.length - 1];
}

export function getLabelSlotForNode(branch: ComputedBranch, tierIndex: number, mode: DesktopLayoutMode) {
    const spec = getDesktopFrameSpec(mode).branches[branch.def.id];
    return spec.labelSlots[tierIndex] ?? spec.labelSlots[spec.labelSlots.length - 1];
}

export function buildConnectorSegments(
    branches: ComputedBranch[],
    mode: DesktopLayoutMode,
    centerSlot: PositionedPointSlot,
): ConnectorSegment[] {
    const frame = getDesktopFrameSpec(mode);

    return branches.flatMap((branch) => {
        const branchSpec = frame.branches[branch.def.id];
        const positionedNodes = branch.nodes.map((node, tierIndex) => ({
            node,
            point: toPoint(frame, branchSpec.nodeSlots[tierIndex]),
        }));

        const hubSegment = positionedNodes[0]
            ? [{
                id: `${branch.def.id}-hub`,
                branchId: branch.def.id,
                from: centerSlot,
                to: positionedNodes[0].point,
                tier: 1,
                type: 'hub' as const,
                state: connectorState('completed', positionedNodes[0].node.state),
            }]
            : [];

        const branchSegments = positionedNodes.slice(0, -1).map((entry, index) => ({
            id: `${branch.def.id}-${index + 1}`,
            branchId: branch.def.id,
            from: entry.point,
            to: positionedNodes[index + 1].point,
            tier: index + 2,
            type: 'branch' as const,
            state: connectorState(entry.node.state, positionedNodes[index + 1].node.state),
        }));

        return [...hubSegment, ...branchSegments];
    });
}

export function buildSkillTreeLayout(
    branches: ComputedBranch[],
    locale: Locale,
    mode: DesktopLayoutMode,
): SkillTreeDesktopLayout {
    const frame = getDesktopFrameSpec(mode);
    const centerSlot = toPoint(frame, frame.centerSlot);
    const branchZones = branches.map((branch) => {
        const branchSpec = frame.branches[branch.def.id];
        return {
            branchId: branch.def.id,
            zoneId: branchSpec.zoneId,
            bounds: toRect(frame, branchSpec.bounds),
            axis: branchSpec.nodeSlots.map((slot) => toPoint(frame, slot)),
        };
    });

    const branchTitles = branches.map((branch) => {
        const branchSpec = frame.branches[branch.def.id];
        return {
            branchId: branch.def.id,
            title: locale === 'en' ? branch.def.nameEn : branch.def.name,
            meta: `${branch.totalXP} XP · T${branch.currentTier}/${branch.maxTier}`,
            slot: toBox(frame, branchSpec.titleSlot),
            zoneId: branchSpec.zoneId,
        };
    });

    const nodeSlots = branches.flatMap((branch) => {
        const branchSpec = frame.branches[branch.def.id];
        return branch.nodes.map((node, tierIndex) => ({
            nodeId: node.def.id,
            branchId: branch.def.id,
            tier: node.def.tier,
            title: locale === 'en' ? node.def.titleEn : node.def.title,
            subtitle: locale === 'en' ? node.def.subtitleEn : node.def.subtitle,
            nodeSlot: toPoint(frame, branchSpec.nodeSlots[tierIndex]),
            labelSlot: toBox(frame, branchSpec.labelSlots[tierIndex]),
            isOuter: tierIndex >= 3,
        }));
    });

    return {
        artboard: {
            width: frame.width,
            height: frame.height,
            centerSlot,
            guideRings: frame.guideRingRatios.map((ratio) => Math.round(Math.min(frame.width, frame.height) * ratio)),
        },
        branchZones,
        branchTitles,
        nodeSlots,
        connectors: buildConnectorSegments(branches, mode, centerSlot),
    };
}