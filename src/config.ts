import { existsSync } from 'fs';
import { resolve } from 'path';
import { BaselineStrategy, Config } from './types';

const CONFIG_FILES = [
  '.lhcirc.js',
  'lhcirc.js',
  '.lhcirc.json',
  '.lhci-ai.js',
  '.lhci-ai.json',
];

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  const paths = configPath ? [configPath, ...CONFIG_FILES] : CONFIG_FILES;

  for (const path of paths) {
    const fullPath = resolve(process.cwd(), path);
    if (existsSync(fullPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const config = require(fullPath);
        return normalizeConfig(config);
      } catch (error) {
        console.warn(`Warning: Failed to load config from ${path}:`, error);
      }
    }
  }

  return {};
}

/**
 * Normalize configuration to ensure all values are valid
 */
function normalizeConfig(config: unknown): Config {
  if (!config || typeof config !== 'object') {
    return {};
  }

  const raw = config as Record<string, unknown>;
  const normalized: Config = {};

  if (raw.ai && typeof raw.ai === 'object') {
    const ai = raw.ai as Record<string, unknown>;
    normalized.ai = {
      provider: validateProvider(ai.provider),
      baselineStrategy: validateBaselineStrategy(ai.baselineStrategy),
      githubToken: typeof ai.githubToken === 'string' ? ai.githubToken : undefined,
      openaiKey: typeof ai.openaiKey === 'string' ? ai.openaiKey : undefined,
      autoFix: typeof ai.autoFix === 'boolean' ? ai.autoFix : undefined,
      outputFormat: validateOutputFormat(ai.outputFormat),
    };
  }

  if (raw.thresholds && typeof raw.thresholds === 'object') {
    const thresholds = raw.thresholds as Record<string, unknown>;
    normalized.thresholds = {
      performance: typeof thresholds.performance === 'number' ? thresholds.performance : undefined,
      accessibility: typeof thresholds.accessibility === 'number' ? thresholds.accessibility : undefined,
      bestPractices: typeof thresholds.bestPractices === 'number' ? thresholds.bestPractices : undefined,
      seo: typeof thresholds.seo === 'number' ? thresholds.seo : undefined,
    };
  }

  if (Array.isArray(raw.ignore)) {
    normalized.ignore = raw.ignore.filter((item): item is string => typeof item === 'string');
  }

  return normalized;
}

function validateProvider(value: unknown): 'copilot' | 'openai' | 'local' | undefined {
  if (value === 'copilot' || value === 'openai' || value === 'local') {
    return value;
  }
  return undefined;
}

function validateOutputFormat(value: unknown): 'terminal' | 'json' | 'markdown' | undefined {
  if (value === 'terminal' || value === 'json' || value === 'markdown') {
    return value;
  }
  return undefined;
}

function validateBaselineStrategy(
  value: unknown
): BaselineStrategy | undefined {
  if (
    value === 'latest' ||
    value === 'same-url' ||
    value === 'median' ||
    (typeof value === 'string' && /^p(?:[1-9]\d?|100)$/.test(value))
  ) {
    return value as BaselineStrategy;
  }
  return undefined;
}

/**
 * Merge CLI options with config file options
 * CLI options take precedence
 */
export function mergeOptions<T extends Record<string, unknown>>(
  configOptions: Partial<T>,
  cliOptions: Partial<T>
): T {
  const merged: Record<string, unknown> = { ...configOptions };

  for (const [key, value] of Object.entries(cliOptions)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

/**
 * Get GitHub token from environment or config
 */
export function getGitHubToken(config: Config): string | undefined {
  return (
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    config.ai?.githubToken
  );
}

/**
 * Get OpenAI API key from environment or config
 */
export function getOpenAIKey(config: Config): string | undefined {
  return (
    process.env.OPENAI_API_KEY ||
    config.ai?.openaiKey
  );
}
