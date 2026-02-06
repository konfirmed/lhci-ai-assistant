import {
  buildMedianBaselineMetrics,
  buildPercentileBaselineMetrics,
  getPercentileFromStrategy,
} from '../src/metrics/baseline';
import { Metrics } from '../src/types';

describe('Median Baseline Builder', () => {
  it('should calculate medians for odd-sized metric series', () => {
    const series: Metrics[] = [
      {
        scores: { performance: 0.8, accessibility: 0.9 },
        coreWebVitals: { fcp: 1500, lcp: 2800, cls: 0.08 },
        opportunities: [],
      },
      {
        scores: { performance: 0.9, accessibility: 0.95 },
        coreWebVitals: { fcp: 1800, lcp: 3000, cls: 0.1 },
        opportunities: [],
      },
      {
        scores: { performance: 0.85, accessibility: 0.92 },
        coreWebVitals: { fcp: 1200, lcp: 2500, cls: 0.06 },
        opportunities: [],
      },
    ];

    const baseline = buildMedianBaselineMetrics(series);

    expect(baseline.scores.performance).toBeCloseTo(0.85);
    expect(baseline.scores.accessibility).toBe(0.92);
    expect(baseline.coreWebVitals.fcp).toBe(1500);
    expect(baseline.coreWebVitals.lcp).toBe(2800);
    expect(baseline.coreWebVitals.cls).toBe(0.08);
  });

  it('should calculate medians for even-sized metric series', () => {
    const series: Metrics[] = [
      {
        scores: { performance: 0.8 },
        coreWebVitals: { fcp: 1000, tbt: 100 },
        opportunities: [],
      },
      {
        scores: { performance: 0.9 },
        coreWebVitals: { fcp: 1400, tbt: 200 },
        opportunities: [],
      },
      {
        scores: { performance: 0.7 },
        coreWebVitals: { fcp: 1200, tbt: 300 },
        opportunities: [],
      },
      {
        scores: { performance: 1.0 },
        coreWebVitals: { fcp: 1600, tbt: 400 },
        opportunities: [],
      },
    ];

    const baseline = buildMedianBaselineMetrics(series);

    expect(baseline.scores.performance).toBeCloseTo(0.85);
    expect(baseline.coreWebVitals.fcp).toBe(1300);
    expect(baseline.coreWebVitals.tbt).toBe(250);
  });

  it('should build a direction-aware p75 baseline', () => {
    const series: Metrics[] = [
      {
        scores: { performance: 0.8, accessibility: 0.9 },
        coreWebVitals: { lcp: 1000, tbt: 100 },
        opportunities: [],
      },
      {
        scores: { performance: 0.9, accessibility: 0.95 },
        coreWebVitals: { lcp: 1400, tbt: 200 },
        opportunities: [],
      },
      {
        scores: { performance: 0.7, accessibility: 0.85 },
        coreWebVitals: { lcp: 1200, tbt: 300 },
        opportunities: [],
      },
      {
        scores: { performance: 1.0, accessibility: 1.0 },
        coreWebVitals: { lcp: 1600, tbt: 400 },
        opportunities: [],
      },
    ];

    const baseline = buildPercentileBaselineMetrics(series, 75);

    expect(baseline.scores.performance).toBeCloseTo(0.925);
    expect(baseline.scores.accessibility).toBeCloseTo(0.9625);
    expect(baseline.coreWebVitals.lcp).toBe(1150);
    expect(baseline.coreWebVitals.tbt).toBe(175);
  });

  it('should parse percentile strategies', () => {
    expect(getPercentileFromStrategy('p75')).toBe(75);
    expect(getPercentileFromStrategy('p100')).toBe(100);
    expect(getPercentileFromStrategy('median')).toBeUndefined();
    expect(getPercentileFromStrategy('p0')).toBeUndefined();
  });
});
