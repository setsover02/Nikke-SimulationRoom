import React, { useState } from 'react';
import { SimulationOutput, SlotState } from '../../types/simulator';
import { characterOptions } from '../../constants/characters';
import { Avatar } from '../../components/Avatar/Avatar';
import { Icon } from '../../components/Icon/Icon';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { Button } from '../../components/Button/Button';
import { ButtonIcon } from '../../components/Button/ButtonIcon';
import { ELEMENT_ICONS, BURST_ICONS } from '../../constants/icons';
import styles from './SquadAvatarList.module.scss';

// _theme.scss의 Accent-Lime, Cyan, Blue, Purple, Orange 토큰
const ACCENT_COLORS = [
    'var(--Accent-Lime)',
    'var(--Accent-Cyan)',
    'var(--Accent-Blue)',
    'var(--Accent-Purple)',
    'var(--Accent-Orange)',
];

function formatTotalDamageEok(totalDmg: number): string {
    const eok = totalDmg / 100_000_000;
    return `${eok.toLocaleString('ko-KR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}억`;
}

interface SlotTarget {
    teamIdx: number;
    slotIdx: number;
}

interface SquadAvatarListProps {
    teams: (SlotState | null)[][];
    activeTeamIdx: number;
    onSelectTeam: (teamIdx: number) => void;
    onUpdateSlot: (teamIdx: number, slotIdx: number, patch: Partial<SlotState> | null) => void;
    onSwapSlots?: (fromTeamIdx: number, fromSlotIdx: number, toTeamIdx: number, toSlotIdx: number) => void;
    onOpenDetailModal: (teamIdx: number, slotIdx: number) => void;
    onClearTeam: (teamIdx: number) => void;
    teamResults: (SimulationOutput | null)[];
    onOpenResultModal: (teamIdx: number) => void;
}

