import ora from 'ora';
import {
  AnalyzeOptions,
  AnalysisResult,
  Metrics,
  ComparisonResult,
  PRDiff,
} from './types';
import { loadLighthouseReports } from './metrics/loader';
import { extractMetrics } from './metrics/extractor';
import { compareMetrics } from './metrics/comparator';
import {
  fetchPRDiff,
  getRepoFromEnv,
  getPRNumberFromEnv,
} from './github/diff-fetcher';
import { postPRComment, formatPRComment } from './github/pr-commenter';
import { generateAnalysisPrompt, parseAnalysisResponse } from './ai/prompt';
import { analyzeWithCopilot, getCopilotErrorMessage } from './ai/copilot';
import { analyzeWithOpenAI, getOpenAIErrorMessage } from './ai/openai';
import { analyzeLocally } from './ai/local';
import { generateAutoFixes } from './autofix/generator';
import { outputToTerminal, outputSuccess } from './output/terminal';
import { formatAsMarkdown } from './output/markdown';
import { outputAsJSON } from './output/json';

/**
 * Main analysis orchestrator
 */
export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  const spinner = ora('Loading Lighthouse reports...').start();

  try {
    // Step 1: Load Lighthouse reports
    const reports = await loadLighthouseReports();
    spinner.succeed(`Loaded ${reports.length} Lighthouse report(s)`);

    // Step 2: Extract metrics from current run
    const currentMetrics = extractMetrics(reports[0]);
    spinner.start('Analyzing metrics...');

    // Step 3: Compare with baseline if available
    let comparison: ComparisonResult | null = null;
    if (reports.length > 1) {
      const baselineMetrics = extractMetrics(reports[reports.length - 1]);
      comparison = compareMetrics(currentMetrics, baselineMetrics);
    } else {
      // Create a mock comparison with just current data
      comparison = createMockComparison(currentMetrics);
    }

    spinner.succeed('Metrics analyzed');

    // Step 4: Fetch code diff if GitHub token provided
    let codeDiff: PRDiff | undefined;
    if (options.githubToken) {
      spinner.start('Fetching code changes...');
      try {
        codeDiff = await fetchCodeDiff(options);
        spinner.succeed('Code changes fetched');
      } catch (error) {
        spinner.warn('Could not fetch code diff');
      }
    }

    // Step 5: Run AI analysis
    spinner.start(`Analyzing with ${options.provider}...`);
    let result: AnalysisResult;

    try {
      result = await runAIAnalysis(
        options,
        comparison,
        currentMetrics,
        codeDiff
      );
      spinner.succeed('AI analysis complete');
    } catch (error) {
      spinner.warn(`AI analysis failed, using local heuristics: ${error}`);
      result = analyzeLocally({
        regressions: comparison.regressions,
        improvements: comparison.improvements,
        opportunities: currentMetrics.opportunities,
      });
    }

    // Step 6: Generate auto-fixes if requested
    if (options.autoFix && codeDiff) {
      spinner.start('Generating auto-fix suggestions...');
      const fixes = await generateAutoFixes(
        comparison.regressions,
        codeDiff.files
      );
      result.autoFixes = fixes;
      spinner.succeed(`Generated ${fixes.length} fix suggestion(s)`);
    }

    // Step 7: Output results
    outputResults(result, options);

    // Step 8: Post to PR if requested
    if (options.postComment && options.githubToken) {
      spinner.start('Posting comment to PR...');
      try {
        await postComment(result, options);
        spinner.succeed('Comment posted to PR');
      } catch (error) {
        spinner.fail(`Failed to post comment: ${error}`);
      }
    }

    return result;
  } catch (error) {
    spinner.fail('Analysis failed');
    throw error;
  }
}

/**
 * Fetch code diff from GitHub
 */
async function fetchCodeDiff(options: AnalyzeOptions): Promise<PRDiff | undefined> {
  if (!options.githubToken) return undefined;

  const repo = options.repo || getRepoFromEnv();
  const prNumber = options.prNumber || getPRNumberFromEnv();

  if (!repo) {
    throw new Error('GitHub repository not specified');
  }

  if (!prNumber) {
    throw new Error('PR number not specified');
  }

  return fetchPRDiff({
    token: options.githubToken,
    repo,
    prNumber,
  });
}

/**
 * Run AI analysis using the specified provider
 */
