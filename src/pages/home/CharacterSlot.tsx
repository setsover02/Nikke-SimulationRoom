import React, { useState, useEffect, useRef, useMemo } from 'react';
import Select, { components } from 'react-select';
import { SlotState } from '../../types/simulator';
import { characterOptions, avatarMap, fullbodyMap } from '../../constants/characters';
import { ELEMENT_ICONS, BURST_ICONS, CLASS_ICONS, COMPANY_ICONS, WEAPON_ICONS } from '../../constants/icons';
import { getCharDefaultState, SavedOutpostState } from '../../utils/storageUtils';
import { Icon } from '../../components/Icon/Icon';
import { Font } from '../../components/Font';
import { Avatar } from '../../components/Avatar/Avatar';
import { TextField } from '../../components/TextField';
import { Dropdown } from '../../components/Dropdown';
import { Chip } from '../../components/Chip/Chip';
import { Grid } from '../../components/Layout/Grid';
import { calculateBaseStat, getCorpConsoleLevel, getClassConsoleLevel, resolveGrowthStage, growthStageLabel, MAX_STAGE_BY_RARITY } from '../../engine/baseStat';
import styles from './CharacterSlot.module.scss';

// Cube Data Source
const CUBE_OPTIONS = [
    { value: 'None', label: '없음', icon: null },
    { value: '01-cube-assault', label: '어썰트', icon: '/src/assets/cube/01-cube-assault.webp' },
    { value: '02-cube-onslaught', label: '택티컬 어설트', icon: '/src/assets/cube/02-cube-onslaught.webp' },
    { value: '03-cube-resilience', label: '렐릭 베어', icon: '/src/assets/cube/03-cube-resilience.webp' },
    { value: '04-cube-bastion', label: '택티컬 베어', icon: '/src/assets/cube/04-cube-bastion.webp' },
    { value: '05-cube-adjutant', label: '렐릭 부스트', icon: '/src/assets/cube/05-cube-adjutant.webp' },
    { value: '06-cube-wingman', label: '택티컬 부스트', icon: '/src/assets/cube/06-cube-wingman.webp' },
    { value: '07-cube-quantum', label: '렐릭 퀀텀', icon: '/src/assets/cube/07-cube-quantum.webp' },
    { value: '08-cube-vigor', label: '렐릭 비고르', icon: '/src/assets/cube/08-cube-vigor.webp' },
    { value: '09-cube-endurance', label: '렐릭 인듀어', icon: '/src/assets/cube/09-cube-endurance.webp' },
    { value: '10-cube-healing', label: '렐릭 힐링', icon: '/src/assets/cube/10-cube-healing.webp' },
    { value: '11-cube-tempering', label: '렐릭 템퍼링', icon: '/src/assets/cube/11-cube-tempering.webp' },
    { value: '12-cube-assist', label: '렐릭 어시스터', icon: '/src/assets/cube/12-cube-assist.webp' },
    { value: '13-cube-destruction', label: '렐릭 디스트로이', icon: '/src/assets/cube/13-cube-destruction.webp' },
    { value: '14-cube-piercing', label: '렐릭 피어싱', icon: '/src/assets/cube/14-cube-piercing.webp' },
    { value: '15-cube-crash', label: '렐릭 크래시', icon: '/src/assets/cube/15-cube-crash.webp' },
    { value: '16-cube-divide', label: '렐릭 디바이드', icon: '/src/assets/cube/16-cube-divide.webp' }
];

const EQUIP_TIER_OPTIONS = [
    { value: 'none', label: '없음' },
    { value: 'T9', label: '일반 T9' },
    { value: '기업', label: '기업 전용' },
    { value: 'Overload', label: '오버로드' },
];

const EQUIP_PARTS: {
    label: string;
    tierKey: keyof SlotState;
    upgradeKey: keyof SlotState;
}[] = [
        { label: '머리', tierKey: 'equipTierHead', upgradeKey: 'equipUpgradeHead' },
        { label: '몸통', tierKey: 'equipTierTorso', upgradeKey: 'equipUpgradeTorso' },
        { label: '팔', tierKey: 'equipTierArms', upgradeKey: 'equipUpgradeArms' },
        { label: '다리', tierKey: 'equipTierLegs', upgradeKey: 'equipUpgradeLegs' },
    ];

