import { AnalysisResult } from '../types';

/**
 * Format analysis result as JSON
 */
export function formatAsJSON(result: AnalysisResult, pretty: boolean = true): string {
  const output = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    summary: result.summary,
    regressions: result.regressions.map((r) => ({
      metric: r.metric,
      base: r.base,
      current: r.current,
      diff: r.diff,
      diffPercent: r.diffPercent,
      severity: r.severity,
    })),
    improvements: result.improvements.map((i) => ({
      metric: i.metric,
      base: i.base,
      current: i.current,
      diff: i.diff,
      diffPercent: i.diffPercent,
    })),
    rootCauses: result.rootCauses.map((c) => ({
      metric: c.metric,
      cause: c.cause,
      confidence: c.confidence,
      relatedFiles: c.relatedFiles,
    })),
    recommendations: result.recommendations.map((r) => ({
      title: r.title,
      description: r.description,
      priority: r.priority,
      impact: r.impact,
      effort: r.effort,
    })),
    autoFixes: result.autoFixes?.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      file: f.file,
      diff: f.diff,
      confidence: f.confidence,
    })),
  };

  return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

/**
 * Output analysis result as JSON to stdout
 */
export function outputAsJSON(result: AnalysisResult, pretty: boolean = true): void {
  console.log(formatAsJSON(result, pretty));
}

/**
 * Parse analysis result from JSON
 */
export function parseFromJSON(json: string): AnalysisResult {
  const parsed = JSON.parse(json);

  return {
    summary: parsed.summary || '',
    regressions: parsed.regressions || [],
    improvements: parsed.improvements || [],
    rootCauses: parsed.rootCauses || [],
    recommendations: parsed.recommendations || [],
    autoFixes: parsed.autoFixes,
  };
}

/**
 * Create a minimal JSON report
 */
export function formatMinimalJSON(result: AnalysisResult): string {
  const output = {
    hasRegressions: result.regressions.length > 0,
    regressionCount: result.regressions.length,
    improvementCount: result.improvements.length,
    criticalCount: result.regressions.filter((r) => r.severity === 'critical').length,
    highCount: result.regressions.filter((r) => r.severity === 'high').length,
    topRecommendations: result.recommendations.slice(0, 3).map((r) => r.title),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format as SARIF (Static Analysis Results Interchange Format)
 * Useful for GitHub Advanced Security integration
 */
export function formatAsSARIF(result: AnalysisResult): string {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'lhci-ai-assistant',
            informationUri: 'https://github.com/example/lhci-ai-assistant',
            rules: result.regressions.map((r) => ({
              id: `performance/${r.metric.toLowerCase().replace(/\s/g, '-')}`,
              name: r.metric,
              shortDescription: {
                text: `${r.metric} regression detected`,
              },
              fullDescription: {
                text: `${r.metric} changed from ${r.base} to ${r.current}`,
              },
              defaultConfiguration: {
                level: r.severity === 'critical' ? 'error' : r.severity === 'high' ? 'warning' : 'note',
              },
            })),
          },
        },
        results: result.regressions.map((r) => ({
          ruleId: `performance/${r.metric.toLowerCase().replace(/\s/g, '-')}`,
          level: r.severity === 'critical' ? 'error' : r.severity === 'high' ? 'warning' : 'note',
          message: {
            text: `${r.metric} regressed by ${formatDiff(r.metric, r.diff)}`,
          },
          locations: [],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

/**
 * Format diff value
 */
function formatDiff(metric: string, diff: number): string {
  const sign = diff >= 0 ? '+' : '';

  if (metric.includes('Score')) {
    return `${sign}${(diff * 100).toFixed(1)}%`;
  }
  if (metric === 'CLS') {
    return `${sign}${diff.toFixed(3)}`;
  }
  return `${sign}${diff.toFixed(0)}ms`;
}
