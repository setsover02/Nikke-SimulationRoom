import fs from 'fs';
import path from 'path';
import { runSimulation } from '../src/engine/simulationRunner';
import { SlotState, SimulationInput } from '../src/types/simulator';

interface BenchmarkOutputSquadMember {
    id: string;
    name: string;
    isTarget?: boolean;
}

interface BenchmarkStats {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
    min: number;
    max: number;
    samples: number;
}

interface BenchmarkOutputRecord {
    id: string;
    rank: number;
    squad: BenchmarkOutputSquadMember[];
    cube: {
        id: string;
        name: string;
    };
    overloadTags: string[];
    damage: number;       // p50 (median)
    percentage: number;   // p50 기준 정규화
    dps: number;
    teamDamage: number;
    stats: BenchmarkStats;
    details: Array<{
        id: string;
        name: string;
        damage: number;
    }>;
}

interface BenchmarkOutputFile {
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
        samplesPerVariation: number;
    };
    records: BenchmarkOutputRecord[];
}

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
        growthStage: '10',
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

function createTargetSlot(charData: any, filename: string, overloadOpts: Record<string, string>, isPilgrim: boolean = false): SlotState {
    return {
        char: {
            value: filename,
            label: charData.characterName,
            data: charData,
        },
        growthStage: '10',
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
        ...overloadOpts,
    };
}

function calcPercentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

