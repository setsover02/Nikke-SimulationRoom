import { SlotState } from '../types/simulator';
import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';

const STORAGE_KEY = 'nikke_sim_chars';
const TEAM_LAYOUT_KEY = 'nikke_sim_team_layout';
const CUBE_STORAGE_KEY = 'nikke_sim_cubes';
const OUTPOST_KEY = 'nikke_sim_outpost';

export interface SavedOutpostState {
    synchroLevel: string;
    lockSynchro400?: boolean;
    commonResearchLevel: string;
    elysionConsole: string;
    missilisConsole: string;
    tetraConsole: string;
    pilgrimConsole: string;
    abnormalConsole: string;
    attackerConsole: string;
    defenderConsole: string;
    supporterConsole: string;
}

export type SavedCharState = Omit<SlotState, 'char'> & {
    owned?: boolean;
    limitBreak?: string;
};

export function loadGlobalCubeLevels(): Record<string, string> {
    try {
        const stored = localStorage.getItem(CUBE_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { }
    return {};
}

export function saveGlobalCubeLevel(cubeName: string, level: string) {
    if (!cubeName || cubeName === 'None') return;
    const cubes = loadGlobalCubeLevels();
    cubes[cubeName] = level;
    localStorage.setItem(CUBE_STORAGE_KEY, JSON.stringify(cubes));
}

export function getGlobalCubeLevel(cubeName: string): string {
    if (!cubeName || cubeName === 'None') return '0';
    return loadGlobalCubeLevels()[cubeName] || '0';
}

export function loadOutpostState(): SavedOutpostState {
    const defaultState: SavedOutpostState = {
        synchroLevel: '1',
        lockSynchro400: false,
        commonResearchLevel: '0',
        elysionConsole: '0',
        missilisConsole: '0',
        tetraConsole: '0',
        pilgrimConsole: '0',
        abnormalConsole: '0',
        attackerConsole: '0',
        defenderConsole: '0',
        supporterConsole: '0'
    };
    try {
        const stored = localStorage.getItem(OUTPOST_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                synchroLevel: parsed.synchroLevel || '1',
                lockSynchro400: !!parsed.lockSynchro400,
                commonResearchLevel: parsed.commonResearchLevel || '0',
                elysionConsole: parsed.elysionConsole || '0',
                missilisConsole: parsed.missilisConsole || '0',
                tetraConsole: parsed.tetraConsole || '0',
                pilgrimConsole: parsed.pilgrimConsole || '0',
                abnormalConsole: parsed.abnormalConsole || '0',
                attackerConsole: parsed.attackerConsole || '0',
                defenderConsole: parsed.defenderConsole || '0',
                supporterConsole: parsed.supporterConsole || '0'
            };
        }
    } catch (e) {
        console.error('Failed to load outpost settings from localStorage', e);
    }
    return defaultState;
}

export function saveOutpostState(state: SavedOutpostState) {
    try {
        localStorage.setItem(OUTPOST_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save outpost settings to localStorage', e);
    }
}

export function loadAllCharSettings(): Record<string, SavedCharState> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load character settings from localStorage', e);
    }
    return {};
}

export function saveCharSettings(charId: string, state: SavedCharState) {
    try {
        const allSettings = loadAllCharSettings();
        allSettings[charId] = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
    } catch (e) {
        console.error('Failed to save character settings to localStorage', e);
    }
}

