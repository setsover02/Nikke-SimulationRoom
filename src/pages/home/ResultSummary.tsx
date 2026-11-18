import React from 'react';
import { ScenarioSummary } from '../../types/simulator';
import { Font } from '../../components/Font';
import { Avatar } from '../../components/Avatar/Avatar';
import { Grid } from '../../components/Layout/Grid';
import { useChartTheme } from '../../utils/useChartTheme';
import styles from './ResultSummary.module.scss';

interface Props {
    summary: ScenarioSummary;
    showTeamTotal: boolean;
    isCore: boolean;
}

const HIT_TAG_META = [
    { key: 'normal', label: '일반', colorVar: 'var(--Font-Inactive)' },
    { key: 'crit', label: '크리', colorVar: 'var(--Status-Info-100)' },
    { key: 'core', label: '코어', colorVar: 'var(--Accent-Orange)' },
    { key: 'coreCrit', label: '코어+크리', colorVar: 'var(--Accent-Purple)' },
    { key: 'fbNormal', label: 'FB 일반', colorVar: 'var(--Font-Inactive)' },
    { key: 'fbCrit', label: 'FB 크리', colorVar: 'var(--Status-Info-100)' },
    { key: 'fbCore', label: 'FB 코어', colorVar: 'var(--Accent-Orange)' },
    { key: 'fbCoreCrit', label: 'FB 코어+크리', colorVar: 'var(--Accent-Purple)' },
] as const;