const OVERLOAD_OPTION_FIELDS: { id: keyof SlotState; label: string; max: number }[] = [
    { id: 'equipWeakPoint', label: '우코', max: 116.64 },
    { id: 'equipATK', label: '공격력', max: 58.52 },
    { id: 'equipAmmo', label: '장탄', max: 341.48 },
    { id: 'equipAccuracy', label: '명중률', max: 58.52 },
    { id: 'equipChargeDmg', label: '차댐', max: 58.52 },
    { id: 'equipChargeSpeed', label: '차속', max: 24.36 },
    { id: 'equipCritRate', label: '크확', max: 28.28 },
    { id: 'equipCritDmg', label: '크댐', max: 81.44 },
    { id: 'equipDef', label: '방어력', max: 58.52 },
];

const SKILL_LEVEL_FIELDS: { key: 'skill1Level' | 'skill2Level' | 'burstLevel'; label: string }[] = [
    { key: 'skill1Level', label: '스킬1' },
    { key: 'skill2Level', label: '스킬2' },
    { key: 'burstLevel', label: '버스트' },
];
interface Props {
    slot: SlotState | null;
    index: number;
    onUpdate: (patch: Partial<SlotState> | null) => void;
    outpostState: SavedOutpostState;
}

const formatNumber = (num: string | number) => {
    if (!num) return '-';
    // Remove formatting to parse, then format
    const parsed = parseInt(String(num).replace(/,/g, ''), 10);
    return isNaN(parsed) ? '-' : parsed.toLocaleString();
};

interface EmptySlotProps {
    onUpdate: (patch: Partial<SlotState> | null) => void;
}

