import { AnalysisResult } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const COMMENT_MARKER = '<!-- lhci-ai-assistant -->';

/**
 * Post or update a comment on a pull request
 */
export async function postPRComment(options: {
  token: string;
  repo: string;
  prNumber: number;
  body: string;
}): Promise<{ id: number; url: string }> {
  // First, try to find an existing comment from this tool
  const existingComment = await findExistingComment(options);

  if (existingComment) {
    // Update existing comment
    return updateComment({
      token: options.token,
      repo: options.repo,
      commentId: existingComment.id,
      body: options.body,
    });
  }

  // Create new comment
  return createComment(options);
}

/**
 * Find an existing comment from this tool
 */
async function findExistingComment(options: {
  token: string;
  repo: string;
  prNumber: number;
}): Promise<{ id: number; url: string } | null> {
  const url = `${GITHUB_API_BASE}/repos/${options.repo}/issues/${options.prNumber}/comments`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'lhci-ai-assistant',
    },
  });

  if (!response.ok) {
    return null;
  }

  const comments = await response.json() as Array<{ id: number; body?: string; html_url: string }>;

  for (const comment of comments) {
    if (comment.body?.includes(COMMENT_MARKER)) {
      return {
        id: comment.id,
        url: comment.html_url,
      };
    }
  }

  return null;
}

/**
 * Create a new comment
 */
async function createComment(options: {
  token: string;
  repo: string;
  prNumber: number;
  body: string;
}): Promise<{ id: number; url: string }> {
  const url = `${GITHUB_API_BASE}/repos/${options.repo}/issues/${options.prNumber}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'lhci-ai-assistant',
    },
    body: JSON.stringify({
      body: `${COMMENT_MARKER}\n${options.body}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create comment (${response.status}): ${error}`);
  }

  const data = await response.json() as { id: number; html_url: string };
  return {
    id: data.id,
    url: data.html_url,
  };
}

/**
 * Update an existing comment
 */
async function updateComment(options: {
  token: string;
  repo: string;
  commentId: number;
  body: string;
}): Promise<{ id: number; url: string }> {
  const url = `${GITHUB_API_BASE}/repos/${options.repo}/issues/comments/${options.commentId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'lhci-ai-assistant',
    },
    body: JSON.stringify({
      body: `${COMMENT_MARKER}\n${options.body}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update comment (${response.status}): ${error}`);
  }

  const data = await response.json() as { id: number; html_url: string };
  return {
    id: data.id,
    url: data.html_url,
  };
}

/**
 * Format analysis result as a PR comment
 */
export function formatPRComment(result: AnalysisResult): string {
  const lines: string[] = [
    '## 🔍 LHCI AI Analysis',
    '',
    result.summary,
    '',
  ];

  // Regressions
  if (result.regressions.length > 0) {
    lines.push('### ⚠️ Performance Regressions');
    lines.push('');
    lines.push('| Metric | Before | After | Change | Severity |');
    lines.push('|--------|--------|-------|--------|----------|');

    for (const r of result.regressions) {
      const before = formatMetricValue(r.metric, r.base);
      const after = formatMetricValue(r.metric, r.current);
      const change = formatChange(r.metric, r.diff);
      const severity = getSeverityEmoji(r.severity);
      lines.push(`| ${r.metric} | ${before} | ${after} | ${change} | ${severity} |`);
    }
    lines.push('');
  }

  // Improvements
  if (result.improvements.length > 0) {
    lines.push('### ✅ Improvements');
    lines.push('');

    for (const i of result.improvements) {
      const change = formatChange(i.metric, i.diff);
      lines.push(`- **${i.metric}**: ${change}`);
    }
    lines.push('');
  }

  // Root causes
  if (result.rootCauses.length > 0) {
    lines.push('### 🔎 Root Cause Analysis');
    lines.push('');

    for (const cause of result.rootCauses) {
      lines.push(`**${cause.metric}**: ${cause.cause}`);
      if (cause.relatedFiles && cause.relatedFiles.length > 0) {
        lines.push(`  - Related files: ${cause.relatedFiles.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('### 💡 Recommendations');
    lines.push('');

    for (const rec of result.recommendations) {
      const priority = getPriorityEmoji(rec.priority);
      lines.push(`${priority} **${rec.title}**`);
      lines.push(`   ${rec.description}`);
      lines.push('');
    }
  }

  // Auto-fixes
  if (result.autoFixes && result.autoFixes.length > 0) {
    lines.push('### 🔧 Suggested Fixes');
    lines.push('');

    for (const fix of result.autoFixes) {
      lines.push(`<details>`);
      lines.push(`<summary><strong>${fix.title}</strong></summary>`);
      lines.push('');
      lines.push(fix.description);
      lines.push('');
      lines.push('```diff');
      lines.push(fix.diff);
      lines.push('```');
      lines.push('</details>');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*Generated by [lhci-ai-assistant](https://github.com/example/lhci-ai-assistant)*');

  return lines.join('\n');
}

function formatMetricValue(metric: string, value: number): string {
  if (metric.includes('Score')) {
    return `${(value * 100).toFixed(0)}%`;
  }
  if (metric === 'CLS') {
    return value.toFixed(3);
  }
  return `${value.toFixed(0)}ms`;
}

function formatChange(metric: string, diff: number): string {
  const sign = diff >= 0 ? '+' : '';

  if (metric.includes('Score')) {
    return `${sign}${(diff * 100).toFixed(1)}%`;
  }
  if (metric === 'CLS') {
    return `${sign}${diff.toFixed(3)}`;
  }
  return `${sign}${diff.toFixed(0)}ms`;
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴 Critical';
    case 'high':
      return '🟠 High';
    case 'medium':
      return '🟡 Medium';
    case 'low':
      return '🟢 Low';
    default:
      return severity;
  }
}

function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '•';
  }
}
