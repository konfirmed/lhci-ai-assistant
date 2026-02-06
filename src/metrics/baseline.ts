import { Metrics } from '../types';

const SCORE_KEYS = ['performance', 'accessibility', 'bestPractices', 'seo'] as const;
const VITAL_KEYS = ['fcp', 'lcp', 'tbt', 'cls', 'speedIndex', 'tti'] as const;

/**
 * Build a synthetic baseline from a series of metrics using median values.
 */
export function buildMedianBaselineMetrics(metricsSeries: Metrics[]): Metrics {
  return buildPercentileBaselineMetrics(metricsSeries, 50);
}

/**
 * Build a synthetic baseline from a series of metrics using percentile values.
 *
 * Percentiles are direction-aware for stricter regression guarding:
 * - Scores (higher is better) use the provided percentile directly.
 * - Timings/vitals (lower is better) use the complementary percentile.
 *   Example: p75 for scores uses 75th percentile, while vitals use 25th percentile.
 */
export function buildPercentileBaselineMetrics(
  metricsSeries: Metrics[],
  percentile: number
): Metrics {
  if (metricsSeries.length === 0) {
    throw new Error('At least one metrics snapshot is required for percentile baseline');
  }

  if (percentile <= 0 || percentile > 100) {
    throw new Error(`Percentile must be between 1 and 100. Received: ${percentile}`);
  }

  const scores: Metrics['scores'] = {};
  for (const key of SCORE_KEYS) {
    const values = metricsSeries
      .map((entry) => entry.scores[key])
      .filter((value): value is number => value !== undefined);
    const value = getPercentile(values, percentile);

    if (value !== undefined) {
      scores[key] = value;
    }
  }

  const coreWebVitals: Metrics['coreWebVitals'] = {};
  const inversePercentile = 100 - percentile;
  for (const key of VITAL_KEYS) {
    const values = metricsSeries
      .map((entry) => entry.coreWebVitals[key])
      .filter((value): value is number => value !== undefined);
    const value = getPercentile(values, inversePercentile);

    if (value !== undefined) {
      coreWebVitals[key] = value;
    }
  }

  return {
    scores,
    coreWebVitals,
    opportunities: [],
  };
}

export function getPercentileFromStrategy(strategy: string): number | undefined {
  const match = strategy.match(/^p([1-9]\d?|100)$/);
  if (!match) {
    return undefined;
  }

  return Number.parseInt(match[1], 10);
}

function getPercentile(values: number[], percentile: number): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }

  const bounded = Math.max(0, Math.min(100, percentile));
  const rank = (bounded / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];
  const weight = rank - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * weight;
}