export function runRapiRedHoodBenchmark() {
    const SAMPLES = 30;

    const rapiData = JSON.parse(fs.readFileSync(path.resolve('src/character/elysion/e_ssr_라피_레드_후드.json'), 'utf8'));
    const anisData = JSON.parse(fs.readFileSync(path.resolve('src/character/tetra/t_ssr_아니스_스타.json'), 'utf8'));
    const crownData = JSON.parse(fs.readFileSync(path.resolve('src/character/pilgrim/p_ssr_크라운.json'), 'utf8'));
    const bridData = JSON.parse(fs.readFileSync(path.resolve('src/character/elysion/e_ssr_브리드_사일런트_트랙.json'), 'utf8'));
    const miharaData = JSON.parse(fs.readFileSync(path.resolve('src/character/missilis/m_ssr_미하라_본딩_체인.json'), 'utf8'));

    const variations = [
        {
            name: '우코4 공증4 장탄4',
            tags: ['우코4', '공증4', '장탄4'],
            opts: {
                equipWeakPoint: String(29.16 * 4),
                equipATK: String(14.63 * 4),
                equipAmmo: String(85.37 * 4),
            }
        },
        {
            name: '우코4 공증4 장탄3 크댐1',
            tags: ['우코4', '공증4', '장탄3', '크댐1'],
            opts: {
                equipWeakPoint: String(29.16 * 4),
                equipATK: String(14.63 * 4),
                equipAmmo: String(85.37 * 3),
                equipCritDmg: String(20.36 * 1),
            }
        },
        {
            name: '우코4 공증4 장탄3 차속1',
            tags: ['우코4', '공증4', '장탄3', '차속1'],
            opts: {
                equipWeakPoint: String(29.16 * 4),
                equipATK: String(14.63 * 4),
                equipAmmo: String(85.37 * 3),
                equipChargeSpeed: String(6.09 * 1),
            }
        },
        {
            name: '우코4 공증4 장탄2 크댐2',
            tags: ['우코4', '공증4', '장탄2', '크댐2'],
            opts: {
                equipWeakPoint: String(29.16 * 4),
                equipATK: String(14.63 * 4),
                equipAmmo: String(85.37 * 2),
                equipCritDmg: String(20.36 * 2),
            }
        },
        {
            name: '우코4 공증2 크댐2 크확2',
            tags: ['우코4', '공증2', '크댐2', '크확2'],
            opts: {
                equipWeakPoint: String(29.16 * 4),
                equipATK: String(14.63 * 2),
                equipCritDmg: String(20.36 * 2),
                equipCritRate: String(7.07 * 2),
            }
        }
    ];

    const rawSimRecords: any[] = [];

    for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        console.log(`[${i + 1}/${variations.length}] Simulating "${v.name}" x${SAMPLES}...`);

        const samples: number[] = [];
        let lastDetails: any[] = [];
        let lastTeamDamage = 0;

        for (let s = 0; s < SAMPLES; s++) {
            const slots: SlotState[] = [
                createSupportSlot(anisData, 't_ssr_아니스_스타', false),
                createSupportSlot(crownData, 'p_ssr_크라운', true),
                createTargetSlot(rapiData, 'e_ssr_라피_레드_후드', v.opts, false),
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
            if (!out) continue;

            const rapiChar = out.summary.chars.find((c: any) => c.characterID === 'Char_16' || c.charName.includes('라피'));
            const rapiDmg = Math.round(rapiChar?.totalDmg || 0);
            samples.push(rapiDmg);
            lastTeamDamage = Math.round(out.summary.teamTotal || 0);
            lastDetails = out.summary.chars.map((c: any) => ({
                id: c.characterID || c.charId,
                name: c.charName,
                damage: Math.round(c.totalDmg),
            }));
        }

        samples.sort((a, b) => a - b);

        const p10 = calcPercentile(samples, 10);
        const p50 = calcPercentile(samples, 50);
        const p90 = calcPercentile(samples, 90);
        const mean = samples.length > 0 ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : 0;

        console.log(`  P10=${p10.toLocaleString()}, P50=${p50.toLocaleString()}, P90=${p90.toLocaleString()}`);

        rawSimRecords.push({
            idSuffix: i + 1,
            name: v.name,
            tags: v.tags,
            damage: p50,
            dps: Math.round(p50 / 180),
            teamDamage: lastTeamDamage,
            squad: [
                { id: 'Char_17', name: '아니스 : 스타' },
                { id: 'Crown', name: '크라운' },
                { id: 'Char_16', name: '라피 : 레드 후드', isTarget: true },
                { id: 'Char_73', name: '브리드 : 사일런트 트랙' },
                { id: 'MiharaBondingChain', name: '미하라 : 본딩 체인' },
            ],
            cube: {
                id: '03-cube-resilience',
                name: '렐릭 베어',
            },
            stats: { p10, p50, p90, mean, min: samples[0] || 0, max: samples[samples.length - 1] || 0, samples: samples.length },
            details: lastDetails,
        });
    }

    rawSimRecords.sort((a, b) => b.damage - a.damage);
    const topDmg = rawSimRecords[0]?.damage || 1;

    const records: BenchmarkOutputRecord[] = rawSimRecords.map((r, index) => ({
        id: `rapi-rh-${index + 1}`,
        rank: index + 1,
        squad: r.squad,
        cube: r.cube,
        overloadTags: r.tags,
        damage: r.damage,
        percentage: Number(((r.damage / topDmg) * 100).toFixed(1)),
        dps: r.dps,
        teamDamage: r.teamDamage,
        stats: r.stats,
        details: r.details,
    }));

    const output: BenchmarkOutputFile = {
        characterId: 'Char_16',
        characterKey: 'e_ssr_라피_레드_후드',
        characterName: '라피 : 레드 후드',
        generatedAt: new Date().toISOString(),
        conditions: {
            battleDuration: 180,
            target: '단일 보스',
            weaknessElement: '철갑',
            control: '자동',
            synchroLevel: 400,
            consoleLevel: 500,
            growthStage: '10 (3돌 + 7코강)',
            skills: '10/10/10',
            equipment: 'Overload 5 (4부위)',
            collection: 'SR 15',
            cubeLevel: 15,
            samplesPerVariation: SAMPLES,
        },
        records,
    };

    const outDir = path.resolve('src/data/benchmark');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'e_ssr_라피_레드_후드.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\nSaved to ${outPath}`);
    records.forEach(r => {
        console.log(`Rank ${r.rank}: [${r.overloadTags.join(', ')}] P50=${r.damage.toLocaleString()} (${r.percentage}%) P10=${r.stats.p10.toLocaleString()} P90=${r.stats.p90.toLocaleString()}`);
    });
}

runRapiRedHoodBenchmark();