const CustomOption = (props: any) => {
    const characterData = props.data?.data;
    const stats = characterData?.stats;
    const burstLevel = stats?.burstLevel;
    const burstIcon = burstLevel ? BURST_ICONS[burstLevel as keyof typeof BURST_ICONS] : null;
    const element = stats?.element;
    const elementIcon = element ? ELEMENT_ICONS[element as keyof typeof ELEMENT_ICONS] : null;
    const avatar = characterData ? avatarMap[characterData.characterID] : null;

    return (
        <components.Option {...props}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {avatar && (
                        <img
                            src={avatar}
                            alt={props.label}
                            style={{
                                width: '32px',
                                height: '32px',
                                objectFit: 'cover',
                                borderRadius: '4px'
                            }}
                        />
                    )}
                    <span>{props.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {elementIcon && <img src={elementIcon} alt={`Element ${element}`} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                    {burstIcon && <img src={burstIcon} alt={`Burst ${burstLevel}`} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                </div>
            </div>
        </components.Option>
    );
};

const EmptySlot: React.FC<EmptySlotProps> = ({ onUpdate }) => {
    const DropdownIndicator = (props: any) => {
        return (
            <components.DropdownIndicator {...props}>
                <Icon name="arrow_drop_down" size={20} />
            </components.DropdownIndicator>
        );
    };

    return (
        <div className={styles['slot-empty-container']}>
            <div className={styles['slot-header-identity']} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '4px 0 8px 0' }}>
                <div className={styles['slot-empty-avatar']} style={{ width: '80px', height: '80px', borderRadius: '8px', flexShrink: 0 }} />
                <div className={styles['slot-empty-text']}>
                    <div className={styles['slot-select-wrapper']}>
                        <Select
                            options={characterOptions}
                            value={null}
                            placeholder="미선택"
                            onChange={(sel: any) => {
                                if (sel) {
                                    onUpdate(getCharDefaultState(sel));
                                }
                            }}
                            components={{ DropdownIndicator, IndicatorSeparator: () => null, Option: CustomOption }}
                            menuPortalTarget={document.body}
                            styles={{
                                control: (b) => ({ ...b, background: 'transparent', border: 'none', boxShadow: 'none', minHeight: 'unset', cursor: 'pointer' }),
                                valueContainer: (b) => ({ ...b, padding: 0 }),
                                singleValue: (b) => ({ ...b, color: 'var(--Font-Inactive)', fontSize: '14px', fontWeight: 'bold', margin: 0 }),
                                placeholder: (b) => ({ ...b, color: 'var(--Font-Inactive)', fontSize: '14px', fontWeight: 'bold', margin: 0 }),
                                input: (b) => ({ ...b, color: 'var(--Font-Default)', margin: 0, padding: 0 }),
                                menu: (b) => ({ ...b, background: 'var(--Background-Overlay)', zIndex: 10 }),
                                menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                                option: (b, s) => ({ ...b, background: s.isFocused ? 'var(--Interact-Hover)' : 'transparent', color: 'var(--Font-Default)', fontSize: '13px' }),
                            }}
                            isSearchable={true}
                        />
                    </div>
                </div>
            </div>

            <div className={styles['slot-section']}>
                <Font as="span" variant="caption-1" color="muted">소장품</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">레벨</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">큐브</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
            </div>

            <div className={styles['slot-section']}>
                <Font as="span" variant="caption-1" color="muted">체력</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">공격력</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">방어력</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
            </div>

            <div className={styles['slot-section']}>
                <Font as="span" variant="caption-1" color="muted">우코</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">공격력</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">장탄</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">명중률</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">차댐</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">차속</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">크확</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">크댐</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">방어력</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
            </div>

            <div className={styles['slot-section']}>
                <Font as="span" variant="caption-1" color="muted">스킬1</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">스킬2</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
                <Font as="span" variant="caption-1" color="muted">버스트</Font> <Font as="span" variant="caption-1" color="inactive" className={styles['text-right']}>-</Font>
            </div>
        </div>
    );
};

const CUBE_DROPDOWN_OPTIONS = CUBE_OPTIONS.map(c => ({
    value: c.value,
    label: c.label,
    icon: c.icon ? <img src={c.icon} alt="" className={styles['cube-icon']} /> : undefined,
}));

const CharacterSlot: React.FC<Props> = ({ slot, onUpdate, outpostState }) => {
    if (!slot) return <EmptySlot onUpdate={onUpdate} />;

    const data = slot.char.data;
    const stats = data.stats;
    const fullbody = fullbodyMap[data.characterID];

    const classIcon = CLASS_ICONS[stats.class];
    const companyIcon = COMPANY_ICONS[stats.company];
    const weaponIcon = WEAPON_ICONS[stats.weapon];
    const burstIcon = BURST_ICONS[stats.burstLevel];
    const elementIcon = ELEMENT_ICONS[stats.element];

    const skillsRef = useRef<HTMLDivElement>(null);
    const [skillDescOpen, setSkillDescOpen] = useState<Record<string, boolean>>({});

    const toggleSkillDesc = (id: string) =>
        setSkillDescOpen(prev => ({ ...prev, [id]: !prev[id] }));

    // description_params 또는 인덱스/서브필드 기반으로 스킬 설명의 {N} 플레이스홀더를 레벨에 맞는 값으로 치환
    const renderSkillDescription = (skill: any, level: number): string => {
        const desc: string = skill.description || '';
        const params: any[] = skill.description_params || [];
        const effects: any[] = skill.effects || [];
        if (!desc) return '';

        return desc.replace(/\{(\d+)(?:\.([a-zA-Z0-9_]+))?\}/g, (_match: string, idxStr: string, subField?: string) => {
            const idx = parseInt(idxStr, 10);
            let effect: any = null;
            let field = subField || 'value';
            let val: any = undefined;

            if (params.length > 0 && params[idx]) {
                const p = params[idx];
                if (p.value !== undefined || p.values !== undefined) {
                    val = p.value ?? p.values;
                } else {
                    effect = effects[p.effect];
                    field = p.field || field;
                }
            } else if (effects[idx]) {
                effect = effects[idx];
            }

            if (val === undefined) {
                if (!effect) return _match;
                val = effect[field];
                if (val === undefined || val === null) {
                    if (field === 'values' && effect.value !== undefined) {
                        val = effect.value;
                    } else {
                        return _match;
                    }
                }
            }

            // 1) 배열 (표준 value: number[]) -> level에 해당하는 값 반환 (1-indexed)
            if (Array.isArray(val)) {
                const lvlIdx = Math.min(val.length - 1, Math.max(0, level - 1));
                return String(val[lvlIdx]);
            }

            // 2) 딕셔너리 객체 (values: {"1": ...})
            if (typeof val === 'object' && val !== null) {
                return String(val[String(level)] ?? val['10'] ?? _match);
            }

            // 3) condition / trigger / target 문자열에서 숫자 추출 (예: "enemy_count_above:5" -> "5", "allies_top_atk:2" -> "2")
            if (typeof val === 'string' && (field === 'condition' || field === 'trigger' || field === 'target')) {
                const match = val.match(/:(\d+(\.\d+)?)$/);
                if (match) return match[1];
            }

            return String(val);
        });
    };

    useEffect(() => {
        const preventScroll = (e: WheelEvent) => {
            if (document.activeElement === e.target) {
                e.preventDefault();
            }
        };
        const el = skillsRef.current;
        if (el) {
            el.addEventListener('wheel', preventScroll, { passive: false });
        }
        return () => {
            if (el) el.removeEventListener('wheel', preventScroll);
        };
    }, []);

    // ── 성장 단계 (돌파/코강) ──────────────────────────────────────────
    const charRarity = data.stats.rarity || 'SSR';
    const charCompany = data.stats.company || '';
    const charName = data.characterName || '';
    const maxStage = MAX_STAGE_BY_RARITY[charRarity] ?? 10;
    const currentGrowthStage = Math.min(parseInt(slot.growthStage) || 0, maxStage);

    const { maxAffinity } = resolveGrowthStage(charRarity, charCompany, charName, currentGrowthStage);

    // ── 자동 스탯 계산 ──────────────────────────────────────────────────
    const calculatedStats = useMemo(() => {
        if (!outpostState) return null;
        const charStats = data.stats;
        return calculateBaseStat({
            classType: charStats.class,
            weaponType: charStats.weapon,
            level: outpostState.lockSynchro400 ? 400 : (parseInt(outpostState.synchroLevel) || 1),
            affinityLevel: Math.min(parseInt(slot.affinityLevel) || 1, maxAffinity),
            growthStage: currentGrowthStage,
            rarity: charRarity,
            company: charCompany,
            charName: charName,
            commonConsoleLevel: parseInt(outpostState.commonResearchLevel) || 0,
            classConsoleLevel: getClassConsoleLevel(charStats.class, outpostState),
            corpConsoleLevel: getCorpConsoleLevel(charStats.company, outpostState),
            cubeLevel: parseInt(slot.cubeLevel) || 0,
            equipTierHead: slot.equipTierHead || 'none',
            equipUpgradeHead: parseInt(slot.equipUpgradeHead) || 0,
            equipTierTorso: slot.equipTierTorso || 'none',
            equipUpgradeTorso: parseInt(slot.equipUpgradeTorso) || 0,
            equipTierArms: slot.equipTierArms || 'none',
            equipUpgradeArms: parseInt(slot.equipUpgradeArms) || 0,
            equipTierLegs: slot.equipTierLegs || 'none',
            equipUpgradeLegs: parseInt(slot.equipUpgradeLegs) || 0,
            collectionGrade: slot.collectionGrade || 'None',
            collectionLevel: parseInt(slot.collectionLevel) || 0,
        });
    }, [
        outpostState,
        slot.affinityLevel,
        slot.growthStage,
        slot.cubeLevel,
        slot.equipTierHead, slot.equipUpgradeHead,
        slot.equipTierTorso, slot.equipUpgradeTorso,
        slot.equipTierArms, slot.equipUpgradeArms,
        slot.equipTierLegs, slot.equipUpgradeLegs,
        slot.collectionGrade,
        slot.collectionLevel,
    ]);

    // 계산된 스탯을 customHP/ATK/DEF에 동기화 (시뮬레이션 엔진에서 사용)
    useEffect(() => {
        if (!calculatedStats) return;
        const hp = String(calculatedStats.hp);
        const atk = String(calculatedStats.atk);
        const def = String(calculatedStats.def);
        if (hp !== slot.customHP || atk !== slot.customATK || def !== slot.customDEF) {
            onUpdate({ customHP: hp, customATK: atk, customDEF: def });
        }
    }, [calculatedStats]);

    const handleEquipChange = (field: keyof SlotState, max: number, value: string) => {
        if (value === '' || value === '.') {
            onUpdate({ [field]: value });
            return;
        }
        const num = parseFloat(value);
        if (!isNaN(num) && num > max) {
            onUpdate({ [field]: max.toString() });
            return;
        }
        onUpdate({ [field]: value });
    };

    return (
        <div className={styles['slot-container']}>
            {/* Header Identity + Base Stats */}
            <div
                className={styles['slot-header']}
                style={{ '--fullbody-bg': fullbody ? `url(${fullbody})` : 'none' } as React.CSSProperties}
            >
                <div className={styles['slot-header-identity']}>
                    <Avatar charId={data.characterID} alt={slot.char.label} size={60} ratio="1:1" />
                    <div className={styles['slot-identity']}>
                        <Font as="h3" variant="subtitle" weight="bold">
                            {slot.char.label || data.characterName}
                        </Font>
                    </div>
                    <div className={styles['slot-icons']}>
                        {classIcon && <img src={classIcon} alt={stats.class} className={styles['slot-icon-sm']} />}
                        {companyIcon && <img src={companyIcon} alt={stats.company} className={styles['slot-icon-sm']} />}
                        {weaponIcon && <img src={weaponIcon} alt={stats.weapon} className={styles['slot-icon-sm']} />}
                        {burstIcon && <img src={burstIcon} alt={`Burst ${stats.burstLevel}`} className={styles['slot-icon-sm']} />}
                        {elementIcon && <img src={elementIcon} alt={stats.element} className={styles['slot-icon-sm']} />}
                    </div>
                </div>

                <div className={styles['slot-stats-bar']}>
                    <div className={styles['slot-stat-item']}>
                        <Font as="span" variant="caption-2" color="muted">체력</Font>
                        <Font as="span" variant="caption-1" weight="semibold" className={styles['stat-value']}>
                            {calculatedStats ? calculatedStats.hp.toLocaleString() : formatNumber(slot.customHP)}
                        </Font>
                    </div>
                    <div className={styles['slot-stat-item']}>
                        <Font as="span" variant="caption-2" color="muted">공격력</Font>
                        <Font as="span" variant="caption-1" weight="semibold" className={styles['stat-value']}>
                            {calculatedStats ? calculatedStats.atk.toLocaleString() : formatNumber(slot.customATK)}
                        </Font>
                    </div>
                    <div className={styles['slot-stat-item']}>
                        <Font as="span" variant="caption-2" color="muted">방어력</Font>
                        <Font as="span" variant="caption-1" weight="semibold" className={styles['stat-value']}>
                            {calculatedStats ? calculatedStats.def.toLocaleString() : formatNumber(slot.customDEF)}
                        </Font>
                    </div>
                </div>
            </div>

            {/* 돌파/호감도 & 소장품/레벨 (2열 컴팩트 배치) */}
            <Grid columns={{ xs: 1, sm: 2 }} gap={1}>
                <div className={styles['chip-control-card']}>
                    <div className={styles['chip-row']}>
                        <Font as="span" variant="caption-1" color="muted">돌파</Font>
                        <Chip
                            variant={currentGrowthStage === 0 ? 'default' : currentGrowthStage <= 3 ? 'limit-break' : 'core'}
                            onClick={(e) => {
                                e.preventDefault();
                                const nextStage = currentGrowthStage >= maxStage ? 0 : currentGrowthStage + 1;
                                const newMaxAffinity = resolveGrowthStage(charRarity, charCompany, charName, nextStage).maxAffinity;
                                const currentAffinity = parseInt(slot.affinityLevel) || 1;
                                onUpdate({
                                    growthStage: String(nextStage),
                                    affinityLevel: String(Math.min(currentAffinity, newMaxAffinity))
                                });
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                const prevStage = currentGrowthStage <= 0 ? maxStage : currentGrowthStage - 1;
                                const newMaxAffinity = resolveGrowthStage(charRarity, charCompany, charName, prevStage).maxAffinity;
                                const currentAffinity = parseInt(slot.affinityLevel) || 1;
                                onUpdate({
                                    growthStage: String(prevStage),
                                    affinityLevel: String(Math.min(currentAffinity, newMaxAffinity))
                                });
                            }}
                            title="좌클릭: 단계 증가 / 우클릭: 단계 감소"
                        >
                            {growthStageLabel(currentGrowthStage)}
                        </Chip>
                    </div>
                    <TextField
                        size="small"
                        type="number"
                        min={1}
                        max={maxAffinity}
                        label={<Font variant="caption-2" color="muted">호감도</Font>}
                        value={slot.affinityLevel || '1'}
                        onChange={e => {
                            const v = Math.max(1, Math.min(maxAffinity, parseInt(e.target.value) || 1));
                            onUpdate({ affinityLevel: String(v) });
                        }}
                        suffix={`/ ${maxAffinity}`}
                    />
                </div>

                <div className={styles['chip-control-card']}>
                    <div className={styles['chip-row']}>
                        <Font as="span" variant="caption-1" color="muted">소장품</Font>
                        <Chip
                            variant={
                                slot.collectionGrade === 'SSR'
                                    ? 'core'
                                    : slot.collectionGrade === 'SR'
                                        ? 'limit-break'
                                        : slot.collectionGrade === 'R'
                                            ? 'info'
                                            : 'default'
                            }
                            onClick={() => {
                                const hasTreasure = !!(slot.char.data.stats?.treasure || slot.char.data.favoriteItem);
                                const current = slot.collectionGrade || 'None';
                                let next: 'None' | 'R' | 'SR' | 'SSR' = 'None';

                                if (current === 'None') next = 'R';
                                else if (current === 'R') next = 'SR';
                                else if (current === 'SR') next = hasTreasure ? 'SSR' : 'None';
                                else if (current === 'SSR') next = 'None';

                                let level = slot.collectionLevel || '0';
                                if (next === 'SSR') {
                                    const parsed = parseInt(level, 10);
                                    level = (!parsed || parsed < 1 || parsed > 3) ? '3' : String(parsed);
                                } else if (next === 'SR' && (level === '1' || level === '2' || level === '3') && current === 'SSR') {
                                    level = '15';
                                }
                                onUpdate({ collectionGrade: next, collectionLevel: level });
                            }}
                        >
                            {slot.collectionGrade === 'SSR' ? '애장품' : slot.collectionGrade === 'SR' ? 'SR' : slot.collectionGrade === 'R' ? 'R' : '없음'}
                        </Chip>
                    </div>
                    <TextField
                        size="small"
                        type="number"
                        min={slot.collectionGrade === 'SSR' ? 1 : 0}
                        max={slot.collectionGrade === 'SSR' ? 3 : 15}
                        label={
                            <Font variant="caption-2" color="muted">
                                {slot.collectionGrade === 'SSR' ? '애장품 단계' : '소장품 레벨'}
                            </Font>
                        }
                        value={
                            slot.collectionGrade === 'SSR'
                                ? String(Math.max(1, Math.min(3, parseInt(slot.collectionLevel || '3', 10) || 3)))
                                : (slot.collectionLevel || '0')
                        }
                        onChange={e => {
                            let val = e.target.value;
                            if (slot.collectionGrade === 'SSR') {
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                    val = String(Math.max(1, Math.min(3, num)));
                                }
                            } else {
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                    val = String(Math.max(0, Math.min(15, num)));
                                }
                            }
                            onUpdate({ collectionLevel: val });
                        }}
                        disabled={slot.collectionGrade === 'None' || !slot.collectionGrade}
                    />
                </div>
            </Grid>

            {/* 큐브 & 레벨 */}
            <Grid templateColumns="1fr 120px" gap={1} alignItems="center">
                <Dropdown
                    size="small"
                    label={<Font variant="caption-2" color="muted">큐브</Font>}
                    options={CUBE_DROPDOWN_OPTIONS}
                    value={slot.cubeName || 'None'}
                    onChange={(val) => {
                        const cubeVal = String(val);
                        onUpdate({ cubeName: cubeVal, cubeLevel: cubeVal === 'None' ? '0' : (slot.cubeLevel || '1') });
                    }}
                />
                <TextField
                    size="small"
                    type="number"
                    min={1}
                    max={15}
                    label={<Font variant="caption-2" color="muted">레벨</Font>}
                    value={slot.cubeLevel || '0'}
                    onChange={e => {
                        const val = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                        onUpdate({ cubeLevel: val.toString() });
                    }}
                    disabled={!slot.cubeName || slot.cubeName === 'None'}
                />
            </Grid>

            {/* 장비 4부위 가로 레이아웃 */}
            <div className={styles['section-block']}>
                <Font as="span" variant="caption-1" weight="semibold" color="muted">장비</Font>
                <Grid columns={{ xs: 2, sm: 4 }} gap={1}>
                    {EQUIP_PARTS.map(part => {
                        const tier = String(slot[part.tierKey] || 'none');
                        const showUpgrade = tier === 'Overload' || tier === '기업';
                        return (
                            <div key={String(part.tierKey)} className={styles['equip-item']}>
                                <Font as="span" variant="caption-2" color="muted">{part.label}</Font>
                                <Dropdown
                                    size="small"
                                    options={EQUIP_TIER_OPTIONS}
                                    value={tier}
                                    onChange={val => onUpdate({ [part.tierKey]: String(val) })}
                                />
                                {showUpgrade && (
                                    <TextField
                                        size="small"
                                        type="number"
                                        min={0}
                                        max={5}
                                        label={<Font variant="caption-2" color="muted">강화</Font>}
                                        value={String(slot[part.upgradeKey] || '0')}
                                        onChange={e =>
                                            onUpdate({
                                                [part.upgradeKey]: String(Math.max(0, Math.min(5, parseInt(e.target.value) || 0))),
                                            })
                                        }
                                    />
                                )}
                            </div>
                        );
                    })}
                </Grid>
            </div>

            {/* 오버로드 옵션 */}
            <div className={styles['section-block']}>
                <Font as="span" variant="caption-1" weight="semibold" color="muted">오버로드 옵션</Font>
                <Grid columns={3} gap={1}>
                    {OVERLOAD_OPTION_FIELDS.map(opt => (
                        <TextField
                            key={String(opt.id)}
                            size="small"
                            label={<Font variant="caption-2" color="muted">{opt.label}</Font>}
                            value={String(slot[opt.id] || '0')}
                            onChange={e => handleEquipChange(opt.id, opt.max, e.target.value)}
                            suffix="%"
                        />
                    ))}
                </Grid>
            </div>

            {/* 스킬 레벨 */}
            <div className={styles['section-block']}>
                <Font as="span" variant="caption-1" weight="semibold" color="muted">스킬 레벨</Font>
                <Grid columns={3} gap={1} ref={skillsRef}>
                    {SKILL_LEVEL_FIELDS.map(({ key, label }) => (
                        <TextField
                            key={key}
                            size="small"
                            type="number"
                            min={1}
                            max={10}
                            label={<Font variant="caption-2" color="muted">{label}</Font>}
                            value={slot[key] || 10}
                            onChange={e => onUpdate({ [key]: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                            onWheel={e => {
                                const current = slot[key] || 10;
                                const delta = e.deltaY < 0 ? 1 : -1;
                                onUpdate({ [key]: Math.max(1, Math.min(10, current + delta)) });
                            }}
                        />
                    ))}
                </Grid>
            </div>

            {/* Skill Description Accordion */}
            {(() => {
                const skills: any[] = data.skills || [];
                if (skills.length === 0) return null;
                const levelMap: Record<string, number> = {
                    'skill_1': slot.skill1Level || 10,
                    'skill_2': slot.skill2Level || 10,
                    'burst': slot.burstLevel || 10,
                    '스킬1': slot.skill1Level || 10,
                    '스킬2': slot.skill2Level || 10,
                    '스킬3': slot.burstLevel || 10,
                };
                return (
                    <div className={styles['skill-desc-section']}>
                        {skills.map((skill: any) => {
                            const sid = skill.id || skill.name || '';
                            const isOpen = !!skillDescOpen[sid];
                            const level = levelMap[sid] ?? levelMap['스킬' + (skills.indexOf(skill) + 1)] ?? 10;
                            const descText = renderSkillDescription(skill, level);
                            const hasDesc = !!descText;
                            return (
                                <div key={sid} className={styles['skill-accordion']}>
                                    <button
                                        className={styles['skill-accordion-header']}
                                        onClick={() => toggleSkillDesc(sid)}
                                        aria-expanded={isOpen}
                                    >
                                        <div className={styles['skill-accordion-title']}>
                                            <Font as="span" variant="caption-1" weight="semibold">
                                                {skill.name || sid}
                                            </Font>
                                            <Font as="span" variant="caption-2" color="muted" className={styles['skill-level-badge']}>
                                                Lv.{level}
                                            </Font>
                                        </div>
                                        <Icon
                                            name={isOpen ? 'expand_less' : 'expand_more'}
                                            size={18}
                                            className={styles['skill-accordion-icon']}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className={styles['skill-accordion-body']}>
                                            {hasDesc ? (
                                                <div className={styles['skill-desc-list']}>
                                                    {descText.split('\n').map((line, lineIdx) => {
                                                        const isConditionHeader = line.includes('■');
                                                        return (
                                                            <Font
                                                                key={lineIdx}
                                                                as="p"
                                                                variant="caption-1"
                                                                color="muted"
                                                                className={[
                                                                    styles['skill-desc-text'],
                                                                    !isConditionHeader ? styles['skill-desc-info'] : '',
                                                                ].filter(Boolean).join(' ')}
                                                            >
                                                                {line || '\u00A0'}
                                                            </Font>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <Font as="p" variant="caption-2" color="inactive" className={styles['skill-desc-text']}>
                                                    스킬 설명 없음
                                                </Font>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
};

export default CharacterSlot;
