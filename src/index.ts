/**
 * LHCI AI Assistant - Programmatic API
 *
 * This module exports the public API for using lhci-ai-assistant programmatically.
 */

// Main analyzer
export { analyze, quickCheck } from './analyzer';

// Types
export type {
  AIProvider,
  OutputFormat,
  AnalyzeOptions,
  AnalysisResult,
  Metrics,
  MetricComparison,
  ComparisonResult,
  Recommendation,
  RootCause,
  AutoFix,
  Config,
  LHReport,
  Opportunity,
  PRDiff,
  GitHubFile,
  BaselineStrategy,
} from './types';

// Configuration
export { loadConfig, mergeOptions, getGitHubToken, getOpenAIKey } from './config';

// Metrics
export {
  loadLighthouseReports,
  loadManifest,
  getRepresentativeRuns,
  selectCurrentAndBaselineReports,
} from './metrics/loader';
export { extractMetrics, getMetricsSummary, formatScore, formatMs, formatBytes } from './metrics/extractor';
export { compareMetrics, getComparisonSummary } from './metrics/comparator';
export {
  buildMedianBaselineMetrics,
  buildPercentileBaselineMetrics,
  getPercentileFromStrategy,
} from './metrics/baseline';

// GitHub
export {
  fetchPRDiff,
  fetchCommitDiff,
  getRepoFromEnv,
  getPRNumberFromEnv,
  filterPerformanceRelevantFiles,
} from './github/diff-fetcher';
export { postPRComment, formatPRComment } from './github/pr-commenter';

// AI
export { generateAnalysisPrompt, generateAutoFixPrompt, parseAnalysisResponse } from './ai/prompt';
export { analyzeWithCopilot, checkCopilotAccess, stopCopilotClient, listCopilotModels, CopilotError } from './ai/copilot';
export { analyzeWithOpenAI, checkOpenAIAccess, OpenAIError } from './ai/openai';
export { analyzeLocally } from './ai/local';

// Auto-fix
export { generateAutoFixes, scanForOptimizations, generateFixForRegression } from './autofix/generator';
export { fixPatterns, findApplicablePatterns, findPatternsForMetric } from './autofix/patterns';

// Output
export { outputToTerminal, outputProgress, outputSuccess, outputError, outputWarning } from './output/terminal';
export { formatAsMarkdown, formatQuickSummary } from './output/markdown';
export { formatAsJSON, parseFromJSON, formatMinimalJSON, formatAsSARIF } from './output/json';
