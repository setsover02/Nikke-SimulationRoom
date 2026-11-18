import React, { useState, useEffect } from 'react';
import CharacterSlot from './home/CharacterSlot';
import SimToolbar, { TargetSummaryPanel } from './home/SimToolbar';
import { CharacterSelectionPanel } from './home/CharacterSelectionPanel';
import { SquadAvatarList } from './home/SquadAvatarList';
import ResultSummary from './home/ResultSummary';
import GlobalLevelPanel from './home/GlobalLevelPanel';
import CanvasChart from './home/CanvasChart';
import CanvasDpsChart from './home/CanvasDpsChart';
import CanvasScatterChart from './home/CanvasScatterChart';
import CanvasTimelineChart from './home/CanvasTimelineChart';
import { runSimulation } from '../engine/simulationRunner';
import {
    loadOutpostState,
    saveOutpostState,
    SavedOutpostState,
    saveCharSettings,
    loadAllCharSettings,
    loadGlobalCubeLevels,
    saveGlobalCubeLevel,
    getGlobalCubeLevel,
    getCharDefaultState,
    loadTeamLayouts,
    saveTeamLayouts,
    loadTargetSettings,
    saveTargetSettings
} from '../utils/storageUtils';
import { characterOptions } from '../constants/characters';
import { RangeMode } from '../constants/weaponStats';
import { SimulationOutput, SlotState } from '../types/simulator';
import { Card } from '../components/Card/Card';
import { Button } from '../components/Button/Button';
import { ButtonToggle } from '../components/Button/ButtonToggle';
import { SidePanel } from '../components/SidePanel';
import { Grid } from '../components/Layout/Grid';
import { Font } from '../components/Font';
import { Modal } from '../components/Modal';
import ProfileSyncModal from '../components/ProfileSyncModal/ProfileSyncModal';
import { checkAndProcessUrlSync } from '../utils/profileSync';
import styles from './Home.module.scss';

const EMPTY_TEAM: (SlotState | null)[] = [null, null, null, null, null];
const createInitialFiveTeams = (): (SlotState | null)[][] =>
    Array.from({ length: 5 }, () => [...EMPTY_TEAM]);

