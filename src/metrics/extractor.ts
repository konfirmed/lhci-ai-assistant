import { LHReport, Metrics, Opportunity } from '../types';

/**
 * Extract key metrics from a Lighthouse report
 */
export function extractMetrics(lhr: LHReport): Metrics {
  return {
    scores: extractScores(lhr),
    coreWebVitals: extractCoreWebVitals(lhr),
    opportunities: extractOpportunities(lhr),
  };
}

/**
 * Extract category scores
 */
function extractScores(lhr: LHReport): Metrics['scores'] {
  return {
    performance: lhr.categories.performance?.score ?? undefined,
    accessibility: lhr.categories.accessibility?.score ?? undefined,
    bestPractices: lhr.categories['best-practices']?.score ?? undefined,
    seo: lhr.categories.seo?.score ?? undefined,
  };
}

/**
 * Extract Core Web Vitals metrics
 */
function extractCoreWebVitals(lhr: LHReport): Metrics['coreWebVitals'] {
  return {
    fcp: getNumericValue(lhr, 'first-contentful-paint'),
    lcp: getNumericValue(lhr, 'largest-contentful-paint'),
    tbt: getNumericValue(lhr, 'total-blocking-time'),
    cls: getNumericValue(lhr, 'cumulative-layout-shift'),
    speedIndex: getNumericValue(lhr, 'speed-index'),
    tti: getNumericValue(lhr, 'interactive'),
  };
}

/**
 * Get numeric value from an audit
 */
function getNumericValue(lhr: LHReport, auditId: string): number | undefined {
  const audit = lhr.audits[auditId];
  if (!audit || audit.numericValue === undefined) {
    return undefined;
  }
  return audit.numericValue;
}

/**
 * Extract performance opportunities
 */
function extractOpportunities(lhr: LHReport): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const [id, audit] of Object.entries(lhr.audits)) {
    // Only include opportunities that have room for improvement
    if (
      audit.details?.type === 'opportunity' &&
      audit.score !== null &&
      audit.score !== 1
    ) {
      opportunities.push({
        id,
        title: audit.title,
        description: audit.description,
        savingsMs: audit.details.overallSavingsMs,
        savingsBytes: audit.details.overallSavingsBytes,
        score: audit.score,
      });
    }
  }

  // Sort by potential savings (highest first)
  return opportunities.sort((a, b) => {
    const savingsA = a.savingsMs || 0;
    const savingsB = b.savingsMs || 0;
    return savingsB - savingsA;
  });
}

/**
 * Get a human-readable summary of metrics
 */
export function getMetricsSummary(metrics: Metrics): string {
  const lines: string[] = [];

  // Scores
  lines.push('Category Scores:');
  if (metrics.scores.performance !== undefined) {
    lines.push(`  Performance: ${formatScore(metrics.scores.performance)}`);
  }
  if (metrics.scores.accessibility !== undefined) {
    lines.push(`  Accessibility: ${formatScore(metrics.scores.accessibility)}`);
  }
  if (metrics.scores.bestPractices !== undefined) {
    lines.push(`  Best Practices: ${formatScore(metrics.scores.bestPractices)}`);
  }
  if (metrics.scores.seo !== undefined) {
    lines.push(`  SEO: ${formatScore(metrics.scores.seo)}`);
  }

  // Core Web Vitals
  lines.push('\nCore Web Vitals:');
  if (metrics.coreWebVitals.fcp !== undefined) {
    lines.push(`  FCP: ${formatMs(metrics.coreWebVitals.fcp)}`);
  }
  if (metrics.coreWebVitals.lcp !== undefined) {
    lines.push(`  LCP: ${formatMs(metrics.coreWebVitals.lcp)}`);
  }
  if (metrics.coreWebVitals.tbt !== undefined) {
    lines.push(`  TBT: ${formatMs(metrics.coreWebVitals.tbt)}`);
  }
  if (metrics.coreWebVitals.cls !== undefined) {
    lines.push(`  CLS: ${metrics.coreWebVitals.cls.toFixed(3)}`);
  }

  // Top opportunities
  if (metrics.opportunities.length > 0) {
    lines.push('\nTop Opportunities:');
    for (const opp of metrics.opportunities.slice(0, 5)) {
      const savings = opp.savingsMs ? ` (${formatMs(opp.savingsMs)} savings)` : '';
      lines.push(`  - ${opp.title}${savings}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a score as a percentage
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Format milliseconds in a human-readable way
 */
export function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

/**
 * Format bytes in a human-readable way
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Get the rating for a metric value
 */
export function getMetricRating(
  metric: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, { good: number; poor: number }> = {
    fcp: { good: 1800, poor: 3000 },
    lcp: { good: 2500, poor: 4000 },
    tbt: { good: 200, poor: 600 },
    cls: { good: 0.1, poor: 0.25 },
    speedIndex: { good: 3400, poor: 5800 },
    tti: { good: 3800, poor: 7300 },
  };

  const threshold = thresholds[metric.toLowerCase()];
  if (!threshold) {
    return 'needs-improvement';
  }

  if (value <= threshold.good) {
    return 'good';
  }
  if (value >= threshold.poor) {
    return 'poor';
  }
  return 'needs-improvement';
}