export function getCharDefaultState(charOption: typeof characterOptions[0]): SlotState {
    const charId = charOption.data.characterID;
    const stats = charOption.data.stats;
    const allSettings = loadAllCharSettings();
    const saved = allSettings[charId];

    if (saved) {
        const cubeName = (saved.cubeName && saved.cubeName !== 'None') ? saved.cubeName : '03-cube-resilience';
        const cubeLevel = getGlobalCubeLevel(cubeName) || saved.cubeLevel || '0';

        return {
            char: charOption,
            ...saved,
            cubeName,
            cubeLevel
        };
    }

    return {
        char: charOption,
        customHP: String(stats.hp || ''),
        customATK: String(stats.atk || ''),
        customDEF: String(stats.defense || ''),
        collectionGrade: 'None',
        collectionLevel: '0',
        cubeName: '03-cube-resilience',
        cubeLevel: getGlobalCubeLevel('03-cube-resilience') || '0',
        affinityLevel: '1',
        growthStage: (() => {
            const rarity = charOption.data.stats?.rarity;
            if (rarity === 'R') return '0';
            if (rarity === 'SR') return '2';
            return '3'; // SSR default: 3돌
        })(),
        equipTierHead: 'none',
        equipUpgradeHead: '0',
        equipTierTorso: 'none',
        equipUpgradeTorso: '0',
        equipTierArms: 'none',
        equipUpgradeArms: '0',
        equipTierLegs: 'none',
        equipUpgradeLegs: '0',
        equipATK: '0',
        equipWeakPoint: '0',
        equipAmmo: '0',
        equipAccuracy: '0',
        equipChargeDmg: '0',
        equipChargeSpeed: '0',
        equipCritRate: '0',
        equipCritDmg: '0',
        equipDef: '0',
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10
    };
}

const DEFAULT_FIRST_TEAM: (string | null)[] = [
    characterOptions[0].data.characterID,
    characterOptions[1].data.characterID,
    characterOptions[2].data.characterID,
    characterOptions[3].data.characterID,
    null,
];

const EMPTY_TEAM_IDS: (string | null)[] = [null, null, null, null, null];

function normalizeTeamSlots(raw: unknown): (string | null)[] {
    if (!Array.isArray(raw)) return [...EMPTY_TEAM_IDS];
    const normalized = raw.slice(0, 5).map(id => (typeof id === 'string' ? id : null));
    while (normalized.length < 5) normalized.push(null);
    return normalized;
}

function padTeamsToFive(teams: (string | null)[][]): (string | null)[][] {
    const padded = teams.slice(0, 5).map(normalizeTeamSlots);
    while (padded.length < 5) padded.push([...EMPTY_TEAM_IDS]);
    return padded;
}

export function loadTeamLayouts(): (string | null)[][] {
    try {
        const stored = localStorage.getItem(TEAM_LAYOUT_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // 신규 멀티 스쿼드 형식: (string | null)[][]
                if (Array.isArray(parsed[0])) {
                    return padTeamsToFive(parsed);
                }
                // 기존 단일 스쿼드 형식 호환: (string | null)[]
                return padTeamsToFive([parsed]);
            }
        }
    } catch (e) {
        console.error('Failed to load team layouts', e);
    }
    return padTeamsToFive([[...DEFAULT_FIRST_TEAM]]);
}

export function saveTeamLayouts(teamsIds: (string | null)[][]) {
    try {
        localStorage.setItem(TEAM_LAYOUT_KEY, JSON.stringify(padTeamsToFive(teamsIds)));
    } catch (e) {
        console.error('Failed to save team layouts', e);
    }
}

export function loadTeamLayout(): (string | null)[] {
    return loadTeamLayouts()[0] || [...DEFAULT_FIRST_TEAM];
}

export function saveTeamLayout(teamIds: (string | null)[]) {
    const current = loadTeamLayouts();
    current[0] = normalizeTeamSlots(teamIds);
    saveTeamLayouts(current);
}

// -------------------------
// Target Settings (SimToolbar)
// -------------------------
const TARGET_SETTINGS_KEY = 'nikke_sim_target';

export interface SavedTargetSettings {
    fullBurstInterval: string;
    showCore: boolean;
    coreSize?: number;
    rangeMode: number;
    weaknessElement: string;
    enemyDef: string;
}

const DEFAULT_TARGET_SETTINGS: SavedTargetSettings = {
    fullBurstInterval: '3',
    showCore: true,
    coreSize: 52,
    rangeMode: 35,
    weaknessElement: '풍압',
    enemyDef: '100',
};

export function loadTargetSettings(): SavedTargetSettings {
    try {
        const stored = localStorage.getItem(TARGET_SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_TARGET_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load target settings from localStorage', e);
    }
    return { ...DEFAULT_TARGET_SETTINGS };
}

export function saveTargetSettings(settings: SavedTargetSettings) {
    try {
        localStorage.setItem(TARGET_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save target settings to localStorage', e);
    }
}