const Home: React.FC = () => {
    // 5 teams by default, each with 5 character slots (null means empty)
    const [teams, setTeams] = useState<(SlotState | null)[][]>(createInitialFiveTeams);
    const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);

    // Active detail editing modal target ({ teamIdx, slotIdx } | null)
    const [activeDetailTarget, setActiveDetailTarget] = useState<{ teamIdx: number; slotIdx: number } | null>(null);
    // Character selection modal target (for empty slots)
    const [charSelectionTarget, setCharSelectionTarget] = useState<{ teamIdx: number; slotIdx: number } | null>(null);
    // Target settings modal
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    // Simulation result detail modal (team index, null = closed)
    const [resultModalTeamIdx, setResultModalTeamIdx] = useState<number | null>(null);
    // Profile sync modal
    const [isProfileSyncOpen, setIsProfileSyncOpen] = useState(false);

    // Responsive desktop screen check
    const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true));

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1280);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 북마클릿을 통한 들어오는 동기화 요청 자동 처리
    useEffect(() => {
        checkAndProcessUrlSync().then((res) => {
            if (res && res.success) {
                const freshOutpost = loadOutpostState();
                setOutpostState(freshOutpost);
                setTeams(prev => prev.map(team =>
                    team.map(s => {
                        if (!s || !s.char) return s;
                        const fresh = getCharDefaultState(s.char);
                        return { ...s, ...fresh, char: s.char };
                    })
                ));
                setTeamResults([null, null, null, null, null]);
                setResultModalTeamIdx(null);
                alert(`🎉 [북마클릿 연동 성공] 총 ${res.syncedCount}명의 니케 육성 데이터가 동기화되었습니다!`);
            }
        });
    }, []);

    // Outpost level settings
    const [outpostState, setOutpostState] = useState<SavedOutpostState>(loadOutpostState);

    // Toolbar settings (loaded from localStorage)
    const savedTarget = loadTargetSettings();
    const [fullBurstInterval, setFullBurstInterval] = useState<string>(savedTarget.fullBurstInterval);
    const [showCore, setShowCore] = useState<boolean>(savedTarget.showCore);
    const [coreSize, setCoreSize] = useState<number>(savedTarget.coreSize ?? 52);
    const [rangeMode, setRangeMode] = useState<RangeMode>(savedTarget.rangeMode as RangeMode);
    const [weaknessElement, setWeaknessElement] = useState<string>(savedTarget.weaknessElement);
    const [enemyDef, setEnemyDef] = useState<string>(savedTarget.enemyDef);

    // Per-team simulation results (null for unsimulated or empty teams)
    const [teamResults, setTeamResults] = useState<(SimulationOutput | null)[]>([null, null, null, null, null]);
    const [chartTab, setChartTab] = useState<'skill' | 'dps' | 'total'>('skill');

    // Load saved team layouts on mount
    useEffect(() => {
        const savedTeamsIds = loadTeamLayouts();
        const restoredTeams: (SlotState | null)[][] = savedTeamsIds.map(teamIds => {
            const restoredSlots: (SlotState | null)[] = teamIds.map(id => {
                if (!id) return null;
                const charOption = characterOptions.find(c => c.data.characterID === id);
                if (!charOption) return null;
                return getCharDefaultState(charOption);
            });
            while (restoredSlots.length < 5) restoredSlots.push(null);
            return restoredSlots.slice(0, 5);
        });
        setTeams(restoredTeams);
        setTeamResults(restoredTeams.map(() => null));
    }, []);

    // Helper: persist current target settings to localStorage
    const persistTargetSettings = (overrides: Partial<{
        fullBurstInterval: string;
        showCore: boolean;
        coreSize: number;
        rangeMode: number;
        weaknessElement: string;
        enemyDef: string;
    }> = {}) => {
        saveTargetSettings({
            fullBurstInterval,
            showCore,
            coreSize,
            rangeMode,
            weaknessElement,
            enemyDef,
            ...overrides
        });
    };

    const resetAllResults = () => {
        setTeamResults([null, null, null, null, null]);
        setResultModalTeamIdx(null);
    };

    const invalidateTeams = (teamIndices: number[]) => {
        if (teamIndices.length === 0) return;
        const targetSet = new Set(teamIndices);
        setTeamResults(prev => prev.map((res, idx) => (targetSet.has(idx) ? null : res)));
        setResultModalTeamIdx(prev => (prev !== null && targetSet.has(prev) ? null : prev));
    };

    const handleFullBurstIntervalChange = (val: string) => {
        setFullBurstInterval(val);
        persistTargetSettings({ fullBurstInterval: val });
        resetAllResults();
    };

    const handleToggleCore = () => {
        setShowCore(v => {
            const next = !v;
            persistTargetSettings({ showCore: next });
            return next;
        });
        resetAllResults();
    };

    const handleCoreSizeChange = (val: number) => {
        setCoreSize(val);
        persistTargetSettings({ coreSize: val });
        resetAllResults();
    };

    const handleRangeModeChange = (val: RangeMode) => {
        setRangeMode(val);
        persistTargetSettings({ rangeMode: val });
        resetAllResults();
    };

    const handleWeaknessChange = (val: string) => {
        setWeaknessElement(val);
        persistTargetSettings({ weaknessElement: val });
        resetAllResults();
    };

    const handleEnemyDefChange = (val: string) => {
        setEnemyDef(val);
        persistTargetSettings({ enemyDef: val });
        resetAllResults();
    };

    // Save outpost changes
    const handleOutpostChange = (patch: Partial<SavedOutpostState>) => {
        const next = { ...outpostState, ...patch };
        setOutpostState(next);
        saveOutpostState(next);
        resetAllResults();
    };

    const persistTeams = (nextTeams: (SlotState | null)[][]) => {
        saveTeamLayouts(nextTeams.map(team => team.map(s => s?.char?.data?.characterID ?? null)));
    };

    const updateSlot = (teamIdx: number, slotIdx: number, patch: Partial<SlotState> | null) => {
        let globalCubeUpdateName: string | null = null;
        let globalCubeUpdateLevel: string | null = null;

        const targetSlot = teams[teamIdx]?.[slotIdx] ?? null;
        const actualPatch = patch ? { ...patch } : null;

        if (actualPatch && targetSlot && (!actualPatch.char || targetSlot?.char?.data?.characterID === actualPatch.char.data.characterID)) {
            // Did the user select a different cube?
            if (actualPatch.cubeName !== undefined && actualPatch.cubeName !== targetSlot.cubeName) {
                actualPatch.cubeLevel = actualPatch.cubeName === 'None' ? '0' : (getGlobalCubeLevel(actualPatch.cubeName) || '1');
            }
            // Did the user manually change the level of the CURRENT cube?
            else if (actualPatch.cubeLevel !== undefined) {
                const name = actualPatch.cubeName || targetSlot.cubeName;
                if (name && name !== 'None') {
                    saveGlobalCubeLevel(name, actualPatch.cubeLevel);
                    globalCubeUpdateName = name;
                    globalCubeUpdateLevel = actualPatch.cubeLevel;
                }
            }
        }

        const invalidatedIndices = new Set<number>([teamIdx]);
        const nextTeams = teams.map((teamSlots, tIdx) =>
            teamSlots.map((s, sIdx) => {
                if (tIdx === teamIdx && sIdx === slotIdx) {
                    if (actualPatch === null) return null;

                    // 새 캐릭터 교체 또는 빈 슬롯 신규 배치 -> 새 캐릭터의 저장된 스펙 로드
                    if (actualPatch.char && (!s || s.char?.data?.characterID !== actualPatch.char.data.characterID)) {
                        const newSlot = getCharDefaultState(actualPatch.char);
                        const merged = { ...newSlot, ...actualPatch };
                        const { char, ...stateToSave } = merged;
                        saveCharSettings(char.data.characterID, stateToSave);
                        return merged;
                    }

                    if (s === null) return null;

                    // 동일 캐릭터의 단일 속성 패치
                    const merged = { ...s, ...actualPatch };
                    const { char, ...stateToSave } = merged;
                    saveCharSettings(char.data.characterID, stateToSave);
                    return merged;
                }

                // Sync other slots if they have the same cube and its level was just updated
                if (s !== null && globalCubeUpdateName && globalCubeUpdateLevel && s.cubeName === globalCubeUpdateName) {
                    invalidatedIndices.add(tIdx);
                    const merged = { ...s, cubeLevel: globalCubeUpdateLevel };
                    const { char, ...stateToSave } = merged;
                    saveCharSettings(char.data.characterID, stateToSave);
                    return merged;
                }

                return s;
            })
        );

        setTeams(nextTeams);
        invalidateTeams(Array.from(invalidatedIndices));
        persistTeams(nextTeams);
    };

    const handleGlobalCubeChange = (cubeId: string, level: string) => {
        const affectedIndices: number[] = [];
        setTeams(prev => prev.map((team, tIdx) =>
            team.map(s => {
                if (s && s.cubeName === cubeId) {
                    affectedIndices.push(tIdx);
                    const merged = { ...s, cubeLevel: level };
                    if (s.char?.data?.characterID) {
                        const { char, ...stateToSave } = merged;
                        saveCharSettings(char.data.characterID, stateToSave);
                    }
                    return merged;
                }
                return s;
            })
        ));
        invalidateTeams(affectedIndices);
    };

    const handleSwapSlots = (fromTeamIdx: number, fromSlotIdx: number, toTeamIdx: number, toSlotIdx: number) => {
        if (fromTeamIdx === toTeamIdx && fromSlotIdx === toSlotIdx) return;
        setTeams(prev => {
            const next = prev.map(team => {
                const copy = [...team];
                while (copy.length < 5) copy.push(null);
                return copy;
            });
            const temp = next[fromTeamIdx][fromSlotIdx];
            next[fromTeamIdx][fromSlotIdx] = next[toTeamIdx][toSlotIdx];
            next[toTeamIdx][toSlotIdx] = temp;
            persistTeams(next);
            return next;
        });
        invalidateTeams([fromTeamIdx, toTeamIdx]);
    };

    const handleClearTeam = (teamIdx: number) => {
        const nextTeams = teams.map((team, idx) => (idx === teamIdx ? [...EMPTY_TEAM] : team));
        setTeams(nextTeams);
        setTeamResults(prev => prev.map((res, idx) => (idx === teamIdx ? null : res)));
        if (resultModalTeamIdx === teamIdx) {
            setResultModalTeamIdx(null);
        }
        persistTeams(nextTeams);
    };

    // Handler when user clicks an avatar in the left CharacterSelectionPanel (targets activeTeamIdx)
    const handleSelectCharacterFromPanel = (charOption: typeof characterOptions[0]) => {
        const targetTeam = teams[activeTeamIdx] ?? [];
        const charID = charOption.data.characterID;
        // Check if character is already in active squad
        const existingIdx = targetTeam.findIndex(s => s?.char?.data?.characterID === charID);

        if (existingIdx !== -1) {
            // If already in active squad, toggle off (remove)
            updateSlot(activeTeamIdx, existingIdx, null);
            return;
        }

        // Find first empty slot in active squad
        const emptyIdx = targetTeam.findIndex(s => s === null);
        if (emptyIdx !== -1) {
            updateSlot(activeTeamIdx, emptyIdx, { char: charOption });
        } else {
            // If all 5 slots are full, replace slot 0
            updateSlot(activeTeamIdx, 0, { char: charOption });
        }
    };

    // 단일 스쿼드 시뮬레이션 실행 (해당 스쿼드만 계산)
    const handleSimulateTeam = (teamIdx: number) => {
        const teamSlots = teams[teamIdx];
        if (!teamSlots) return;
        const activeChars = teamSlots.filter((s): s is SlotState => s !== null && s.char !== null);
        if (activeChars.length === 0) return;

        const output = runSimulation({
            slots: teamSlots,
            enemyDef,
            fullBurstInterval,
            rangeMode,
            weaknessElement,
            outpostState,
            showCore,
            coreSize,
        });

        setTeamResults(prev => prev.map((res, idx) => (idx === teamIdx ? output : res)));
    };

    // Manual Re-calculate Trigger across all non-empty squads
    const handleSimulate = () => {
        const hasAnyCharacter = teams.some(teamSlots =>
            teamSlots.some(s => s !== null && s.char !== null)
        );
        if (!hasAnyCharacter) return;

        const nextResults: (SimulationOutput | null)[] = teams.map(teamSlots => {
            const activeChars = teamSlots.filter((s): s is SlotState => s !== null && s.char !== null);
            // 해당 스쿼드에 니케가 없다면 시뮬레이션하지 않음
            if (activeChars.length === 0) return null;

            return runSimulation({
                slots: teamSlots,
                enemyDef,
                fullBurstInterval,
                rangeMode,
                weaknessElement,
                outpostState,
                showCore,
                coreSize,
            });
        });

        setTeamResults(nextResults);
    };

    // List of character IDs across all 5 squads & overall squad presence check
    const allSquadCharIds = Array.from(
        new Set(
            teams
                .flatMap(team => team.map(s => s?.char?.data?.characterID))
                .filter((id): id is string => Boolean(id))
        )
    );
    const hasAnySquadCharacter = allSquadCharIds.length > 0;
    const activeModalResult = resultModalTeamIdx !== null ? teamResults[resultModalTeamIdx] ?? null : null;
    const activeModalCharCount =
        resultModalTeamIdx !== null
            ? (teams[resultModalTeamIdx]?.filter(s => s !== null && s.char !== null).length ?? 0)
            : 0;

    return (
        <Grid columns={1}>
            {/* 1. 글로벌 레벨 설정 패널 (전체 넓이) */}
            <SidePanel>
                <GlobalLevelPanel
                    outpostState={outpostState}
                    onChange={handleOutpostChange}
                    onCubeChange={handleGlobalCubeChange}
                    onOpenProfileSync={() => setIsProfileSyncOpen(true)}
                />
            </SidePanel>

            {/* 2. 타겟 설정 요약 패널 (캐릭터 선택 / 스쿼드 편성 위쪽) */}
            <Card>
                <TargetSummaryPanel
                    showCore={showCore}
                    onToggleCore={handleToggleCore}
                    coreSize={coreSize}
                    weaknessElement={weaknessElement}
                    onWeaknessChange={handleWeaknessChange}
                    onOpenTargetModal={() => setIsTargetModalOpen(true)}
                />
            </Card>

            {/* 3. 스쿼드 + 캐릭터 선택 패널 (데스크톱: 320px 1fr, 그 외: 1fr) */}
            <Grid columns={{ xs: '1fr', lg: '320px 1fr' }}>
                {/* 데스크톱 전용 캐릭터 선택 패널 */}
                {isDesktop && (
                    <Card className={styles['selection-panel-card']}>
                        <CharacterSelectionPanel
                            onSelectCharacter={handleSelectCharacterFromPanel}
                            currentSquadCharIds={allSquadCharIds}
                            fullHeight
                        />
                    </Card>
                )}

                {/* 스쿼드 아바타 목록 (기본 5팀) */}
                <Card>
                    <SquadAvatarList
                        teams={teams}
                        activeTeamIdx={activeTeamIdx}
                        onSelectTeam={setActiveTeamIdx}
                        onUpdateSlot={updateSlot}
                        onSwapSlots={handleSwapSlots}
                        onOpenDetailModal={(teamIdx, slotIdx) => {
                            const isFilled = Boolean(teams[teamIdx]?.[slotIdx]?.char);
                            if (isFilled) {
                                setActiveDetailTarget({ teamIdx, slotIdx });
                            } else {
                                setCharSelectionTarget({ teamIdx, slotIdx });
                            }
                        }}
                        onClearTeam={handleClearTeam}
                        teamResults={teamResults}
                        onSimulateTeam={handleSimulateTeam}
                        onOpenResultModal={(teamIdx) => setResultModalTeamIdx(teamIdx)}
                    />
                </Card>
            </Grid>

            {/* 4. 시뮬레이션 버튼 (기존 차트 위치) */}
            <Grid columns={1}>
                <Button
                    onClick={handleSimulate}
                    variant="primary"
                    size="large"
                    leftIcon="play_arrow"
                    disabled={!hasAnySquadCharacter}
                >
                    시뮬레이션
                </Button>
            </Grid>

            {/* 6. 캐릭터 상세 정보 설정 모달 팝업 (비어있지 않은 슬롯) */}
            <Modal
                isOpen={activeDetailTarget !== null}
                onClose={() => setActiveDetailTarget(null)}
                showCloseButton={false}
                maxWidth={640}
                footer={
                    <Button size="small" onClick={() => setActiveDetailTarget(null)}>
                        완료
                    </Button>
                }
            >
                {activeDetailTarget !== null && (
                    <CharacterSlot
                        slot={teams[activeDetailTarget.teamIdx]?.[activeDetailTarget.slotIdx] ?? null}
                        index={activeDetailTarget.slotIdx}
                        onUpdate={(patch) => updateSlot(activeDetailTarget.teamIdx, activeDetailTarget.slotIdx, patch)}
                        outpostState={outpostState}
                    />
                )}
            </Modal>

            {/* 7. 캐릭터 선택 모달 팝업 (비어있는 슬롯 선택 시) */}
            <Modal
                isOpen={charSelectionTarget !== null}
                onClose={() => setCharSelectionTarget(null)}
                title={
                    charSelectionTarget !== null
                        ? `스쿼드 ${charSelectionTarget.teamIdx + 1} 슬롯 ${charSelectionTarget.slotIdx + 1} 캐릭터 배치`
                        : '캐릭터 배치'
                }
                maxWidth={480}
            >
                {charSelectionTarget !== null && (
                    <CharacterSelectionPanel
                        onSelectCharacter={(charOption) => {
                            updateSlot(charSelectionTarget.teamIdx, charSelectionTarget.slotIdx, { char: charOption });
                            setCharSelectionTarget(null);
                        }}
                        currentSquadCharIds={allSquadCharIds}
                    />
                )}
            </Modal>

            {/* 8. 타겟 설정 모달 */}
            <Modal
                isOpen={isTargetModalOpen}
                onClose={() => setIsTargetModalOpen(false)}
                title="타겟 설정"
                maxWidth={560}
                footer={
                    <Button size="small" onClick={() => setIsTargetModalOpen(false)}>
                        완료
                    </Button>
                }
            >
                <SimToolbar
                    fullBurstInterval={fullBurstInterval}
                    onFullBurstIntervalChange={handleFullBurstIntervalChange}
                    showCore={showCore}
                    onToggleCore={handleToggleCore}
                    coreSize={coreSize}
                    onCoreSizeChange={handleCoreSizeChange}
                    rangeMode={rangeMode}
                    onRangeModeChange={handleRangeModeChange}
                    weaknessElement={weaknessElement}
                    onWeaknessChange={handleWeaknessChange}
                    enemyDef={enemyDef}
                    onEnemyDefChange={handleEnemyDefChange}
                />
            </Modal>

            {/* 9. 시뮬레이션 상세 결과 모달 (요약 & 차트) */}
            <Modal
                isOpen={resultModalTeamIdx !== null && activeModalResult !== null}
                onClose={() => setResultModalTeamIdx(null)}
                title={
                    resultModalTeamIdx !== null
                        ? `스쿼드 ${resultModalTeamIdx + 1} 시뮬레이션 결과`
                        : '시뮬레이션 결과'
                }
                maxWidth={1120}
                footer={
                    <Button size="small" onClick={() => setResultModalTeamIdx(null)}>
                        닫기
                    </Button>
                }
            >
                {activeModalResult && (
                    <Grid columns={1} gap={3}>
                        <ResultSummary
                            summary={activeModalResult.summary}
                            showTeamTotal={activeModalCharCount > 1}
                            isCore={showCore}
                        />
                        {activeModalResult.chartDatasets.length > 0 && (
                            <div className={`px-2 ${styles['result-chart-section']}`}>
                                <Font as="h4" variant="subtitle" weight="bold">
                                    전투 대미지 상세 차트
                                </Font>
                                <Grid templateColumns="repeat(3, auto)" gap={1} justifyContent="start">
                                    <ButtonToggle
                                        selected={chartTab === 'skill'}
                                        onClick={() => setChartTab('skill')}
                                        size="small"
                                    >
                                        스킬 대미지
                                    </ButtonToggle>
                                    <ButtonToggle
                                        selected={chartTab === 'dps'}
                                        onClick={() => setChartTab('dps')}
                                        size="small"
                                    >
                                        초당 DPS
                                    </ButtonToggle>
                                    <ButtonToggle
                                        selected={chartTab === 'total'}
                                        onClick={() => setChartTab('total')}
                                        size="small"
                                    >
                                        전체 대미지
                                    </ButtonToggle>
                                </Grid>
                                {chartTab === 'skill' ? (
                                    <CanvasScatterChart
                                        datasets={activeModalResult.skillChartDatasets}
                                        burstWindows={activeModalResult.burstWindows}
                                        title="Skill Damage Instances"
                                        charIdToName={activeModalResult.charIdToName}
                                    />
                                ) : chartTab === 'dps' ? (
                                    <CanvasDpsChart
                                        datasets={activeModalResult.dps1sDatasets}
                                        burstWindows={activeModalResult.burstWindows}
                                        title={showCore ? '1s Interval DPS (With Core)' : '1s Interval DPS (No Core)'}
                                        charIdToName={activeModalResult.charIdToName}
                                    />
                                ) : (
                                    <CanvasChart
                                        datasets={activeModalResult.chartDatasets}
                                        burstWindows={activeModalResult.burstWindows}
                                        title={showCore ? 'Cumulative Damage (With Core)' : 'Cumulative Damage (No Core)'}
                                        charIdToName={activeModalResult.charIdToName}
                                    />
                                )}
                                <CanvasTimelineChart summary={activeModalResult.summary} duration={180} />
                            </div>
                        )}
                    </Grid>
                )}
            </Modal>

            {/* 10. blablalink 프로필 동기화 모달 */}
            <ProfileSyncModal
                isOpen={isProfileSyncOpen}
                onClose={() => setIsProfileSyncOpen(false)}
                onSyncComplete={(updatedOutpost) => {
                    setOutpostState(updatedOutpost);
                    setTeams(prev => prev.map(team =>
                        team.map(s => {
                            if (!s || !s.char) return s;
                            const fresh = getCharDefaultState(s.char);
                            return { ...s, ...fresh, char: s.char };
                        })
                    ));
                    resetAllResults();
                }}
            />
        </Grid>
    );
};

export default Home;