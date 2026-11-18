/**
 * Node.js 전용 병렬 blablalink CDN 데이터 수집 스크립트
 * 별도의 파이썬 설치 없이 `node scripts/fetchCdnData.js`로 약 3초 만에 전체 수집을 수행합니다.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CDN_BASE = 'https://sg-tools-cdn.blablalink.com';
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291];
const CONCURRENCY = 20;

const CORP_PREFIX_MAP = {
    PILGRIM: 'p',
    ELYSION: 'e',
    MISSILIS: 'm',
    TETRA: 't',
    ABNORMAL: 'a',
};

function nameToSlug(name) {
    return name
        .toLowerCase()
        .replace(/\s*:\s*/g, '_')
        .replace(/\s*\(\s*/g, '_')
        .replace(/\s*\)\s*/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_가-힣]/g, '');
}

function djb2(text, seed) {
    let value = seed | 0;
    for (let i = 0; i < text.length; i++) {
        value = (Math.imul(value, 33) + text.charCodeAt(i)) | 0;
    }
    return value;
}

function dirToken(pathStr, prime) {
    const rawR = djb2(pathStr, prime) % prime;
    const r = ((rawR % prime) + prime) % prime;
    const letters = String.fromCharCode(97 + Math.floor(r / 26) % 26) + String.fromCharCode(97 + (r % 26));
    const numStr = String(r % 99).padStart(2, '0');
    return `${letters}-${numStr}`;
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function obfuscatePath(pathStr) {
    const plain = pathStr.replace(/^\/+/, '');
    const segments = plain.split('/').filter(Boolean);
    const out = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (i === segments.length - 1) {
            const extParts = seg.split('.');
            const ext = extParts.slice(1).join('.');
            out.push(`${md5(plain)}.${ext}`);
        } else {
            out.push(dirToken(plain, LARGE_PRIMES[i]));
        }
    }
    return out.join('/');
}

function getCdnUrl(pathStr) {
    return `${CDN_BASE}/${obfuscatePath(pathStr)}`;
}

