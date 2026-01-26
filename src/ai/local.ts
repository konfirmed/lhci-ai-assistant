import { MetricComparison, Opportunity, AnalysisResult, RootCause, Recommendation } from '../types';

/**
 * Local heuristic-based analysis when no AI provider is available
 * This provides basic analysis without external API calls
 */
export function analyzeLocally(data: {
  regressions: MetricComparison[];
  improvements: MetricComparison[];
  opportunities: Opportunity[];
}): AnalysisResult {
  const rootCauses = identifyRootCauses(data.regressions, data.opportunities);
  const recommendations = generateRecommendations(data.regressions, data.opportunities);

  return {
    summary: generateSummary(data),
    regressions: data.regressions,
    improvements: data.improvements,
    rootCauses,
    recommendations,
  };
}

/**
 * Generate a text summary of the analysis
 */
function generateSummary(data: {
  regressions: MetricComparison[];
  improvements: MetricComparison[];
}): string {
  const parts: string[] = [];

  if (data.regressions.length > 0) {
    const critical = data.regressions.filter((r) => r.severity === 'critical');
    const high = data.regressions.filter((r) => r.severity === 'high');

    parts.push(`Found ${data.regressions.length} performance regression(s).`);

    if (critical.length > 0) {
      parts.push(`${critical.length} critical issue(s) require immediate attention.`);
    }
    if (high.length > 0) {
      parts.push(`${high.length} high-severity issue(s) should be addressed soon.`);
    }
  } else {
    parts.push('No performance regressions detected.');
  }

  if (data.improvements.length > 0) {
    parts.push(`${data.improvements.length} metric(s) improved.`);
  }

  return parts.join(' ');
}

/**
 * Identify likely root causes based on heuristics
 */
function identifyRootCauses(
  regressions: MetricComparison[],
  opportunities: Opportunity[]
): RootCause[] {
  const causes: RootCause[] = [];

  for (const regression of regressions) {
    const cause = getRootCauseForMetric(regression, opportunities);
    if (cause) {
      causes.push(cause);
    }
  }

  return causes;
}

/**
 * Get root cause for a specific metric regression
 */
function getRootCauseForMetric(
  regression: MetricComparison,
  opportunities: Opportunity[]
): RootCause | null {
  const metric = regression.metric;

  // Map metrics to likely causes
  const causeMap: Record<string, { cause: string; relatedOpps: string[] }> = {
    FCP: {
      cause: 'First Contentful Paint regression often indicates render-blocking resources, slow server response, or increased initial HTML/CSS size.',
      relatedOpps: ['render-blocking-resources', 'server-response-time', 'uses-rel-preconnect'],
    },
    LCP: {
      cause: 'Largest Contentful Paint regression typically indicates slow loading of the main content element (images, video, or text blocks).',
      relatedOpps: ['largest-contentful-paint-element', 'uses-responsive-images', 'offscreen-images'],
    },
    TBT: {
      cause: 'Total Blocking Time regression indicates increased main thread blocking from JavaScript execution.',
      relatedOpps: ['mainthread-work-breakdown', 'bootup-time', 'unused-javascript'],
    },
    CLS: {
      cause: 'Cumulative Layout Shift regression indicates visual instability from elements moving after initial render.',
      relatedOpps: ['layout-shift-elements', 'unsized-images', 'non-composited-animations'],
    },
    'Speed Index': {
      cause: 'Speed Index regression indicates slower visual progress during page load.',
      relatedOpps: ['render-blocking-resources', 'critical-request-chains'],
    },
    TTI: {
      cause: 'Time to Interactive regression indicates the page takes longer to become fully interactive.',
      relatedOpps: ['mainthread-work-breakdown', 'bootup-time', 'third-party-summary'],
    },
    'Performance Score': {
      cause: 'Overall performance score decreased. Review individual Core Web Vitals for specific causes.',
      relatedOpps: [],
    },
  };

  const info = causeMap[metric];
  if (!info) {
    return null;
  }

  // Find related opportunities
  const relatedOpportunities = opportunities.filter((o) =>
    info.relatedOpps.includes(o.id)
  );

  let cause = info.cause;
  if (relatedOpportunities.length > 0) {
    cause += ` Lighthouse flagged: ${relatedOpportunities.map((o) => o.title).join(', ')}.`;
  }

  return {
    metric,
    cause,
    confidence: relatedOpportunities.length > 0 ? 'high' : 'medium',
    relatedFiles: undefined,
  };
}

