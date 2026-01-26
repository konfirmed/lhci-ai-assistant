#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { analyze, quickCheck } from './analyzer';
import { loadConfig, getGitHubToken, getOpenAIKey } from './config';
import { AnalyzeOptions, AIProvider, OutputFormat } from './types';
import { outputSuccess, outputError } from './output/terminal';

const program = new Command();

program
  .name('lhci-ai')
  .description('AI-powered analysis for Lighthouse CI')
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze Lighthouse results with AI')
  .option('--github-token <token>', 'GitHub token for Copilot/PR access')
  .option('--provider <name>', 'AI provider: copilot | openai | local', 'local')
  .option('--openai-key <key>', 'OpenAI API key')
  .option('--auto-fix', 'Generate auto-fix suggestions', false)
  .option('--interactive', 'Apply fixes interactively', false)
  .option('--post-comment', 'Post analysis to GitHub PR', false)
  .option('--pr-number <number>', 'PR number', parseInt)
  .option('--repo <repo>', 'GitHub repository (owner/repo)')
  .option('--base-hash <hash>', 'Base commit hash for comparison')
  .option('--output <format>', 'Output format: terminal | json | markdown', 'terminal')
  .option('--config <path>', 'Config file path')
  .action(async (cliOptions) => {
    try {
      // Load config file
      const config = await loadConfig(cliOptions.config);

      // Merge CLI options with config
      const options: AnalyzeOptions = {
        provider: (cliOptions.provider || config.ai?.provider || 'local') as AIProvider,
        githubToken: cliOptions.githubToken || getGitHubToken(config),
        openaiKey: cliOptions.openaiKey || getOpenAIKey(config),
        autoFix: cliOptions.autoFix ?? config.ai?.autoFix ?? false,
        interactive: cliOptions.interactive ?? false,
        postComment: cliOptions.postComment ?? false,
        prNumber: cliOptions.prNumber,
        baseHash: cliOptions.baseHash,
        output: (cliOptions.output || config.ai?.outputFormat || 'terminal') as OutputFormat,
        repo: cliOptions.repo,
      };

      // Validate options
      // Note: Copilot SDK handles auth via GitHub CLI (gh auth login) or environment
      if (options.provider === 'openai' && !options.openaiKey) {
        console.error(chalk.red('Error: OpenAI API key required for OpenAI provider'));
        console.error(chalk.dim('Set OPENAI_API_KEY environment variable or use --openai-key'));
        process.exit(1);
      }

      if (options.postComment && !options.githubToken) {
        console.error(chalk.red('Error: GitHub token required to post PR comments'));
        process.exit(1);
      }

      // Run analysis
      await analyze(options);
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Quick threshold check for CI/CD gates')
  .option('--performance <score>', 'Minimum performance score (0-100)', parseFloat)
  .option('--accessibility <score>', 'Minimum accessibility score (0-100)', parseFloat)
  .option('--best-practices <score>', 'Minimum best practices score (0-100)', parseFloat)
  .option('--seo <score>', 'Minimum SEO score (0-100)', parseFloat)
  .action(async (options) => {
    try {
      const thresholds: Record<string, number> = {};

      if (options.performance !== undefined) {
        thresholds.performance = options.performance / 100;
      }
      if (options.accessibility !== undefined) {
        thresholds.accessibility = options.accessibility / 100;
      }
      if (options.bestPractices !== undefined) {
        thresholds.bestPractices = options.bestPractices / 100;
      }
      if (options.seo !== undefined) {
        thresholds.seo = options.seo / 100;
      }

      const result = await quickCheck(thresholds);

      console.log();
      console.log(chalk.bold('Lighthouse Scores:'));
      console.log(`  Performance:    ${formatScore(result.scores.performance)}`);
      console.log(`  Accessibility:  ${formatScore(result.scores.accessibility)}`);
      console.log(`  Best Practices: ${formatScore(result.scores.bestPractices)}`);
      console.log(`  SEO:            ${formatScore(result.scores.seo)}`);
      console.log();

      if (result.passed) {
        outputSuccess('All thresholds passed!');
        process.exit(0);
      } else {
        console.log(chalk.red.bold('Threshold failures:'));
        for (const failure of result.failures) {
          console.log(chalk.red(`  ✗ ${failure}`));
        }
        process.exit(1);
      }
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize lhci-ai configuration')
  .action(async () => {
    console.log(chalk.bold('LHCI AI Assistant Setup'));
    console.log();
    console.log('Create a configuration file to customize lhci-ai behavior:');
    console.log();
    console.log(chalk.cyan('.lhci-ai.js:'));
    console.log(chalk.dim(`
module.exports = {
  ai: {
    provider: 'local', // 'copilot' | 'openai' | 'local'
    autoFix: true,
    outputFormat: 'terminal',
  },
  thresholds: {
    performance: 0.9,
    accessibility: 0.9,
    bestPractices: 0.9,
    seo: 0.9,
  },
};
`));
    console.log();
    console.log('Environment variables:');
    console.log(chalk.dim('  GITHUB_TOKEN   - GitHub token for Copilot/PR access'));
    console.log(chalk.dim('  OPENAI_API_KEY - OpenAI API key'));
    console.log();
  });

// Helper function to format score with color
function formatScore(score: number): string {
  const pct = Math.round(score * 100);
  if (pct >= 90) {
    return chalk.green(`${pct}%`);
  } else if (pct >= 50) {
    return chalk.yellow(`${pct}%`);
  } else {
    return chalk.red(`${pct}%`);
  }
}

// Parse command line arguments
program.parse();