async function fetchJson(relPath) {
    const url = getCdnUrl(relPath);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${relPath}`);
    }
    return res.json();
}

async function runPool(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        const chunkResults = await Promise.all(chunk.map(fn));
        results.push(...chunkResults);
    }
    return results;
}

async function main() {
    console.log('[Scraper] blablalink CDN 병렬 수집 시작...');
    const startTime = Date.now();
    try {
        const idMap = await fetchJson('/character/character_id_map.json');
        const uniqueRids = [...new Set(idMap.map(item => item.resource_id))].sort((a, b) => a - b);
        console.log(`[Scraper] 캐릭터 후보 목록 ${idMap.length}개 중 고유 resource_id ${uniqueRids.length}개 발견`);

        const roles = [];
        await runPool(uniqueRids, CONCURRENCY, async (rid) => {
            try {
                const role = await fetchJson(`/roledata/${rid}-v2-ko.json`);
                roles.push(role);
            } catch (err) {
                // skip if roledata does not exist
            }
        });

        // 등급 우선순위 (SSR > SR > R) 및 resource_id 오름차순 정렬 (동명이인 고정)
        const rareOrder = { SSR: 3, SR: 2, R: 1 };
        roles.sort((a, b) => {
            const rDiff = (rareOrder[b.original_rare] || 0) - (rareOrder[a.original_rare] || 0);
            if (rDiff !== 0) return rDiff;
            return (a.resource_id || 0) - (b.resource_id || 0);
        });

        const results = {};
        let successCount = 0;

        for (const role of roles) {
            const rid = role.resource_id;
            const rarity = role.original_rare || 'SSR';
            const baseName = role.name_localkey || `ID_${rid}`;
            let name = baseName;
            if (results[name]) {
                name = `${baseName} (${rarity})`;
                if (results[name]) {
                    name = `${baseName} (${rid})`;
                }
            }

            results[name] = {
                id: rid,
                rarity,
                class: role.class || '',
                company: role.corporation || '',
                squad: role.squad || '',
                burst_stage: role.use_burst_skill || '',
                weapon_detail: role.shot_detail || {},
                raw: {
                    resource_id: role.resource_id,
                    corporation: role.corporation,
                    original_rare: role.original_rare,
                    shot_detail: role.shot_detail,
                    use_burst_skill: role.use_burst_skill,
                    skill1_detail: role.skill1_detail,
                    skill2_detail: role.skill2_detail,
                    ulti_skill_detail: role.ulti_skill_detail,
                    element_details: role.element_details,
                    class: role.class,
                    squad_detail: role.squad_detail
                }
            };
            successCount++;
        }

        const outPath = path.join(ROOT, 'scraper', 'nikke_scraped.json');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');

        // 누락된 아바타 이미지(.webp) 자동 다운로드 (src/character/ JSON 파일명 기준 매칭)
        const avatarDir = path.join(ROOT, 'src', 'assets', 'avatar');
        const charDir = path.join(ROOT, 'src', 'character');
        fs.mkdirSync(avatarDir, { recursive: true });

        const ridToStem = new Map();
        const nameToStem = new Map();
        for (const sub of ['abnormal', 'elysion', 'missilis', 'pilgrim', 'tetra']) {
            const subPath = path.join(charDir, sub);
            if (!fs.existsSync(subPath)) continue;
            for (const f of fs.readdirSync(subPath).filter(x => x.endsWith('.json') && !x.endsWith('_test.json'))) {
                const stem = path.basename(f, '.json');
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(subPath, f), 'utf-8'));
                    const m = (data.characterID || '').match(/^Char_(\d+)$/);
                    if (m) ridToStem.set(Number(m[1]), stem);
                    if (data.characterName) nameToStem.set(`${data.characterName}|${data.stats?.rarity || 'SSR'}`, stem);
                } catch (e) {}
            }
        }

        let avatarCount = 0;
        let avatarSkipped = 0;
        let avatarFailed = 0;
        const forceImages = process.argv.includes('--force-images');

        await runPool(Object.entries(results), CONCURRENCY, async ([name, entry]) => {
            const rarity = entry.rarity || 'SSR';
            const cleanName = name.replace(/\s*\(SR\)$/, '');
            const prefix = CORP_PREFIX_MAP[entry.company] || 'p';
            const defaultStem = `${prefix}_${rarity.toLowerCase()}_${nameToSlug(cleanName)}`;
            const stem = ridToStem.get(entry.id) || nameToStem.get(`${cleanName}|${rarity}`) || defaultStem;
            const avatarPath = path.join(avatarDir, `${stem}.webp`);

            if (forceImages || !fs.existsSync(avatarPath)) {
                try {
                    const ridStr = String(entry.id).padStart(3, '0');
                    const imgUrl = getCdnUrl(`/character/mi/mi_c${ridStr}_00_s.webp`);
                    const res = await fetch(imgUrl);
                    if (res.ok) {
                        const buf = Buffer.from(await res.arrayBuffer());
                        fs.writeFileSync(avatarPath, buf);
                        avatarCount++;
                    } else {
                        avatarFailed++;
                        console.warn(`[Scraper] 아바타 다운로드 실패 (${res.status}): ${name} (rid=${entry.id})`);
                    }
                } catch (e) {
                    avatarFailed++;
                    console.warn(`[Scraper] 아바타 다운로드 오류: ${name} (rid=${entry.id}) - ${e.message}`);
                }
            } else {
                avatarSkipped++;
            }
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Scraper] 수집 완료! 총 ${successCount}명 저장, 아바타 다운로드 ${avatarCount}개 (스킵 ${avatarSkipped}개, 실패 ${avatarFailed}개) (${elapsed}초 소요) -> ${outPath}`);
    } catch (err) {
        console.error('[Scraper] 오류 발생:', err);
    }
}

main();
