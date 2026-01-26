import { extractMetrics, formatScore, formatMs, getMetricRating } from '../src/metrics/extractor';
import { compareMetrics } from '../src/metrics/comparator';
import { LHReport, Metrics } from '../src/types';

describe('Metrics Extractor', () => {
  const mockReport: LHReport = {
    categories: {
      performance: { id: 'performance', title: 'Performance', score: 0.85 },
      accessibility: { id: 'accessibility', title: 'Accessibility', score: 0.92 },
      'best-practices': { id: 'best-practices', title: 'Best Practices', score: 0.88 },
      seo: { id: 'seo', title: 'SEO', score: 0.95 },
    },
    audits: {
      'first-contentful-paint': {
        id: 'first-contentful-paint',
        title: 'First Contentful Paint',
        description: 'FCP',
        score: 0.8,
        numericValue: 1500,
      },
      'largest-contentful-paint': {
        id: 'largest-contentful-paint',
        title: 'Largest Contentful Paint',
        description: 'LCP',
        score: 0.7,
        numericValue: 2500,
      },
      'total-blocking-time': {
        id: 'total-blocking-time',
        title: 'Total Blocking Time',
        description: 'TBT',
        score: 0.9,
        numericValue: 150,
      },
      'cumulative-layout-shift': {
        id: 'cumulative-layout-shift',
        title: 'Cumulative Layout Shift',
        description: 'CLS',
        score: 0.95,
        numericValue: 0.05,
      },
      'render-blocking-resources': {
        id: 'render-blocking-resources',
        title: 'Eliminate render-blocking resources',
        description: 'Reduce render-blocking',
        score: 0.5,
        details: {
          type: 'opportunity',
          overallSavingsMs: 500,
        },
      },
    },
    finalUrl: 'https://example.com',
    fetchTime: '2024-01-01T00:00:00.000Z',
  };

  describe('extractMetrics', () => {
    it('should extract category scores', () => {
      const metrics = extractMetrics(mockReport);

      expect(metrics.scores.performance).toBe(0.85);
      expect(metrics.scores.accessibility).toBe(0.92);
      expect(metrics.scores.bestPractices).toBe(0.88);
      expect(metrics.scores.seo).toBe(0.95);
    });

    it('should extract Core Web Vitals', () => {
      const metrics = extractMetrics(mockReport);

      expect(metrics.coreWebVitals.fcp).toBe(1500);
      expect(metrics.coreWebVitals.lcp).toBe(2500);
      expect(metrics.coreWebVitals.tbt).toBe(150);
      expect(metrics.coreWebVitals.cls).toBe(0.05);
    });

    it('should extract opportunities', () => {
      const metrics = extractMetrics(mockReport);

      expect(metrics.opportunities).toHaveLength(1);
      expect(metrics.opportunities[0].id).toBe('render-blocking-resources');
      expect(metrics.opportunities[0].savingsMs).toBe(500);
    });
  });

  describe('formatScore', () => {
    it('should format score as percentage', () => {
      expect(formatScore(0.85)).toBe('85%');
      expect(formatScore(1)).toBe('100%');
      expect(formatScore(0)).toBe('0%');
    });
  });

  describe('formatMs', () => {
    it('should format milliseconds correctly', () => {
      expect(formatMs(500)).toBe('500ms');
      expect(formatMs(1500)).toBe('1.50s');
      expect(formatMs(2500)).toBe('2.50s');
    });
  });

  describe('getMetricRating', () => {
    it('should return correct rating for FCP', () => {
      expect(getMetricRating('fcp', 1500)).toBe('good');
      expect(getMetricRating('fcp', 2500)).toBe('needs-improvement');
      expect(getMetricRating('fcp', 4000)).toBe('poor');
    });

    it('should return correct rating for LCP', () => {
      expect(getMetricRating('lcp', 2000)).toBe('good');
      expect(getMetricRating('lcp', 3000)).toBe('needs-improvement');
      expect(getMetricRating('lcp', 5000)).toBe('poor');
    });

    it('should return correct rating for CLS', () => {
      expect(getMetricRating('cls', 0.05)).toBe('good');
      expect(getMetricRating('cls', 0.15)).toBe('needs-improvement');
      expect(getMetricRating('cls', 0.3)).toBe('poor');
    });
  });
});

describe('Metrics Comparator', () => {
  const baselineMetrics: Metrics = {
    scores: {
      performance: 0.9,
      accessibility: 0.9,
      bestPractices: 0.9,
      seo: 0.9,
    },
    coreWebVitals: {
      fcp: 1000,
      lcp: 2000,
      tbt: 300,
      cls: 0.05,
    },
    opportunities: [],
  };

  const currentMetrics: Metrics = {
    scores: {
      performance: 0.8,
      accessibility: 0.92,
      bestPractices: 0.9,
      seo: 0.9,
    },
    coreWebVitals: {
      fcp: 1500,
      lcp: 2800,
      tbt: 80,
      cls: 0.08,
    },
    opportunities: [],
  };

  describe('compareMetrics', () => {
    it('should identify regressions', () => {
      const result = compareMetrics(currentMetrics, baselineMetrics);

      // Performance score regressed
      const perfRegression = result.regressions.find(
        (r) => r.metric === 'Performance Score'
      );
      expect(perfRegression).toBeDefined();
      expect(perfRegression?.isRegression).toBe(true);

      // FCP regressed
      const fcpRegression = result.regressions.find((r) => r.metric === 'FCP');
      expect(fcpRegression).toBeDefined();

      // LCP regressed
      const lcpRegression = result.regressions.find((r) => r.metric === 'LCP');
      expect(lcpRegression).toBeDefined();
    });

    it('should identify improvements', () => {
      const result = compareMetrics(currentMetrics, baselineMetrics);

      // Accessibility improved
      const accessImprovement = result.improvements.find(
        (r) => r.metric === 'Accessibility Score'
      );
      expect(accessImprovement).toBeDefined();
      expect(accessImprovement?.isImprovement).toBe(true);

      // TBT improved
      const tbtImprovement = result.improvements.find((r) => r.metric === 'TBT');
      expect(tbtImprovement).toBeDefined();
    });

    it('should calculate overall score change', () => {
      const result = compareMetrics(currentMetrics, baselineMetrics);

      expect(result.overallScore.base).toBe(0.9);
      expect(result.overallScore.current).toBe(0.8);
      expect(result.overallScore.diff).toBeCloseTo(-0.1);
    });

    it('should assign correct severity levels', () => {
      const result = compareMetrics(currentMetrics, baselineMetrics);

      // Large performance regression should be high severity
      const perfRegression = result.regressions.find(
        (r) => r.metric === 'Performance Score'
      );
      expect(['high', 'medium']).toContain(perfRegression?.severity);
    });
  });
});