/**
 * Generate recommendations based on regressions and opportunities
 */
function generateRecommendations(
  regressions: MetricComparison[],
  opportunities: Opportunity[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Add recommendations based on opportunities
  for (const opp of opportunities.slice(0, 5)) {
    recommendations.push({
      title: opp.title,
      description: getRecommendationDescription(opp),
      priority: opp.savingsMs && opp.savingsMs > 500 ? 'high' : 'medium',
      impact: opp.savingsMs ? `~${opp.savingsMs.toFixed(0)}ms potential improvement` : 'Variable impact',
      effort: getEstimatedEffort(opp.id),
    });
  }

  // Add general recommendations based on regression patterns
  const hasLCPRegression = regressions.some((r) => r.metric === 'LCP');
  const hasTBTRegression = regressions.some((r) => r.metric === 'TBT');
  const hasCLSRegression = regressions.some((r) => r.metric === 'CLS');

  if (hasLCPRegression && !recommendations.some((r) => r.title.includes('image'))) {
    recommendations.push({
      title: 'Optimize largest contentful paint element',
      description: 'Identify the LCP element and ensure it loads quickly. Use preload for critical images, optimize image formats (WebP/AVIF), and implement responsive images.',
      priority: 'high',
      impact: 'Can improve LCP by 500ms-2s',
      effort: 'medium',
    });
  }

  if (hasTBTRegression && !recommendations.some((r) => r.title.includes('JavaScript'))) {
    recommendations.push({
      title: 'Reduce JavaScript execution time',
      description: 'Audit third-party scripts, implement code splitting, and defer non-critical JavaScript. Consider using Web Workers for heavy computations.',
      priority: 'high',
      impact: 'Can improve TBT by 100-500ms',
      effort: 'high',
    });
  }

  if (hasCLSRegression) {
    recommendations.push({
      title: 'Fix layout shifts',
      description: 'Add explicit dimensions to images and embedded content. Reserve space for dynamic content and avoid inserting content above existing content.',
      priority: 'medium',
      impact: 'Can reduce CLS by 0.05-0.1',
      effort: 'low',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * Get a detailed description for a recommendation
 */
function getRecommendationDescription(opp: Opportunity): string {
  const descriptions: Record<string, string> = {
    'render-blocking-resources': 'Identify and defer or inline critical CSS/JS. Use async/defer for non-critical scripts.',
    'unused-javascript': 'Remove or lazy-load unused JavaScript. Use code splitting to reduce initial bundle size.',
    'unused-css-rules': 'Remove unused CSS rules or implement critical CSS extraction.',
    'uses-responsive-images': 'Implement srcset and sizes attributes for responsive images. Use appropriate image dimensions.',
    'offscreen-images': 'Implement lazy loading for images below the fold using loading="lazy" or Intersection Observer.',
    'uses-optimized-images': 'Compress images without quality loss. Consider WebP or AVIF formats.',
    'uses-text-compression': 'Enable GZIP or Brotli compression on your server for text-based resources.',
    'server-response-time': 'Optimize server configuration, use caching, or consider a CDN for faster initial response.',
    'uses-rel-preconnect': 'Add preconnect hints for critical third-party origins.',
    'third-party-summary': 'Audit third-party scripts and remove or defer non-essential ones.',
  };

  return descriptions[opp.id] || opp.description || opp.title;
}

/**
 * Estimate effort for an optimization
 */
function getEstimatedEffort(oppId: string): 'low' | 'medium' | 'high' {
  const lowEffort = [
    'uses-text-compression',
    'uses-rel-preconnect',
    'uses-rel-preload',
    'offscreen-images',
  ];

  const highEffort = [
    'unused-javascript',
    'mainthread-work-breakdown',
    'bootup-time',
    'third-party-summary',
  ];

  if (lowEffort.includes(oppId)) return 'low';
  if (highEffort.includes(oppId)) return 'high';
  return 'medium';
}