const ResultSummary: React.FC<Props> = ({ summary }) => {
    const themeTokens = useChartTheme();
    const charCount = summary.chars.length;

    return (
        <Grid columns={1} gap={2} className="pa-2">
            {/* 최상단: Team Total 대미지 */}
            <div className={styles['team-total-banner']}>
                <Font as="span" variant="subtitle" weight="semibold" color="muted">
                    Team Total
                </Font>
                <Font
                    as="span"
                    variant="heading-2"
                    weight="bold"
                    className={`${styles['tabular-num']} ${styles['team-total-value']}`}
                >
                    {Math.floor(summary.teamTotal).toLocaleString()}
                </Font>
            </div>

            {/* 상단: 니케별 데미지 비중 바 차트 & 일반/스킬 비중 + 평타/스킬 횟수 + 크리 발생률 */}
            <div className={styles['share-section']}>
                <div className={styles['share-header']}>
                    <Font as="span" variant="subtitle" weight="bold">
                        니케별 데미지 비중
                    </Font>
                    <div className={styles['share-legend']}>
                        <span className={styles['legend-item']}>
                            <span className={`${styles['legend-dot']} ${styles.normal}`} />
                            <Font as="span" variant="caption-2" color="muted">일반 평타</Font>
                        </span>
                        <span className={styles['legend-item']}>
                            <span className={`${styles['legend-dot']} ${styles.skill}`} />
                            <Font as="span" variant="caption-2" color="muted">스킬 데미지</Font>
                        </span>
                    </div>
                </div>

                <div className={styles['share-list']}>
                    {summary.chars.map((r, idx) => {
                        const slotColor = themeTokens.getSlotColor(r.charId || idx);
                        const sharePct = summary.teamTotal > 0 ? (r.totalDmg / summary.teamTotal) * 100 : 0;
                        const normalDmg = r.normalAtkDmg ?? 0;
                        const skillDmg = r.skillDmg ?? 0;
                        const typeTotal = normalDmg + skillDmg;
                        const normalPct = typeTotal > 0 ? (normalDmg / typeTotal) * 100 : 0;
                        const skillPct = typeTotal > 0 ? (skillDmg / typeTotal) * 100 : 0;
                        const normalCount = r.normalAtkCount ?? 0;
                        const skillCount = r.skillCount ?? 0;
                        const critRatePct = r.critRatePct ?? 0;

                        return (
                            <div key={r.charId + idx} className={styles['share-row']}>
                                <div className={styles['share-row-top']}>
                                    <div className={styles['share-char']}>
                                        <Avatar charId={r.characterID || r.charId} size={24} />
                                        <Font
                                            as="span"
                                            variant="caption-1"
                                            weight="semibold"
                                            className={styles['char-name']}
                                            style={{ color: slotColor }}
                                        >
                                            {r.charName}
                                        </Font>
                                    </div>
                                    <Font
                                        as="span"
                                        variant="caption-1"
                                        weight="bold"
                                        className={styles['tabular-num']}
                                    >
                                        {sharePct.toFixed(1)}% · {Math.floor(r.totalDmg).toLocaleString()}
                                    </Font>
                                </div>

                                {/* 전체 스쿼드 딜 대비 니케 비중 바 차트 */}
                                <div className={styles['share-bar-track']}>
                                    <div
                                        className={styles['share-bar-fill']}
                                        style={{ width: `${Math.min(100, Math.max(0, sharePct))}%`, backgroundColor: slotColor }}
                                    />
                                </div>

                                {/* 해당 니케 내 일반 평타 vs 스킬 데미지 비중 및 평타·스킬 발생 횟수·크리 발생률 */}
                                <div className={styles['split-row']}>
                                    <div className={styles['split-bar-track']}>
                                        <div
                                            className={styles['split-bar-normal']}
                                            style={{ width: `${normalPct}%` }}
                                        />
                                        <div
                                            className={styles['split-bar-skill']}
                                            style={{ width: `${skillPct}%` }}
                                        />
                                    </div>
                                    <Font as="span" variant="caption-2" color="muted" className={styles['tabular-num']}>
                                        평타 {normalPct.toFixed(1)}% · 스킬 {skillPct.toFixed(1)}%
                                    </Font>
                                    <div className={styles['split-meta']}>
                                        <Font as="span" variant="footnote" color="inactive" className={styles['tabular-num']}>
                                            평타 {normalCount.toLocaleString()}회 · 스킬 {skillCount.toLocaleString()}회 · 크리 {critRatePct.toFixed(1)}%
                                        </Font>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 하단: 기본 타격 대미지 (버프 미포함) */}
            <div className={styles['hit-section']}>
                <Font as="h4" variant="subtitle" weight="bold">
                    기본 타격 대미지 (버프 미포함)
                </Font>
                <Grid
                    columns={{
                        xs: 1,
                        sm: 2,
                        md: Math.min(3, charCount),
                        lg: Math.min(5, charCount),
                    }}
                    gap={2}
                >
                    {summary.chars.map((r, idx) => {
                        const slotColor = themeTokens.getSlotColor(r.charId || idx);
                        return (
                            <Grid key={r.charId + idx} columns={1} gap={1}>
                                {/* 1. 아바타 & 캐릭터 이름 한 줄 */}
                                <Grid templateColumns="auto 1fr" gap={1} alignItems="center">
                                    <Avatar charId={r.characterID || r.charId} size={32} />
                                    <Font
                                        as="span"
                                        variant="body"
                                        weight="medium"
                                        className={styles['char-name']}
                                        style={{ color: slotColor }}
                                    >
                                        {r.charName}
                                    </Font>
                                </Grid>

                                {/* 2. 세부 대미지 수치 세로 나열 */}
                                {r.hitDamages && (
                                    <Grid columns={1} gap={1}>
                                        {HIT_TAG_META.map(({ key, label, colorVar }) => {
                                            const value = r.hitDamages?.[key as keyof typeof r.hitDamages] ?? 0;
                                            return (
                                                <Grid
                                                    key={key}
                                                    templateColumns="1fr auto"
                                                    alignItems="center"
                                                >
                                                    <Font
                                                        as="span"
                                                        variant="footnote"
                                                        style={{ color: colorVar }}
                                                    >
                                                        {label}
                                                    </Font>
                                                    <Font
                                                        as="span"
                                                        variant="footnote"
                                                        color="default"
                                                        weight="medium"
                                                        className={styles['tabular-num']}
                                                    >
                                                        {value.toLocaleString()}
                                                    </Font>
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                )}
                            </Grid>
                        );
                    })}
                </Grid>
            </div>
        </Grid>
    );
};

export default ResultSummary;


