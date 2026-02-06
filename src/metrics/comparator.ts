import { Metrics, MetricComparison, ComparisonResult } from '../types';

const SCORE_CHANGE_THRESHOLD = 0.02; // 2 percentage points

const metricThresholds: Record<string, { absolute: number; relative: number }> = {
  FCP: { absolute: 100, relative: 0.1 },
  LCP: { absolute: 150, relative: 0.1 },
  TBT: { absolute: 50, relative: 0.15 },
  CLS: { absolute: 0.02, relative: 0.15 },
  'Speed Index': { absolute: 200, relative: 0.1 },
  TTI: { absolute: 200, relative: 0.1 },
};

/**
 * Compare current metrics against baseline metrics
 */
export function compareMetrics(
  current: Metrics,
  baseline: Metrics
): ComparisonResult {
  const comparisons: MetricComparison[] = [];

  // Compare scores
  comparisons.push(
    ...compareScores(current.scores, baseline.scores)
  );

  // Compare Core Web Vitals
  comparisons.push(
    ...compareCoreWebVitals(current.coreWebVitals, baseline.coreWebVitals)
  );

  // Categorize results
  const regressions = comparisons.filter((c) => c.isRegression);
  const improvements = comparisons.filter((c) => c.isImprovement);
  const unchanged = comparisons.filter((c) => !c.isRegression && !c.isImprovement);

  // Calculate overall score change
  const overallScore = {
    base: baseline.scores.performance ?? 0,
    current: current.scores.performance ?? 0,
    diff: (current.scores.performance ?? 0) - (baseline.scores.performance ?? 0),
  };

  return {
    regressions: sortBySeverity(regressions),
    improvements: sortBySeverity(improvements),
    unchanged,
    overallScore,
  };
}

/**
 * Compare category scores
 */
function compareScores(
  current: Metrics['scores'],
  baseline: Metrics['scores']
): MetricComparison[] {
  const comparisons: MetricComparison[] = [];

  const scoreKeys = ['performance', 'accessibility', 'bestPractices', 'seo'] as const;

  for (const key of scoreKeys) {
    const baseValue = baseline[key];
    const currentValue = current[key];

    if (baseValue !== undefined && currentValue !== undefined) {
      comparisons.push(
        createScoreComparison(formatScoreKey(key), currentValue, baseValue)
      );
    }
  }

  return comparisons;
}

/**
 * Compare Core Web Vitals
 */
function compareCoreWebVitals(
  current: Metrics['coreWebVitals'],
  baseline: Metrics['coreWebVitals']
): MetricComparison[] {
  const comparisons: MetricComparison[] = [];

  const metricKeys = ['fcp', 'lcp', 'tbt', 'cls', 'speedIndex', 'tti'] as const;

  for (const key of metricKeys) {
    const baseValue = baseline[key];
    const currentValue = current[key];

    if (baseValue !== undefined && currentValue !== undefined) {
      comparisons.push(
        createMetricComparison(formatMetricKey(key), currentValue, baseValue)
      );
    }
  }

  return comparisons;
}

/**
 * Create a comparison for score metrics (higher is better)
 */
function createScoreComparison(
  metric: string,
  current: number,
  base: number
): MetricComparison {
  const diff = current - base;
  const diffPercent = calculateDiffPercent(base, diff);

  // For scores, higher is better
  const isRegression = diff <= -SCORE_CHANGE_THRESHOLD;
  const isImprovement = diff >= SCORE_CHANGE_THRESHOLD;

  return {
    metric,
    base,
    current,
    diff,
    diffPercent,
    isRegression,
    isImprovement,
    severity: getScoreSeverity(diff),
  };
}

/**
 * Create a comparison for timing metrics (lower is better)
 */
function createMetricComparison(
  metric: string,
  current: number,
  base: number
): MetricComparison {
  const diff = current - base;
  const diffPercent = calculateDiffPercent(base, diff);
  const threshold = getMetricThreshold(metric, base);

  // Lower is better for all compared CWV metrics
  const isRegression = diff >= threshold;
  const isImprovement = diff <= -threshold;

  return {
    metric,
    base,
    current,
    diff,
    diffPercent,
    isRegression,
    isImprovement,
    severity: getMetricSeverity(metric, diff),
  };
}