export const SquadAvatarList: React.FC<SquadAvatarListProps> = ({
    teams,
    activeTeamIdx,
    onSelectTeam,
    onUpdateSlot,
    onSwapSlots,
    onOpenDetailModal,
    onClearTeam,
    teamResults,
    onOpenResultModal,
}) => {
    const [dragOverTarget, setDragOverTarget] = useState<SlotTarget | null>(null);
    const [draggedTarget, setDraggedTarget] = useState<SlotTarget | null>(null);

    const handleDragStart = (e: React.DragEvent, teamIdx: number, slotIdx: number) => {
        const slot = teams[teamIdx]?.[slotIdx];
        if (!slot || !slot.char) return;

        setDraggedTarget({ teamIdx, slotIdx });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({ type: 'squad-slot', fromTeamIdx: teamIdx, fromIdx: slotIdx })
        );
        e.dataTransfer.setData('text/plain', slot.char.data.characterID);
    };

    const handleDragEnd = () => {
        setDraggedTarget(null);
        setDragOverTarget(null);
    };

    const handleDragOver = (e: React.DragEvent, teamIdx: number, slotIdx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTarget?.teamIdx !== teamIdx || dragOverTarget?.slotIdx !== slotIdx) {
            setDragOverTarget({ teamIdx, slotIdx });
        }
    };

    const handleDragLeave = (teamIdx: number, slotIdx: number) => {
        if (dragOverTarget?.teamIdx === teamIdx && dragOverTarget?.slotIdx === slotIdx) {
            setDragOverTarget(null);
        }
    };

    const handleDrop = (e: React.DragEvent, teamIdx: number, slotIdx: number) => {
        e.preventDefault();
        setDragOverTarget(null);
        setDraggedTarget(null);
        onSelectTeam(teamIdx);

        // 1. 스쿼드 슬롯 간 드래그 스왑(Swap) 검사 (동일 스쿼드 및 스쿼드 간 이동 모두 지원)
        const rawJson = e.dataTransfer.getData('application/json');
        if (rawJson) {
            try {
                const data = JSON.parse(rawJson);
                if (
                    data.type === 'squad-slot' &&
                    typeof data.fromTeamIdx === 'number' &&
                    typeof data.fromIdx === 'number'
                ) {
                    if (data.fromTeamIdx !== teamIdx || data.fromIdx !== slotIdx) {
                        onSwapSlots?.(data.fromTeamIdx, data.fromIdx, teamIdx, slotIdx);
                    }
                    return;
                }
            } catch {
                // Ignore JSON parse errors
            }
        }

        // 2. 캐릭터 패널에서 드래그해온 새 캐릭터 배치
        const charID = e.dataTransfer.getData('text/plain');
        if (!charID) return;

        const charOption = characterOptions.find(c => c.data.characterID === charID);
        if (!charOption) return;

        onUpdateSlot(teamIdx, slotIdx, { char: charOption });
    };

    const hasAnyResult = teamResults.some(r => r !== null && r !== undefined);
    const combinedTotalDmg = teamResults.reduce((acc, r) => acc + (r?.summary?.teamTotal ?? 0), 0);

    return (
        <Grid columns={1} gap={0}>
            <div className={`pa-2 ${styles['squad-title-bar']}`}>
                <Font as="span" variant="subtitle" weight="bold">
                    스쿼드 편성
                </Font>
                <div className={styles['squad-title-actions']}>
                    {hasAnyResult && (
                        <div className={styles['squad-total-dmg']}>
                            <Font as="span" variant="caption-1" color="muted">
                                총합 딜
                            </Font>
                            <Font
                                as="span"
                                variant="subtitle"
                                weight="bold"
                                className={styles['squad-total-value']}
                            >
                                {formatTotalDamageEok(combinedTotalDmg)}
                            </Font>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles['squad-list']}>
                {teams.map((slots, teamIdx) => {
                    const displaySlots = [...slots];
                    while (displaySlots.length < 5) displaySlots.push(null);

                    const isActiveTeam = teamIdx === activeTeamIdx;
                    const hasTeamChars = displaySlots.some(s => s !== null && s.char !== null);
                    const teamResult = teamResults[teamIdx] ?? null;
                    const teamTotalDmg = teamResult?.summary?.teamTotal ?? null;

                    return (
                        <div
                            key={teamIdx}
                            className={styles['squad-row']}
                            onClick={() => onSelectTeam(teamIdx)}
                        >
                            <div className={styles['squad-row-header']}>
                                <div className={styles['squad-row-label']}>
                                    <Font
                                        as="span"
                                        variant="caption-1"
                                        weight="bold"
                                        color={isActiveTeam ? 'default' : 'muted'}
                                        className={[
                                            styles['squad-row-title'],
                                            isActiveTeam ? styles.active : '',
                                        ].filter(Boolean).join(' ')}
                                    >
                                        스쿼드 {teamIdx + 1}
                                    </Font>
                                </div>
                                <ButtonIcon
                                    icon="close"
                                    size="xsmall"
                                    variant="assistive"
                                    disabled={!hasTeamChars}
                                    title={`스쿼드 ${teamIdx + 1} 초기화`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectTeam(teamIdx);
                                        onClearTeam(teamIdx);
                                    }}
                                />
                            </div>

                            <div className={styles['squad-row-body']}>
                                <div className={styles['squad-slots-grid']}>
                                    {displaySlots.slice(0, 5).map((slot, slotIdx) => {
                                        const isFilled = Boolean(slot && slot.char);
                                        const charID = slot?.char?.data?.characterID;
                                        const charName = slot?.char?.label || slot?.char?.data?.characterName || '';
                                        const isDragOver =
                                            dragOverTarget?.teamIdx === teamIdx &&
                                            dragOverTarget?.slotIdx === slotIdx;
                                        const isDragging =
                                            draggedTarget?.teamIdx === teamIdx &&
                                            draggedTarget?.slotIdx === slotIdx;
                                        const badgeBgColor = ACCENT_COLORS[slotIdx % 5];

                                        const stats = slot?.char?.data?.stats;
                                        const burstLevel = stats?.burstLevel;
                                        const elementStr = stats?.element || '';
                                        const elemIconUrl = ELEMENT_ICONS[elementStr === '전기' ? '전격' : elementStr];
                                        const burstIconUrl = burstLevel ? BURST_ICONS[burstLevel] : null;

                                        return (
                                            <div key={slotIdx} className={styles['squad-item']}>
                                                <div
                                                    className={[
                                                        styles['squad-card'],
                                                        isFilled ? styles.filled : styles.empty,
                                                        isDragOver ? styles['drag-over'] : '',
                                                        isDragging ? styles.dragging : '',
                                                    ].filter(Boolean).join(' ')}
                                                    draggable={isFilled}
                                                    onDragStart={(e) => isFilled && handleDragStart(e, teamIdx, slotIdx)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectTeam(teamIdx);
                                                        onOpenDetailModal(teamIdx, slotIdx);
                                                    }}
                                                    onDragOver={(e) => handleDragOver(e, teamIdx, slotIdx)}
                                                    onDragLeave={() => handleDragLeave(teamIdx, slotIdx)}
                                                    onDrop={(e) => handleDrop(e, teamIdx, slotIdx)}
                                                    title={
                                                        isFilled
                                                            ? `${charName} (드래그하여 자리 이동 / 클릭하여 상세 설정)`
                                                            : `스쿼드 ${teamIdx + 1} 슬롯 ${slotIdx + 1} 캐릭터 배치`
                                                    }
                                                >
                                                    {/* 1~5번 숫자 및 Accent-Lime부터 5가지 순차적 배지 배경색 */}
                                                    <div
                                                        className={styles['slot-badge']}
                                                        style={{ backgroundColor: badgeBgColor }}
                                                    >
                                                        {slotIdx + 1}
                                                    </div>

                                                    {/* 속성 및 버스트 배지 */}
                                                    {isFilled && (
                                                        <div className={styles['badge-group']}>
                                                            {elemIconUrl && (
                                                                <div className={styles['badge-item']}>
                                                                    <img
                                                                        src={elemIconUrl}
                                                                        alt={elementStr}
                                                                        className={styles['badge-icon']}
                                                                    />
                                                                </div>
                                                            )}
                                                            {burstIconUrl && (
                                                                <div className={styles['badge-item']}>
                                                                    <img
                                                                        src={burstIconUrl}
                                                                        alt={`Burst ${burstLevel}`}
                                                                        className={styles['badge-icon']}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isFilled && charID ? (
                                                        <Avatar
                                                            charId={charID}
                                                            alt={charName}
                                                            ratio="1:1"
                                                            className={styles['avatar-image']}
                                                        />
                                                    ) : (
                                                        <Icon name="add" className={styles['empty-icon']} />
                                                    )}

                                                    {isFilled && (
                                                        <ButtonIcon
                                                            icon="close"
                                                            size="xsmall"
                                                            variant="assistive"
                                                            className={styles['remove-button']}
                                                            title="슬롯 해제"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectTeam(teamIdx);
                                                                onUpdateSlot(teamIdx, slotIdx, null);
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={styles['squad-row-summary']}>
                                    {teamTotalDmg !== null ? (
                                        <Font
                                            as="span"
                                            variant="subtitle"
                                            weight="bold"
                                            className={styles['squad-total-value']}
                                        >
                                            {formatTotalDamageEok(teamTotalDmg)}
                                        </Font>
                                    ) : (
                                        <Font as="span" variant="caption-1" color="muted">
                                            -
                                        </Font>
                                    )}
                                    <Button
                                        variant="assistive"
                                        size="small"
                                        leftIcon="bar_chart"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenResultModal(teamIdx);
                                        }}
                                        disabled={!teamResult}
                                    >
                                        상세보기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Grid>
    );
};

export default SquadAvatarList;
