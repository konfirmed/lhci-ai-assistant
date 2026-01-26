import { GitHubFile, PRDiff } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetch the diff for a pull request
 */
export async function fetchPRDiff(options: {
  token: string;
  repo: string;
  prNumber: number;
}): Promise<PRDiff> {
  const url = `${GITHUB_API_BASE}/repos/${options.repo}/pulls/${options.prNumber}/files`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'lhci-ai-assistant',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }

  const files = (await response.json()) as GitHubFile[];

  return {
    files,
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };
}

/**
 * Fetch the diff between two commits
 */
export async function fetchCommitDiff(options: {
  token: string;
  repo: string;
  base: string;
  head: string;
}): Promise<PRDiff> {
  const url = `${GITHUB_API_BASE}/repos/${options.repo}/compare/${options.base}...${options.head}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'lhci-ai-assistant',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }

  const data = await response.json() as { files?: GitHubFile[] };
  const files = (data.files || []) as GitHubFile[];

  return {
    files,
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };
}

/**
 * Get repository name from environment variables
 */
export function getRepoFromEnv(): string | undefined {
  return process.env.GITHUB_REPOSITORY;
}

/**
 * Get PR number from environment variables (GitHub Actions)
 */
export function getPRNumberFromEnv(): number | undefined {
  // GitHub Actions sets GITHUB_REF for pull requests
  const ref = process.env.GITHUB_REF;
  if (ref) {
    const match = ref.match(/refs\/pull\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  // Also check GITHUB_EVENT_PATH for PR events
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const event = require(eventPath);
      if (event.pull_request?.number) {
        return event.pull_request.number;
      }
    } catch {
      // Ignore errors reading event file
    }
  }

  return undefined;
}

/**
 * Get the base commit hash from environment
 */
export function getBaseHashFromEnv(): string | undefined {
  // GitHub Actions sets GITHUB_BASE_REF for pull requests
  return process.env.GITHUB_BASE_REF || process.env.LHCI_BUILD_CONTEXT__BASE_HASH;
}

/**
 * Get the current commit hash from environment
 */
export function getCurrentHashFromEnv(): string | undefined {
  return process.env.GITHUB_SHA || process.env.LHCI_BUILD_CONTEXT__CURRENT_HASH;
}

/**
 * Filter files to only performance-relevant ones
 */
export function filterPerformanceRelevantFiles(files: GitHubFile[]): GitHubFile[] {
  const relevantExtensions = [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.vue',
    '.svelte',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.avif',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];

  const relevantPatterns = [
    /webpack/i,
    /vite/i,
    /rollup/i,
    /package\.json$/,
    /tsconfig\.json$/,
  ];

  return files.filter((file) => {
    const ext = file.filename.substring(file.filename.lastIndexOf('.'));
    if (relevantExtensions.includes(ext.toLowerCase())) {
      return true;
    }

    return relevantPatterns.some((pattern) => pattern.test(file.filename));
  });
}

/**
 * Summarize code changes for AI analysis
 */
export function summarizeCodeChanges(diff: PRDiff): string {
  if (!diff.files || diff.files.length === 0) {
    return 'No code changes available.';
  }

  const relevantFiles = filterPerformanceRelevantFiles(diff.files);

  if (relevantFiles.length === 0) {
    return 'No performance-relevant code changes detected.';
  }

  const lines: string[] = [
    `${relevantFiles.length} performance-relevant files changed:`,
  ];

  // Group by type
  const byType: Record<string, GitHubFile[]> = {};
  for (const file of relevantFiles) {
    const ext = file.filename.substring(file.filename.lastIndexOf('.'));
    if (!byType[ext]) {
      byType[ext] = [];
    }
    byType[ext].push(file);
  }

  for (const [ext, files] of Object.entries(byType)) {
    lines.push(`\n${ext} files (${files.length}):`);
    for (const file of files.slice(0, 5)) {
      lines.push(`  • ${file.filename} (+${file.additions}/-${file.deletions})`);
    }
    if (files.length > 5) {
      lines.push(`  ... and ${files.length - 5} more`);
    }
  }

  lines.push(`\nTotal: +${diff.additions}/-${diff.deletions} lines`);

  return lines.join('\n');
}
