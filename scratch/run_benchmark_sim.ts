import fs from 'fs';
import path from 'path';
import { runSimulation } from '../src/engine/simulationRunner';
import { SlotState, SimulationInput } from '../src/types/simulator';

const rapiData = JSON.parse(fs.readFileSync(path.resolve('src/character/elysion/e_ssr_라피_레드_후드.json'), 'utf8'));
const anisData = JSON.parse(fs.readFileSync(path.resolve('src/character/tetra/t_ssr_아니스_스타.json'), 'utf8'));
const crownData = JSON.parse(fs.readFileSync(path.resolve('src/character/pilgrim/p_ssr_크라운.json'), 'utf8'));
const bridData = JSON.parse(fs.readFileSync(path.resolve('src/character/elysion/e_ssr_브리드_사일런트_트랙.json'), 'utf8'));
const miharaData = JSON.parse(fs.readFileSync(path.resolve('src/character/missilis/m_ssr_미하라_본딩_체인.json'), 'utf8'));

const outpostState: any = {
    synchroLevel: '400',
    lockSynchro400: true,
    commonResearchLevel: '500',
    elysionConsole: '500',
    missilisConsole: '500',
    tetraConsole: '500',
    pilgrimConsole: '500',
    abnormalConsole: '500',
    attackerConsole: '500',
    defenderConsole: '500',
    supporterConsole: '500',
};

function createSupportSlot(charData: any, filename: string, isPilgrim: boolean = false): SlotState {
    return {
        char: {
            value: filename,
            label: charData.characterName,
            data: charData,
        },
        growthStage: '10', // 3돌 + 7코강
        affinityLevel: isPilgrim ? '40' : '30',
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10,
        cubeName: '03-cube-resilience',
        cubeLevel: '15',
        equipTierHead: 'Overload',
        equipUpgradeHead: '5',
        equipTierTorso: 'Overload',
        equipUpgradeTorso: '5',
        equipTierArms: 'Overload',
        equipUpgradeArms: '5',
        equipTierLegs: 'Overload',
        equipUpgradeLegs: '5',
        collectionGrade: 'SR',
        collectionLevel: '15',
        equipATK: '0',
        equipWeakPoint: '0',
        equipAmmo: '0',
        equipAccuracy: '0',
        equipChargeDmg: '0',
        equipChargeSpeed: '0',
        equipCritRate: '0',
        equipCritDmg: '0',
        equipDef: '0',
    };
}

function createTargetSlot(overloadOpts: Record<string, string>): SlotState {
    return {
        char: {
            value: 'e_ssr_라피_레드_후드',
            label: rapiData.characterName,
            data: rapiData,
        },
        growthStage: '10',
        affinityLevel: '30', // Elysion = 30
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10,
        cubeName: '03-cube-resilience',
        cubeLevel: '15',
        equipTierHead: 'Overload',
        equipUpgradeHead: '5',
        equipTierTorso: 'Overload',
        equipUpgradeTorso: '5',
        equipTierArms: 'Overload',
        equipUpgradeArms: '5',
        equipTierLegs: 'Overload',
        equipUpgradeLegs: '5',
        collectionGrade: 'SR',
        collectionLevel: '15',
        equipATK: '0',
        equipWeakPoint: '0',
        equipAmmo: '0',
        equipAccuracy: '0',
        equipChargeDmg: '0',
        equipChargeSpeed: '0',
        equipCritRate: '0',
        equipCritDmg: '0',
        equipDef: '0',
        ...overloadOpts,
    };
}

const variations = [
    {
        name: '우코4 공증4 장탄4',
        tags: ['우코4', '공증4', '장탄4'],
        opts: {
            equipWeakPoint: String(29.16 * 4), // 116.64
            equipATK: String(14.63 * 4),       // 58.52
            equipAmmo: String(85.37 * 4),      // 341.48
        }
    },
    {
        name: '우코4 공증4 장탄3 크댐1',
        tags: ['우코4', '공증4', '장탄3', '크댐1'],
        opts: {
            equipWeakPoint: String(29.16 * 4), // 116.64
            equipATK: String(14.63 * 4),       // 58.52
            equipAmmo: String(85.37 * 3),      // 256.11
            equipCritDmg: String(20.36 * 1),   // 20.36
        }
    },
    {
        name: '우코4 공증4 장탄2 크댐2',
        tags: ['우코4', '공증4', '장탄2', '크댐2'],
        opts: {
            equipWeakPoint: String(29.16 * 4), // 116.64
            equipATK: String(14.63 * 4),       // 58.52
            equipAmmo: String(85.37 * 2),      // 170.74
            equipCritDmg: String(20.36 * 2),   // 40.72
        }
    },
    {
        name: '우코4 공증4 장탄3 차속1',
        tags: ['우코4', '공증4', '장탄3', '차속1'],
        opts: {
            equipWeakPoint: String(29.16 * 4),  // 116.64
            equipATK: String(14.63 * 4),        // 58.52
            equipAmmo: String(85.37 * 3),       // 256.11
            equipChargeSpeed: String(6.09 * 1), // 6.09
        }
    },
    {
        name: '우코4 공증2 크댐2 크확2',
        tags: ['우코4', '공증2', '크댐2', '크확2'],
        opts: {
            equipWeakPoint: String(29.16 * 4), // 116.64
            equipATK: String(14.63 * 2),       // 29.26
            equipCritDmg: String(20.36 * 2),   // 40.72
            equipCritRate: String(7.07 * 2),   // 14.14
        }
    }
];

const results: any[] = [];

for (const v of variations) {
    const slots: SlotState[] = [
        createSupportSlot(anisData, 't_ssr_아니스_스타', false),
        createSupportSlot(crownData, 'p_ssr_크라운', true),
        createTargetSlot(v.opts),
        createSupportSlot(bridData, 'e_ssr_브리드_사일런트_트랙', false),
        createSupportSlot(miharaData, 'm_ssr_미하라_본딩_체인', false),
    ];

    const input: SimulationInput = {
        slots,
        enemyDef: '100',
        fullBurstInterval: '3',
        rangeMode: 35,
        weaknessElement: '철갑',
        showCore: true,
        coreSize: 52,
        outpostState,
    };

    const out = runSimulation(input);
    if (!out) {
        console.error('Sim failed for', v.name);
        continue;
    }

    const rapiChar = out.summary.chars.find(c => c.charName.includes('라피') || c.characterID === 'Char_16');
    const rapiDmg = rapiChar?.totalDmg || 0;
    const teamDmg = out.summary.teamTotal;

    results.push({
        name: v.name,
        tags: v.tags,
        rapiDmg: Math.round(rapiDmg),
        teamDmg: Math.round(teamDmg),
        charDetails: out.summary.chars.map(c => ({
            name: c.charName,
            id: c.characterID || c.charId,
            dmg: Math.round(c.totalDmg)
        }))
    });
}

console.log('=== BENCHMARK SIMULATION RESULTS ===');
console.dir(results, { depth: null });
