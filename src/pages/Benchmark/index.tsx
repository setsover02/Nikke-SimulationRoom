import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card/Card';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { TextField } from '../../components/TextField';
import { ButtonIconToggle } from '../../components/Button/ButtonIconToggle';
import { DataTable, ColumnDef } from '../../components/DataTable';
import { Avatar } from '../../components/Avatar/Avatar';
import { Chip } from '../../components/Chip/Chip';
import { characterOptions, avatarMap } from '../../constants/characters';
import {
    BURST_ICONS,
    ELEMENT_ICONS,
    CLASS_ICONS,
    COMPANY_ICONS,
    WEAPON_ICONS,
} from '../../constants/icons';
import styles from './Benchmark.module.scss';

// Cube webp assets from Vite
const cubeAssetModules = import.meta.glob('../../assets/cube/*.webp', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

function getCubeIcon(cubeKey: string): string | undefined {
    const found = Object.entries(cubeAssetModules).find(([k]) => k.includes(cubeKey));
    return found ? found[1] : undefined;
}

const BURST_OPTIONS = [
    { value: 1, label: 'I', iconName: 'burst-1' },
    { value: 2, label: 'II', iconName: 'burst-2' },
    { value: 3, label: 'III', iconName: 'burst-3' },
    { value: 0, label: 'All', iconName: 'burst-A' },
];

const ELEMENT_OPTIONS = [
    { value: '전격', label: '전격', iconName: 'code-zeus', element: 'electric' as const },
    { value: '풍압', label: '풍압', iconName: 'code-anmi', element: 'wind' as const },
    { value: '수냉', label: '수냉', iconName: 'code-psid', element: 'water' as const },
    { value: '철갑', label: '철갑', iconName: 'code-dmtr', element: 'iron' as const },
    { value: '작열', label: '작열', iconName: 'code-hsta', element: 'fire' as const },
];

function getCharRarity(char: typeof characterOptions[0]): 'SSR' | 'SR' | 'R' {
    const rawRarity = char.data?.stats?.rarity || char.data?.rarity;
    if (rawRarity) {
        const uppercase = String(rawRarity).toUpperCase();
        if (uppercase.includes('SSR')) return 'SSR';
        if (uppercase.includes('SR')) return 'SR';
        if (uppercase.includes('R')) return 'R';
    }
    const val = (char.value || '').toUpperCase();
    if (val.includes('_SSR_') || val.includes('-SSR-') || val.startsWith('E_SSR_') || val.startsWith('T_SSR_') || val.startsWith('M_SSR_') || val.startsWith('P_SSR_') || val.startsWith('A_SSR_')) return 'SSR';
    if (val.includes('_SR_') || val.includes('-SR-') || val.startsWith('E_SR_') || val.startsWith('T_SR_') || val.startsWith('M_SR_') || val.startsWith('P_SR_') || val.startsWith('A_SR_')) return 'SR';
    if (val.includes('_R_') || val.includes('-R-') || val.startsWith('E_R_') || val.startsWith('T_R_') || val.startsWith('M_R_') || val.startsWith('P_R_') || val.startsWith('A_R_')) return 'R';

    return 'SSR';
}

// Benchmark JSON results from src/data/benchmark/*.json
const benchmarkModules = import.meta.glob('../../data/benchmark/*.json', {
    eager: true,
    import: 'default',
}) as Record<string, any>;

interface SquadMember {
    id: string;
    name: string;
    isTarget?: boolean;
}

interface BenchmarkRecord {
    id: string;
    rank: number;
    squad: SquadMember[];
    cube: {
        id: string;
        name: string;
        icon?: string;
    };
    overloadTags: string[];
    damage: number;
    percentage: number;
    dps: number;
    teamDamage?: number;
    details?: Array<{
        id: string;
        name: string;
        damage: number;
    }>;
}

interface BenchmarkFileContent {
    characterId: string;
    characterKey: string;
    characterName: string;
    generatedAt: string;
    conditions: {
        battleDuration: number;
        target: string;
        weaknessElement: string;
        control: string;
        synchroLevel: number;
        consoleLevel: number;
        growthStage: string;
        skills: string;
        equipment: string;
        collection: string;
        cubeLevel: number;
    };
    records: BenchmarkRecord[];
}

// Helper: 오버로드 태그별 색상 클래스
function getOverloadTagClass(tag: string): string {
    if (tag.startsWith('우코') || tag.includes('우월')) return styles['tag-element'];
    if (tag.startsWith('공증') || tag.includes('공격')) return styles['tag-atk'];
    if (tag.startsWith('장탄') || tag.includes('탄')) return styles['tag-ammo'];
    if (tag.startsWith('크댐') || tag.startsWith('크확') || tag.includes('크리')) return styles['tag-crit'];
    if (tag.startsWith('차속') || tag.startsWith('차댐') || tag.includes('차지')) return styles['tag-charge'];
    return '';
}

export const BenchmarkPage: React.FC = () => {
    // 1. Build benchmark map indexed by characterId, characterKey, and characterName
    const benchmarkMap = useMemo(() => {
        const map: Record<string, BenchmarkFileContent> = {};
        for (const path in benchmarkModules) {
            const data = benchmarkModules[path] as BenchmarkFileContent;
            if (!data) continue;
            if (data.characterId) map[data.characterId] = data;
            if (data.characterKey) map[data.characterKey] = data;
            if (data.characterName) map[data.characterName] = data;
        }
        return map;
    }, []);

    // 2. Filter characters to ONLY those with simulated benchmark data
    const benchmarkCharacters = useMemo(() => {
        return characterOptions.filter(char => {
            const charID = char.data?.characterID;
            const charKey = char.value;
            const charName = char.label || char.data?.characterName;
            return Boolean(
                (charID && benchmarkMap[charID]) ||
                (charKey && benchmarkMap[charKey]) ||
                (charName && benchmarkMap[charName])
            );
        });
    }, [benchmarkMap]);

    // 3. Search and Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBursts, setSelectedBursts] = useState<number[]>([]);
    const [selectedElements, setSelectedElements] = useState<string[]>([]);

    // 4. Selected Target Nikke (기본값: 라피 : 레드 후드 or 첫 번째 벤치마크 캐릭터)
    const [selectedCharId, setSelectedCharId] = useState<string>(() => {
        const defaultChar = characterOptions.find(
            c => c.label === '라피 : 레드 후드' || c.data?.characterID === 'Char_16'
        );
        return defaultChar?.data?.characterID || defaultChar?.value || '';
    });

    const handleToggleBurst = (burst: number) => {
        setSelectedBursts(prev =>
            prev.includes(burst) ? prev.filter(b => b !== burst) : [...prev, burst]
        );
    };

    const handleToggleElement = (elementName: string) => {
        setSelectedElements(prev =>
            prev.includes(elementName) ? prev.filter(e => e !== elementName) : [...prev, elementName]
        );
    };

    // Filter characters for top selector (only among benchmarkCharacters)
    const filteredCharacters = useMemo(() => {
        return benchmarkCharacters.filter(char => {
            const stats = char.data?.stats || {};
            const charName = char.label || char.data?.characterName || '';
            const charID = char.data?.characterID || '';

            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const matchName = charName.toLowerCase().includes(query);
                const matchID = charID.toLowerCase().includes(query);
                if (!matchName && !matchID) return false;
            }

            if (selectedBursts.length > 0) {
                const burst = Number(stats.burst);
                if (!selectedBursts.includes(burst)) return false;
            }

            if (selectedElements.length > 0) {
                const element = stats.element || stats.code;
                if (!element || !selectedElements.includes(element)) return false;
            }

            return true;
        });
    }, [benchmarkCharacters, searchQuery, selectedBursts, selectedElements]);

    // Group filtered characters by rarity
    const groupedCharacters = useMemo(() => {
        const ssr: typeof characterOptions = [];
        const sr: typeof characterOptions = [];
        const r: typeof characterOptions = [];

        filteredCharacters.forEach(char => {
            const rarity = getCharRarity(char);
            if (rarity === 'SSR') ssr.push(char);
            else if (rarity === 'SR') sr.push(char);
            else r.push(char);
        });

        return [
            { rarity: 'SSR', list: ssr },
            { rarity: 'SR', list: sr },
            { rarity: 'R', list: r },
        ].filter(group => group.list.length > 0);
    }, [filteredCharacters]);

    // Active selected character object
    const selectedChar = useMemo(() => {
        return (
            benchmarkCharacters.find(
                c => c.data?.characterID === selectedCharId || c.value === selectedCharId
            ) ||
            benchmarkCharacters[0] ||
            null
        );
    }, [benchmarkCharacters, selectedCharId]);

    // Active benchmark data file
    const activeBenchmarkData = useMemo(() => {
        if (!selectedChar) return null;
        const charID = selectedChar.data?.characterID;
        const charKey = selectedChar.value;
        const charName = selectedChar.label || selectedChar.data?.characterName;
        return (charID && benchmarkMap[charID]) || (charKey && benchmarkMap[charKey]) || (charName && benchmarkMap[charName]) || null;
    }, [selectedChar, benchmarkMap]);

    // Benchmark records with cube icons resolved
    const benchmarkData = useMemo<BenchmarkRecord[]>(() => {
        if (!activeBenchmarkData || !activeBenchmarkData.records) return [];
        return activeBenchmarkData.records.map(rec => ({
            ...rec,
            cube: {
                ...rec.cube,
                icon: getCubeIcon(rec.cube.id),
            },
        }));
    }, [activeBenchmarkData]);

    // 기준 니케 스탯 데이터
    const targetStats = useMemo(() => {
        const stats = selectedChar?.data?.stats || {};
        const charID = selectedChar?.data?.characterID;
        const charName = selectedChar?.label || selectedChar?.data?.characterName || '';
        const avatarUrl = charID ? (avatarMap[charID] || null) : null;
        return {
            avatarUrl,
            charName,
            element: stats.element || '',
            charClass: stats.class || '',
            burstLevel: stats.burstLevel,
            weapon: stats.weapon || '',
            company: stats.company || '',
        };
    }, [selectedChar]);

    // DataTable columns definition (Nikke 페이지 테이블 스타일 기반)
    const columns = useMemo<ColumnDef<BenchmarkRecord>[]>(() => [
        {
            id: 'squad',
            header: <Font variant="caption-1" weight="semibold">스쿼드 조합 (180s)</Font>,
            width: '160px',
            cell: (row) => {
                const targetMember = row.squad.find(m => m.isTarget) || row.squad[0];
                const supportMembers = row.squad.filter(m => m !== targetMember);
                const targetAvatarUrl = avatarMap[targetMember.id] || avatarMap[targetMember.name];

                return (
                    <div className={styles['squad-cell']}>
                        {/* 기준 니케 (강조 단독 표시) */}
                        <div
                            className={styles['squad-thumb']}
                            title={`${targetMember.name} (기준 니케)`}
                        >
                            {targetAvatarUrl ? (
                                <img src={targetAvatarUrl} alt={targetMember.name} />
                            ) : (
                                <Avatar charId={targetMember.id} alt={targetMember.name} ratio="1:1" />
                            )}
                        </div>

                        {/* 구분용 미세 디바이더 */}
                        <div className={styles['squad-divider']} />

                        {/* 나머지 4인 (살짝 겹친 아바타 스택) */}
                        <div className={styles['support-stack']}>
                            {supportMembers.map((member, idx) => {
                                const avatarUrl = avatarMap[member.id] || avatarMap[member.name];
                                return (
                                    <div
                                        key={`${member.id}-${idx}`}
                                        className={styles['support-thumb']}
                                        title={member.name}
                                    >
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={member.name} />
                                        ) : (
                                            <Avatar charId={member.id} alt={member.name} ratio="1:1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'cube',
            header: <Font variant="caption-1" weight="semibold">큐브</Font>,
            width: '100px',
            cell: (row) => (
                <Grid templateColumns="auto 1fr" alignItems="center" gap={1}>
                    {row.cube.icon && (
                        <img src={row.cube.icon} alt={row.cube.name} className={styles['cube-thumb']} />
                    )}
                    <Font variant="body" weight="medium">
                        {row.cube.name}
                    </Font>
                </Grid>
            ),
        },
        {
            id: 'overload',
            header: <Font variant="caption-1" weight="semibold">오버로드 옵션</Font>,
            width: '190px',
            cell: (row) => (
                <Grid templateColumns="repeat(4, auto)" alignItems="center" gap={1} justifyContent="start">
                    {row.overloadTags.map((tag, idx) => (
                        <Chip
                            key={idx}
                            variant="non-selectable"
                            size="small"
                            className={getOverloadTagClass(tag)}
                        >
                            {tag}
                        </Chip>
                    ))}
                </Grid>
            ),
        },
        {
            id: 'damage',
            header: <Font variant="caption-1" weight="semibold">최종 대미지 (고점 대비 %)</Font>,
            cell: (row) => {
                const isTop = row.rank === 1;
                return (
                    <Grid columns={1} gap={1} className={styles['damage-cell']}>
                        <Grid templateColumns="1fr auto" alignItems="center">
                            <Font variant="caption-2" weight="bold">
                                {row.damage.toLocaleString()}
                            </Font>
                            <Font variant="caption-2" weight="bold" color={isTop ? 'default' : 'muted'}>
                                {row.percentage.toFixed(1)}%
                            </Font>
                        </Grid>
                        <div className={styles['bar-chart-track']}>
                            <div
                                className={`${styles['bar-chart-fill']} ${isTop ? styles['top-bar'] : ''}`}
                                style={{ '--progress-percent': `${row.percentage}%` } as React.CSSProperties}
                            />
                        </div>
                    </Grid>
                );
            },
        },
    ], []);

    return (
        <Grid columns={1} gap={3} className="pb-4">
            {/* Page Header */}
            <Grid columns={1}>
                <Font variant="heading-3" weight="medium" as="h1">Benchmark</Font>
            </Grid>

            {/* 2-Column Grid: Left (검색 필터 카드 - Sticky), Right (고점 세팅 랭킹 테이블) */}
            <Grid columns={{ xs: '1fr', lg: '320px 1fr' }} alignItems="start">
                {/* 1. 니케 검색 카드 (홈 화면 CharacterSelectionPanel과 동일 배치, 좌측 스티키) */}
                <Card as="section" className={styles['filter-card']}>
                    <Grid columns={1} gap={2} className="pa-2">
                        {/* Search Bar */}
                        <Grid columns={1}>
                            <TextField
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="니케 검색"
                                leftIcon="search"
                                onClear={() => setSearchQuery('')}
                                align="left"
                                size="default"
                            />
                        </Grid>

                        {/* Filter Buttons Row (Burst & Element) */}
                        <Grid columns="repeat(auto-fill, minmax(32px, 1fr))" alignItems="center" gap={1}>
                            {BURST_OPTIONS.map(opt => (
                                <ButtonIconToggle
                                    key={opt.value}
                                    svgIcon={opt.iconName}
                                    selected={selectedBursts.includes(opt.value)}
                                    onClick={() => handleToggleBurst(opt.value)}
                                    size="small"
                                    title={`버스트 ${opt.label}`}
                                />
                            ))}

                            <div className={styles['filter-divider']} />

                            {ELEMENT_OPTIONS.map(opt => (
                                <ButtonIconToggle
                                    key={opt.value}
                                    svgIcon={opt.iconName}
                                    element={opt.element}
                                    selected={selectedElements.includes(opt.value)}
                                    onClick={() => handleToggleElement(opt.value)}
                                    size="small"
                                    title={opt.label}
                                />
                            ))}
                        </Grid>

                        {/* Avatar Grid grouped by Rarity (SSR -> SR -> R) */}
                        {groupedCharacters.length > 0 ? (
                            <div className={styles['avatar-grid-wrapper']}>
                                {groupedCharacters.map(group => (
                                    <Grid key={group.rarity} columns={1} gap={1} className="mb-2">
                                        <Grid templateColumns="auto auto" alignItems="center" gap={1} justifyContent="start">
                                            <Font as="span" variant="caption-1" weight="bold">
                                                {group.rarity}
                                            </Font>
                                            <Font as="span" variant="caption-2" color="muted">
                                                ({group.list.length})
                                            </Font>
                                        </Grid>

                                        <Grid templateColumns="repeat(4, 1fr)" gap={1}>
                                            {group.list.map(char => {
                                                const charID = char.data?.characterID;
                                                const stats = char.data?.stats || {};
                                                const rawBurst = stats.burstLevel;
                                                const burstLevel = rawBurst;
                                                const elementStr = stats.element || '';

                                                const elemIconUrl = ELEMENT_ICONS[elementStr];
                                                const burstIconUrl = (rawBurst === 'A' || rawBurst === 'All' || rawBurst === 'all' || rawBurst === 0 || rawBurst === '0')
                                                    ? BURST_ICONS[0]
                                                    : BURST_ICONS[rawBurst];

                                                const isSelected = charID === selectedCharId || char.value === selectedCharId;

                                                return (
                                                    <div
                                                        key={char.value || charID}
                                                        className={`${styles['avatar-card']} ${isSelected ? styles.selected : ''}`}
                                                        onClick={() => setSelectedCharId(charID || char.value)}
                                                        title={`${char.label} (${elementStr}, Burst ${burstLevel})`}
                                                    >
                                                        <Avatar
                                                            charId={charID}
                                                            alt={char.label}
                                                            ratio="1:1"
                                                            className={styles['avatar-image']}
                                                        >
                                                            {char.label.substring(0, 2)}
                                                        </Avatar>

                                                        {/* Overlay Badges: Top Left (Element), Top Right (Burst) */}
                                                        <div className={styles['badge-container']}>
                                                            {elemIconUrl && (
                                                                <div className={styles['badge-item']}>
                                                                    <img src={elemIconUrl} alt={elementStr} className={styles['badge-icon']} />
                                                                </div>
                                                            )}
                                                            {burstIconUrl && (
                                                                <div className={styles['badge-item']}>
                                                                    <img src={burstIconUrl} alt={`Burst ${burstLevel}`} className={styles['badge-icon']} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </Grid>
                                    </Grid>
                                ))}
                            </div>
                        ) : (
                            <Grid columns={1} alignItems="center" justifyContent="center" className="pa-4">
                                <Font variant="caption-1" color="inactive">
                                    {searchQuery || selectedBursts.length > 0 || selectedElements.length > 0
                                        ? '검색 조건에 맞는 니케가 없습니다.'
                                        : '시뮬레이션된 고점 데이터가 있는 니케가 없습니다.'}
                                </Font>
                            </Grid>
                        )}
                    </Grid>
                </Card>

                {/* 2. 고점 비교 테이블 (Nikke 페이지 테이블 스타일 기반 + Bar Chart) */}
                <Card as="section" className={styles['table-card']}>
                    <div className={styles['target-header']}>
                        {/* 아바타 */}
                        <div className={styles['target-avatar']}>
                            {targetStats.avatarUrl ? (
                                <img src={targetStats.avatarUrl} alt={targetStats.charName} />
                            ) : (
                                <Avatar charId={selectedChar?.data?.characterID} alt={targetStats.charName} ratio="1:1" />
                            )}
                        </div>

                        {/* 정보 블록 */}
                        <div className={styles['target-info']}>
                            <Font variant="subtitle" weight="bold" as="div">
                                {targetStats.charName}
                            </Font>
                            <div className={styles['target-meta']}>
                                {/* 속성 아이콘 */}
                                {ELEMENT_ICONS[targetStats.element] && (
                                    <div className={styles['meta-icon']} title={targetStats.element}>
                                        <img src={ELEMENT_ICONS[targetStats.element]} alt={targetStats.element} />
                                    </div>
                                )}
                                {/* 클래스 아이콘 */}
                                {CLASS_ICONS[targetStats.charClass] && (
                                    <div className={styles['meta-icon']} title={targetStats.charClass}>
                                        <img src={CLASS_ICONS[targetStats.charClass]} alt={targetStats.charClass} />
                                    </div>
                                )}
                                {/* 버스트 아이콘 */}
                                {BURST_ICONS[targetStats.burstLevel] && (
                                    <div className={styles['meta-icon']} title={`버스트 ${targetStats.burstLevel}`}>
                                        <img src={BURST_ICONS[targetStats.burstLevel]} alt={`Burst ${targetStats.burstLevel}`} />
                                    </div>
                                )}
                                {/* 구분선 */}
                                <div className={styles['meta-divider']} />
                                {/* 무기 아이콘 */}
                                {WEAPON_ICONS[targetStats.weapon] && (
                                    <div className={styles['meta-icon']} title={targetStats.weapon}>
                                        <img src={WEAPON_ICONS[targetStats.weapon]} alt={targetStats.weapon} />
                                    </div>
                                )}
                                {/* 무기 이름 */}
                                {targetStats.weapon && (
                                    <Font variant="caption-1" weight="medium" color="muted">
                                        {targetStats.weapon}
                                    </Font>
                                )}
                                {/* 구분선 */}
                                <div className={styles['meta-divider']} />
                                {/* 기업 아이콘 */}
                                {COMPANY_ICONS[targetStats.company] && (
                                    <div className={styles['meta-icon']} title={targetStats.company}>
                                        <img src={COMPANY_ICONS[targetStats.company]} alt={targetStats.company} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DataTable
                        data={benchmarkData}
                        columns={columns}
                        keyExtractor={(row) => row.id}
                    />
                </Card>
            </Grid>
        </Grid>
    );
};

export default BenchmarkPage;
