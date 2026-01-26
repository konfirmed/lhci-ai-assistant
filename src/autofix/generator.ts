import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AutoFix, MetricComparison, GitHubFile } from '../types';
import { findApplicablePatterns, findPatternsForMetric, applyPattern, FixPattern } from './patterns';

export interface GeneratorOptions {
  basePath?: string;
  maxFixes?: number;
  minConfidence?: 'low' | 'medium' | 'high';
}

/**
 * Generate auto-fix suggestions based on regressions and code changes
 */
export async function generateAutoFixes(
  regressions: MetricComparison[],
  changedFiles: GitHubFile[],
  options: GeneratorOptions = {}
): Promise<AutoFix[]> {
  const fixes: AutoFix[] = [];
  const basePath = options.basePath || process.cwd();
  const maxFixes = options.maxFixes || 10;
  const minConfidence = options.minConfidence || 'medium';

  // Get patterns relevant to the regressed metrics
  const relevantMetrics = regressions.map((r) => r.metric);
  const relevantPatterns: FixPattern[] = [];

  for (const metric of relevantMetrics) {
    const patterns = findPatternsForMetric(metric);
    for (const pattern of patterns) {
      if (!relevantPatterns.some((p) => p.id === pattern.id)) {
        relevantPatterns.push(pattern);
      }
    }
  }

  // Filter by confidence level
  const confidenceOrder = { low: 0, medium: 1, high: 2 };
  const filteredPatterns = relevantPatterns.filter(
    (p) => confidenceOrder[p.confidence] >= confidenceOrder[minConfidence]
  );

  // Check changed files for applicable fixes
  for (const file of changedFiles) {
    if (fixes.length >= maxFixes) break;

    const filePath = join(basePath, file.filename);
    if (!existsSync(filePath)) continue;

    try {
      const code = readFileSync(filePath, 'utf-8');
      const applicablePatterns = findApplicablePatterns(code, file.filename);

      // Only consider patterns that are both applicable and relevant to regressions
      const relevantApplicable = applicablePatterns.filter((p) =>
        filteredPatterns.some((fp) => fp.id === p.id)
      );

      for (const pattern of relevantApplicable) {
        if (fixes.length >= maxFixes) break;

        const result = applyPattern(pattern, code, file.filename);
        if (result.fixed) {
          fixes.push({
            id: `${pattern.id}-${file.filename}`,
            title: pattern.name,
            description: pattern.description,
            file: file.filename,
            diff: result.diff,
            confidence: pattern.confidence,
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  // Sort by confidence (high first)
  return fixes.sort(
    (a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
  );
}

/**
 * Scan a directory for potential optimizations
 */
export async function scanForOptimizations(
  directory: string,
  options: GeneratorOptions = {}
): Promise<AutoFix[]> {
  const fixes: AutoFix[] = [];
  const maxFixes = options.maxFixes || 20;

  // Common patterns to scan (reserved for future glob implementation)
  const _scanPatterns = [
    '**/*.html',
    '**/*.jsx',
    '**/*.tsx',
    '**/*.css',
    '**/*.vue',
    '**/*.svelte',
  ];

  // This would need glob to find files - simplified for now
  // In a real implementation, use glob to find files
  void _scanPatterns; // Suppress unused variable warning

  return fixes.slice(0, maxFixes);
}

/**
 * Generate a fix suggestion for a specific regression
 */
export function generateFixForRegression(
  regression: MetricComparison
): string {
  const suggestions: Record<string, string> = {
    FCP: `To improve First Contentful Paint:
1. Inline critical CSS or use preload
2. Defer non-critical JavaScript
3. Add preconnect for third-party origins
4. Reduce server response time (TTFB)`,

    LCP: `To improve Largest Contentful Paint:
1. Preload the LCP image/resource
2. Use responsive images with srcset
3. Optimize and compress images (WebP/AVIF)
4. Use a CDN for assets`,

    TBT: `To improve Total Blocking Time:
1. Split large JavaScript bundles
2. Remove unused JavaScript
3. Defer third-party scripts
4. Use web workers for heavy computations`,

    CLS: `To improve Cumulative Layout Shift:
1. Add explicit width/height to images and videos
2. Reserve space for dynamic content
3. Avoid inserting content above existing content
4. Use transform animations instead of layout-triggering properties`,

    'Speed Index': `To improve Speed Index:
1. Eliminate render-blocking resources
2. Inline critical CSS
3. Optimize the critical rendering path
4. Lazy load below-the-fold content`,

    TTI: `To improve Time to Interactive:
1. Reduce JavaScript execution time
2. Code-split and lazy load non-critical code
3. Minimize main thread work
4. Use progressive hydration for frameworks`,
  };

  return suggestions[regression.metric] ||
    `Review the ${regression.metric} regression and check related Lighthouse audits for specific recommendations.`;
}

/**
 * Format auto-fixes as a diff patch
 */
export function formatAsUnifiedDiff(fix: AutoFix): string {
  return `--- a/${fix.file}
+++ b/${fix.file}
${fix.diff}`;
}

/**
 * Validate that a fix is still applicable
 */
export function validateFix(fix: AutoFix, basePath?: string): boolean {
  const filePath = join(basePath || process.cwd(), fix.file);

  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const code = readFileSync(filePath, 'utf-8');
    const patterns = findApplicablePatterns(code, fix.file);
    return patterns.some((p) => p.id === fix.id.split('-')[0]);
  } catch {
    return false;
  }
}
