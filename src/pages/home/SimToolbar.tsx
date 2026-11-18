import React from 'react';
import { Button } from '../../components/Button/Button';
import { Switch } from '../../components/Switch/Switch';
import { Slider } from '../../components/Slider/Slider';
import { Chip } from '../../components/Chip/Chip';
import { ButtonIconToggle } from '../../components/Button/ButtonIconToggle';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { TextField } from '../../components/TextField';
import { RangeMode } from '../../constants/weaponStats';
import { CoreVisualizer } from './CoreVisualizer';

const ELEMENT_OPTIONS = [
    { value: '풍압', label: '풍압', iconName: 'code-anmi', element: 'wind' as const },
    { value: '철갑', label: '철갑', iconName: 'code-dmtr', element: 'iron' as const },
    { value: '전격', label: '전격', iconName: 'code-zeus', element: 'electric' as const },
    { value: '수냉', label: '수냉', iconName: 'code-psid', element: 'water' as const },
    { value: '작열', label: '작열', iconName: 'code-hsta', element: 'fire' as const },
];

const RANGE_OPTIONS: { value: RangeMode; label: string; weapons: string }[] = [
    { value: 0, label: '0', weapons: 'SG' },
    { value: 15, label: '15', weapons: 'SG · SMG' },
    { value: 25, label: '25', weapons: 'SG · SMG · AR' },
    { value: 35, label: '35', weapons: 'SMG · AR · MG' },
    { value: 45, label: '45', weapons: 'AR · MG · SR' },
    { value: 55, label: '55', weapons: 'MG · SR' },
    { value: 100, label: '100', weapons: 'SR' },
];

interface SimToolbarProps {
    fullBurstInterval: string;
    onFullBurstIntervalChange: (v: string) => void;
    showCore: boolean;
    onToggleCore: () => void;
    coreSize: number;
    onCoreSizeChange: (v: number) => void;
    rangeMode: RangeMode;
    onRangeModeChange: (v: RangeMode) => void;
    weaknessElement: string;
    onWeaknessChange: (v: string) => void;
    enemyDef: string;
    onEnemyDefChange: (v: string) => void;
}

interface TargetSummaryPanelProps {
    fullBurstInterval: string;
    showCore: boolean;
    coreSize: number;
    rangeMode: RangeMode;
    weaknessElement: string;
    enemyDef: string;
    onOpenTargetModal: () => void;
}