/**
 * Get severity for score changes
 */
function getScoreSeverity(diff: number): MetricComparison['severity'] {
  const absDiff = Math.abs(diff);

  if (absDiff >= 0.2) return 'critical';
  if (absDiff >= 0.1) return 'high';
  if (absDiff >= 0.05) return 'medium';
  return 'low';
}

/**
 * Get severity for metric changes
 */
function getMetricSeverity(
  metric: string,
  diff: number
): MetricComparison['severity'] {
  const absDiff = Math.abs(diff);

  // Different thresholds for different metrics
  if (metric === 'CLS') {
    if (absDiff >= 0.1) return 'critical';
    if (absDiff >= 0.05) return 'high';
    if (absDiff >= 0.02) return 'medium';
    return 'low';
  }

  // For timing metrics (ms)
  if (absDiff >= 1000) return 'critical';
  if (absDiff >= 500) return 'high';
  if (absDiff >= 200) return 'medium';
  return 'low';
}

/**
 * Format score key for display
 */
function formatScoreKey(key: string): string {
  const mapping: Record<string, string> = {
    performance: 'Performance Score',
    accessibility: 'Accessibility Score',
    bestPractices: 'Best Practices Score',
    seo: 'SEO Score',
  };
  return mapping[key] ?? key;
}

/**
 * Format metric key for display
 */
function formatMetricKey(key: string): string {
  const mapping: Record<string, string> = {
    fcp: 'FCP',
    lcp: 'LCP',
    tbt: 'TBT',
    cls: 'CLS',
    speedIndex: 'Speed Index',
    tti: 'TTI',
  };
  return mapping[key] ?? key;
}

/**
 * Sort comparisons by severity (most severe first)
 */
function sortBySeverity(comparisons: MetricComparison[]): MetricComparison[] {
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...comparisons].sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      Math.abs(b.diff) - Math.abs(a.diff)
  );
}

/**
 * Calculate percentage diff while handling zero baselines safely
 */
function calculateDiffPercent(base: number, diff: number): number {
  if (base === 0) {
    if (diff === 0) {
      return 0;
    }
    return diff > 0 ? 100 : -100;
  }

  return (diff / base) * 100;
}

/**
 * Get threshold using both absolute and relative bands to reduce noise
 */
function getMetricThreshold(metric: string, base: number): number {
  const threshold = metricThresholds[metric];
  if (!threshold) {
    return 100;
  }

  return Math.max(threshold.absolute, Math.abs(base) * threshold.relative);
}

/**
 * Get a summary of the comparison result
 */
export function getComparisonSummary(result: ComparisonResult): string {
  const lines: string[] = [];

  if (result.regressions.length > 0) {
    lines.push(`Regressions: ${result.regressions.length}`);
    for (const r of result.regressions.slice(0, 3)) {
      lines.push(`  - ${r.metric}: ${formatChange(r)}`);
    }
  }

  if (result.improvements.length > 0) {
    lines.push(`Improvements: ${result.improvements.length}`);
    for (const i of result.improvements.slice(0, 3)) {
      lines.push(`  - ${i.metric}: ${formatChange(i)}`);
    }
  }

  const scoreDiff = result.overallScore.diff * 100;
  lines.push(
    `\nOverall Performance: ${scoreDiff >= 0 ? '+' : ''}${scoreDiff.toFixed(1)}%`
  );

  return lines.join('\n');
}

/**
 * Format a metric change for display
 */
function formatChange(comparison: MetricComparison): string {
  const sign = comparison.diff >= 0 ? '+' : '';

  if (comparison.metric.includes('Score')) {
    const basePct = (comparison.base * 100).toFixed(0);
    const currentPct = (comparison.current * 100).toFixed(0);
    const diffPct = (comparison.diff * 100).toFixed(1);
    return `${basePct}% → ${currentPct}% (${sign}${diffPct}%)`;
  }

  if (comparison.metric === 'CLS') {
    return `${comparison.base.toFixed(3)} → ${comparison.current.toFixed(3)} (${sign}${comparison.diff.toFixed(3)})`;
  }

  // Timing metrics
  return `${comparison.base.toFixed(0)}ms → ${comparison.current.toFixed(0)}ms (${sign}${comparison.diff.toFixed(0)}ms)`;
}