async function runAIAnalysis(
  options: AnalyzeOptions,
  comparison: ComparisonResult,
  metrics: Metrics,
  codeDiff?: PRDiff
): Promise<AnalysisResult> {
  // Generate prompt
  const prompt = generateAnalysisPrompt({
    regressions: comparison.regressions,
    improvements: comparison.improvements,
    opportunities: metrics.opportunities,
    codeDiff,
  });

  let aiResponse: string;

  switch (options.provider) {
    case 'copilot':
      try {
        // The Copilot SDK handles auth via GitHub CLI or environment variables
        aiResponse = await analyzeWithCopilot(prompt, {
          token: options.githubToken,
        });
      } catch (error) {
        throw new Error(getCopilotErrorMessage(error));
      }
      break;

    case 'openai':
      if (!options.openaiKey) {
        throw new Error('OpenAI API key required');
      }
      try {
        aiResponse = await analyzeWithOpenAI(prompt, {
          apiKey: options.openaiKey,
        });
      } catch (error) {
        throw new Error(getOpenAIErrorMessage(error));
      }
      break;

    case 'local':
    default:
      return analyzeLocally({
        regressions: comparison.regressions,
        improvements: comparison.improvements,
        opportunities: metrics.opportunities,
      });
  }

  // Parse AI response
  const { rootCauses, recommendations } = parseAnalysisResponse(aiResponse);

  return {
    summary: aiResponse,
    regressions: comparison.regressions,
    improvements: comparison.improvements,
    rootCauses,
    recommendations,
  };
}

/**
 * Output results in the specified format
 */
function outputResults(result: AnalysisResult, options: AnalyzeOptions): void {
  switch (options.output) {
    case 'json':
      outputAsJSON(result);
      break;

    case 'markdown':
      console.log(formatAsMarkdown(result));
      break;

    case 'terminal':
    default:
      outputToTerminal(result);
      break;
  }
}

/**
 * Post analysis as a PR comment
 */
async function postComment(
  result: AnalysisResult,
  options: AnalyzeOptions
): Promise<void> {
  if (!options.githubToken) {
    throw new Error('GitHub token required to post comments');
  }

  const repo = options.repo || getRepoFromEnv();
  const prNumber = options.prNumber || getPRNumberFromEnv();

  if (!repo || !prNumber) {
    throw new Error('Repository and PR number required to post comments');
  }

  const body = formatPRComment(result);

  const { url } = await postPRComment({
    token: options.githubToken,
    repo,
    prNumber,
    body,
  });

  outputSuccess(`Comment posted: ${url}`);
}

/**
 * Create a mock comparison when no baseline is available
 */
function createMockComparison(metrics: Metrics): ComparisonResult {
  return {
    regressions: [],
    improvements: [],
    unchanged: [],
    overallScore: {
      base: metrics.scores.performance || 0,
      current: metrics.scores.performance || 0,
      diff: 0,
    },
  };
}

/**
 * Quick analysis without AI - useful for CI/CD gates
 */
export async function quickCheck(thresholds?: {
  performance?: number;
  accessibility?: number;
  bestPractices?: number;
  seo?: number;
}): Promise<{
  passed: boolean;
  scores: Record<string, number>;
  failures: string[];
}> {
  const reports = await loadLighthouseReports();
  const metrics = extractMetrics(reports[0]);
  const failures: string[] = [];

  const defaults = {
    performance: 0.9,
    accessibility: 0.9,
    bestPractices: 0.9,
    seo: 0.9,
  };

  const checks = { ...defaults, ...thresholds };

  if (metrics.scores.performance !== undefined && metrics.scores.performance < checks.performance) {
    failures.push(`Performance: ${(metrics.scores.performance * 100).toFixed(0)}% < ${(checks.performance * 100).toFixed(0)}%`);
  }
  if (metrics.scores.accessibility !== undefined && metrics.scores.accessibility < checks.accessibility) {
    failures.push(`Accessibility: ${(metrics.scores.accessibility * 100).toFixed(0)}% < ${(checks.accessibility * 100).toFixed(0)}%`);
  }
  if (metrics.scores.bestPractices !== undefined && metrics.scores.bestPractices < checks.bestPractices) {
    failures.push(`Best Practices: ${(metrics.scores.bestPractices * 100).toFixed(0)}% < ${(checks.bestPractices * 100).toFixed(0)}%`);
  }
  if (metrics.scores.seo !== undefined && metrics.scores.seo < checks.seo) {
    failures.push(`SEO: ${(metrics.scores.seo * 100).toFixed(0)}% < ${(checks.seo * 100).toFixed(0)}%`);
  }

  return {
    passed: failures.length === 0,
    scores: {
      performance: metrics.scores.performance || 0,
      accessibility: metrics.scores.accessibility || 0,
      bestPractices: metrics.scores.bestPractices || 0,
      seo: metrics.scores.seo || 0,
    },
    failures,
  };
}
