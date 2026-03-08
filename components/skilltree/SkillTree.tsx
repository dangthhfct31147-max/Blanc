import React, { useMemo } from 'react';
import type { BranchId, ComputedBranch, Locale } from './types';
import CentralHub from './CentralHub';
import BranchTitle from './BranchTitle';
import SkillNode from './SkillNode';
import ConnectorLayer from './ConnectorLayer';
import { buildSkillTreeLayout, type DesktopLayoutMode } from './layout';

interface SkillTreeProps {
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

export default function SkillTree({
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
}: SkillTreeProps) {
    const layout = useMemo(() => buildSkillTreeLayout(branches, locale, layoutMode), [branches, locale, layoutMode]);
    const branchMap = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.def.id, branch])), [branches]);
    const nodeMap = useMemo(
        () => Object.fromEntries(branches.flatMap((branch) => branch.nodes.map((node) => [node.def.id, { branch, node }]))),
        [branches],
    );

    return (
        <div className={`relative mx-auto w-full ${layoutMode === 'wide' ? 'max-w-[1240px]' : 'max-w-[1080px]'}`}>
            <ConnectorLayer
                artboard={layout.artboard}
                branches={branches}
                branchZones={layout.branchZones}
                nodeSlots={layout.nodeSlots}
                connectors={layout.connectors}
                focusedBranchId={focusedBranchId}
            />

            <div className="absolute inset-0">
                <div
                    className="absolute z-20"
                    style={{
                        left: `${layout.artboard.centerSlot.xPercent}%`,
                        top: `${layout.artboard.centerSlot.yPercent}%`,
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

                {layout.branchTitles.map((title, index) => {
                    const branch = branchMap[title.branchId];
                    if (!branch) return null;

                    return (
                        <BranchTitle
                            key={title.branchId}
                            branch={branch}
                            title={title}
                            layoutMode={layoutMode}
                            isFocusDimmed={focusedBranchId !== null && focusedBranchId !== title.branchId}
                            delay={0.2 + index * 0.06}
                        />
                    );
                })}

                {layout.nodeSlots.map((slot, index) => {
                    const entry = nodeMap[slot.nodeId];
                    if (!entry) return null;

                    return (
                        <SkillNode
                            key={slot.nodeId}
                            branch={entry.branch}
                            node={entry.node}
                            slot={slot}
                            locale={locale}
                            layoutMode={layoutMode}
                            isSelected={selectedNodeId === slot.nodeId}
                            isFocusDimmed={focusedBranchId !== null && focusedBranchId !== slot.branchId}
                            delay={0.24 + index * 0.05}
                            onSelect={() => onSelectNode(slot.nodeId, slot.branchId)}
                        />
                    );
                })}
            </div>
        </div>
    );
}