export const TargetSummaryPanel: React.FC<TargetSummaryPanelProps> = ({
    fullBurstInterval,
    showCore,
    coreSize,
    rangeMode,
    weaknessElement,
    enemyDef,
    onOpenTargetModal,
}) => {
    const activeElementOption = ELEMENT_OPTIONS.find(opt => opt.value === weaknessElement) || ELEMENT_OPTIONS[0];
    const activeRangeOption = RANGE_OPTIONS.find(opt => opt.value === rangeMode);
    const activeWeapons = activeRangeOption ? activeRangeOption.weapons.split(' · ') : [];

    return (
        <Grid columns={1} gap={2} className="pa-2">
            {/* 상단 헤더: 타이틀 & 타겟 설정 모달 열기 버튼 */}
            <Grid templateColumns="1fr auto" alignItems="center" className="pb-2 divider-bottom">
                <Font as="h3" variant="subtitle" weight="bold">
                    타겟 설정
                </Font>
                <Button
                    variant="assistive"
                    size="small"
                    leftIcon="settings"
                    onClick={onOpenTargetModal}
                >
                    타겟 설정
                </Button>
            </Grid>

            {/* 타겟 설정 간략 요약 */}
            <Grid columns={{ xs: 2, sm: 3, lg: 5 }} gap={2} alignItems="center">
                <Grid columns={1} gap={1}>
                    <Font as="span" variant="caption-2" color="muted">약점 속성</Font>
                    <Grid templateColumns="auto auto" gap={1} alignItems="center" justifyContent="start">
                        <ButtonIconToggle
                            size="small"
                            svgIcon={activeElementOption.iconName}
                            element={activeElementOption.element}
                            selected
                            aria-label={activeElementOption.label}
                        />
                        <Font as="span" variant="body" weight="semibold">
                            {activeElementOption.label}
                        </Font>
                    </Grid>
                </Grid>

                <Grid columns={1} gap={1}>
                    <Font as="span" variant="caption-2" color="muted">적 방어력</Font>
                    <Grid templateColumns="auto" justifyContent="start">
                        <Chip variant="non-selectable">{enemyDef || '100'}</Chip>
                    </Grid>
                </Grid>

                <Grid columns={1} gap={1}>
                    <Font as="span" variant="caption-2" color="muted">버스트 충전</Font>
                    <Grid templateColumns="auto" justifyContent="start">
                        <Chip variant="non-selectable">{fullBurstInterval || '3.5'}초</Chip>
                    </Grid>
                </Grid>

                <Grid columns={1} gap={1}>
                    <Font as="span" variant="caption-2" color="muted">교전 거리</Font>
                    <Grid templateColumns="auto auto" gap={1} alignItems="center" justifyContent="start">
                        <Chip variant="non-selectable">{rangeMode}</Chip>
                        <Font as="span" variant="caption-1" color="muted">
                            {activeWeapons.join(' · ')}
                        </Font>
                    </Grid>
                </Grid>

                <Grid columns={1} gap={1}>
                    <Font as="span" variant="caption-2" color="muted">코어</Font>
                    <Grid templateColumns="auto" justifyContent="start">
                        <Chip
                            variant={showCore ? 'core' : 'non-selectable'}
                            selectable={false}
                        >
                            {showCore ? `코어 ${coreSize}px` : '미적용'}
                        </Chip>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

const SimToolbar: React.FC<SimToolbarProps> = ({
    fullBurstInterval, onFullBurstIntervalChange,
    showCore, onToggleCore,
    coreSize, onCoreSizeChange,
    rangeMode, onRangeModeChange,
    weaknessElement, onWeaknessChange,
    enemyDef, onEnemyDefChange,
}) => {
    const activeRangeOption = RANGE_OPTIONS.find(opt => opt.value === rangeMode);
    const activeWeapons = activeRangeOption ? activeRangeOption.weapons.split(' · ') : [];

    const rangeMarks = RANGE_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
    }));

    return (
        <Grid columns={1} gap={2}>
            {/* 설정 영역: 1열 Column 배치 (모달 내 세로 스크롤 대응) */}
            <Grid columns={1} gap={3}>
                {/* 그룹 1: 타겟 속성 및 스펙 */}
                <Grid columns={1} gap={2}>
                    {/* 약점 속성 선택 */}
                    <Grid columns={1} gap={1}>
                        <Font as="span" variant="caption-1" color="muted">약점 속성</Font>
                        <Grid templateColumns="repeat(5, auto)" gap={1} justifyContent="start">
                            {ELEMENT_OPTIONS.map(opt => (
                                <ButtonIconToggle
                                    key={opt.value}
                                    svgIcon={opt.iconName}
                                    element={opt.element}
                                    selected={weaknessElement === opt.value}
                                    onClick={() => onWeaknessChange(opt.value)}
                                    title={opt.label}
                                />
                            ))}
                        </Grid>
                    </Grid>

                    {/* 적 방어력 & 버스트 충전 시간 (가로 2열) */}
                    <Grid columns={2} gap={1}>
                        <TextField
                            type="number"
                            value={enemyDef}
                            onChange={e => onEnemyDefChange(e.target.value)}
                            label={<Font variant="caption-1" color="muted">적 방어력</Font>}
                            hintText="유니온 100"
                            size="small"
                        />
                        <TextField
                            type="number"
                            value={fullBurstInterval}
                            onChange={e => onFullBurstIntervalChange(e.target.value)}
                            step="0.01"
                            min="2.52"
                            label={<Font variant="caption-1" color="muted">버스트 충전</Font>}
                            suffix="초"
                            size="small"
                        />
                    </Grid>
                </Grid>

                {/* 그룹 2: 교전 거리 설정 */}
                <Grid columns={1} gap={1}>
                    <Grid templateColumns="1fr auto" alignItems="center">
                        <Font as="span" variant="caption-1" color="muted">교전 거리</Font>
                        <Grid templateColumns={`repeat(${activeWeapons.length}, auto)`} gap={1} justifyContent="end">
                            {activeWeapons.map(w => (
                                <Chip key={w} readOnly>{w}</Chip>
                            ))}
                        </Grid>
                    </Grid>

                    <Grid columns={1} gap={1} className="mt-1">
                        <Grid columns={3} justifyContent="between" className="px-1">
                            <Font as="span" variant="footnote" color="muted">Near</Font>
                            <Font as="span" variant="footnote" color="muted" style={{ textAlign: 'center' }}>Mid</Font>
                            <Font as="span" variant="footnote" color="muted" style={{ textAlign: 'right' }}>Far</Font>
                        </Grid>
                        <Slider
                            min={0}
                            max={100}
                            type="discrete"
                            value={rangeMode}
                            onChange={val => onRangeModeChange(val as RangeMode)}
                            marks={rangeMarks}
                            formatTooltip={val => {
                                const opt = RANGE_OPTIONS.find(o => o.value === val);
                                return opt ? `${opt.label} (${opt.weapons})` : String(val);
                            }}
                        />
                    </Grid>
                </Grid>

                {/* 그룹 3: 코어 여부, 직경 및 탄착군 시각화 */}
                <Grid columns={1} gap={1}>
                    <Grid templateColumns="1fr auto" alignItems="center">
                        <Font as="span" variant="caption-1" color="muted">코어 여부</Font>
                        <Switch checked={showCore} onChange={onToggleCore} />
                    </Grid>

                    {showCore && (
                        <Grid columns={1} gap={1} className="mt-1">
                            <Grid templateColumns="1fr auto" alignItems="center">
                                <Font as="span" variant="caption-2" color="muted">코어 직경</Font>
                                <Font as="span" variant="caption-2" color="accent" weight="bold">
                                    {coreSize}px
                                </Font>
                            </Grid>
                            <Slider
                                min={10}
                                max={150}
                                step={2}
                                value={coreSize}
                                onChange={onCoreSizeChange}
                                formatTooltip={v => `${v}px`}
                            />
                        </Grid>
                    )}

                    {/* 코어 & 탄착군 실시간 시각화 프리뷰 */}
                    <CoreVisualizer
                        coreSize={coreSize}
                        showCore={showCore}
                        onCoreSizeChange={onCoreSizeChange}
                    />
                </Grid>
            </Grid>
        </Grid>
    );
};

export default SimToolbar;
