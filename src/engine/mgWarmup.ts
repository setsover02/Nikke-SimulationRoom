// engine/mgWarmup.ts
// MG 무기 예열(WarmUp) 시스템 — CDN shot_detail 실측 기반 (context/character/MG 예열.md)
//
// 메카닉 요약:
//   - 최소 발사속도: 1/s (60 rpm)
//   - 최대 발사속도: 70/s (4200 rpm, 게임 60fps로 인해 실효 상한 60/s)
//   - 예열 완료 발수: 41.4발 ((4200 - 60) / 100)
//     * 35.4발째에 이미 실효 상한 60/s 도달, 41.4발까지 표기상 상승
//   - 예열 진행: 발사 1발당 1 * max(0, 1 + mg_warmup_speed_pct / 100) 증가
//   - 예열 냉각: 사격 중지 구간(재장전, 기절, idle) 동안 초당 41.4발 시간 비례 냉각 (cooldown 1.0s)
//     * 정상 연사 간격은 냉각 대상 아님
//     * 재장전 시 즉시 리셋되지 않고 시간만큼만 냉각

/* =========================
   CDN 정본 상수 (context/character/MG 예열.md)
========================= */

/** MG 최소 발사 속도 (1/s, CDN rate_of_fire 60rpm) */
export const MG_FIRE_RATE_MIN = 1.0;

/** MG 최대 표기 발사 속도 (70/s, CDN end_rate_of_fire 4200rpm) */
export const MG_FIRE_RATE_MAX = 70.0;

/** MG 실효 최대 발사 속도 상한 (60/s, 게임 60fps 프레임당 1발 상한) */
export const MG_EFFECTIVE_FIRE_RATE_CAP = 60.0;

/** 예열 완료까지 필요한 총 발수 (41.4발 = (4200 - 60) / rate_of_fire_change_pershot(100)) */
export const MG_WARMUP_BULLETS = 41.4;

/** 완전 냉각까지 걸리는 시간 (1.0초, CDN rate_of_fire_reset_time 100) */
export const MG_COOLDOWN_TIME = 1.0;

/** 초당 냉각 발수 (41.4발/s = MG_WARMUP_BULLETS / MG_COOLDOWN_TIME) */
export const MG_COOL_RATE = 41.4;

/* =========================
   WarmUp 발수 업데이트
========================= */

/**
 * 사격 시: 발사한 탄환 수만큼 예열 발수 증가.
 * mg_warmup_speed_pct 버프가 있는 경우 (1 + pct / 100) 배율 적용.
 * (-100% 시 0배 = 예열 정지, +100% 시 2배 가속)
 *
 * @param currentShots  현재 예열 누적 발수 (0 ~ 41.4)
 * @param shotsFired    이번 틱에 발사된 탄환 수
 * @param warmupSpeedPct mg_warmup_speed_pct 버프 합산치 (%)
 */
export function heatWarmupShots(
    currentShots: number,
    shotsFired: number,
    warmupSpeedPct: number = 0
): number {
    if (shotsFired <= 0) return currentShots;
    const multiplier = Math.max(0, 1 + warmupSpeedPct / 100);
    return Math.min(MG_WARMUP_BULLETS, currentShots + shotsFired * multiplier);
}

/**
 * 사격 중지 시(재장전, 기절, 딜레이): 시간 비례 점진 냉각.
 * 1.0초에 걸쳐 warmupShots 41.4 → 0.
 * 부분 냉각 지원: 미사격 시간만큼만 감소.
 *
 * @param currentShots 현재 예열 누적 발수 (0 ~ 41.4)
 * @param dt           경과 시간 (초)
 * @param coolRate     초당 냉각 발수 (기본 41.4발/s)
 */
export function coolWarmupShots(
    currentShots: number,
    dt: number,
    coolRate: number = MG_COOL_RATE
): number {
    if (dt <= 0 || currentShots <= 0) return currentShots;
    return Math.max(0, currentShots - dt * coolRate);
}

/**
 * 누적 발수로부터 0~1 범위의 예열 레벨 계산
 */
export function getMgWarmupLevel(warmupShots: number): number {
    return Math.min(1, Math.max(0, warmupShots / MG_WARMUP_BULLETS));
}

/* =========================
   Fire Rate 계산
========================= */

/**
 * warmupShots에 따른 실효 발사 속도 반환.
 * 선형 공식: min + (max - min) * min(warmupShots, 41.4) / 41.4
 * attack_speed_pct 버프가 있으면 곱연산 적용 후 실효 상한(60/s)으로 캡.
 *
 * @param warmupShots    현재 예열 누적 발수 (0 ~ 41.4)
 * @param attackSpeedPct 공격 속도 증가 버프 (%)
 */
export function getMgFireRate(warmupShots: number, attackSpeedPct: number = 0): number {
    const progress = Math.min(1.0, Math.max(0.0, warmupShots / MG_WARMUP_BULLETS));
    const nominalRate = MG_FIRE_RATE_MIN + (MG_FIRE_RATE_MAX - MG_FIRE_RATE_MIN) * progress;
    const rateWithBuff = nominalRate * (1 + (attackSpeedPct || 0) / 100);
    return Math.min(MG_EFFECTIVE_FIRE_RATE_CAP, rateWithBuff);
}

/* =========================
   하위 호환 유지 (deprecated)
========================= */

/** @deprecated MG_COOLDOWN_TIME (1.0s) 사용 권장 */
export const COOLDOWN_DURATION_SECS = MG_COOLDOWN_TIME;

/** @deprecated MG_WARMUP_BULLETS (41.4) 사용 권장 */
export const WARMUP_DURATION_SECS = 1.0;

/** @deprecated MG_WARMUP_BULLETS (41.4) 사용 권장 */
export const WARMUP_BULLETS = MG_WARMUP_BULLETS;

/** @deprecated heatWarmupShots() 사용 권장 */
export function heatWarmupByTime(
    currentLevel: number,
    dt: number,
    _heatUpTime?: number
): number {
    const currentShots = currentLevel * MG_WARMUP_BULLETS;
    const newShots = Math.min(MG_WARMUP_BULLETS, currentShots + (dt / (WARMUP_DURATION_SECS || 1.0)) * MG_WARMUP_BULLETS);
    return newShots / MG_WARMUP_BULLETS;
}

/** @deprecated coolWarmupShots() 사용 권장 */
export function coolWarmupLevel(
    currentLevel: number,
    dt: number,
    coolDownTime: number = MG_COOLDOWN_TIME
): number {
    const coolRate = coolDownTime > 0 ? 1 / coolDownTime : 1.0;
    return Math.max(0, currentLevel - dt * coolRate);
}

/** @deprecated heatWarmupShots() 사용 권장 */
export function heatWarmupByBullets(currentLevel: number, bulletsShot: number): number {
    if (bulletsShot <= 0) return currentLevel;
    return Math.min(1, currentLevel + bulletsShot / MG_WARMUP_BULLETS);
}

/** @deprecated accuraySystem.ts의 resolveHit()에서 직접 처리 */
export function getMgAccuracy(warmupLevel: number): number {
    return Math.min(1, Math.max(0.1, warmupLevel));
}
