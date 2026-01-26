import { MetricComparison, Opportunity, PRDiff } from '../types';
import { summarizeCodeChanges } from '../github/diff-fetcher';

/**
 * Generate the analysis prompt for the AI
 */
export function generateAnalysisPrompt(data: {
  regressions: MetricComparison[];
  improvements: MetricComparison[];
  opportunities: Opportunity[];
  codeDiff?: PRDiff;
}): string {
  const sections: string[] = [
    getSystemContext(),
    formatPerformanceChanges(data.regressions, data.improvements),
    formatCodeChanges(data.codeDiff),
    formatOpportunities(data.opportunities),
    getTaskInstructions(),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * System context for the AI
 */
function getSystemContext(): string {
  return `You are an expert web performance engineer analyzing Lighthouse CI results.
Your goal is to identify root causes of performance regressions and provide actionable recommendations.`;
}

/**
 * Format performance changes section
 */
function formatPerformanceChanges(
  regressions: MetricComparison[],
  improvements: MetricComparison[]
): string {
  const lines: string[] = ['## Performance Changes'];

  if (regressions.length > 0) {
    lines.push('\n### Regressions:');
    for (const r of regressions) {
      lines.push(`- ${r.metric}: ${formatValue(r.metric, r.base)} → ${formatValue(r.metric, r.current)} (${formatDiff(r.metric, r.diff)}) [${r.severity}]`);
    }
  } else {
    lines.push('\n### Regressions: None detected');
  }

  if (improvements.length > 0) {
    lines.push('\n### Improvements:');
    for (const i of improvements) {
      lines.push(`- ${i.metric}: ${formatValue(i.metric, i.base)} → ${formatValue(i.metric, i.current)} (${formatDiff(i.metric, i.diff)})`);
    }
  }

  return lines.join('\n');
}

/**
 * Format code changes section
 */
function formatCodeChanges(diff?: PRDiff): string {
  if (!diff) {
    return '## Code Changes\nNo code diff available.';
  }

  return `## Code Changes\n${summarizeCodeChanges(diff)}`;
}

/**
 * Format opportunities section
 */
function formatOpportunities(opportunities: Opportunity[]): string {
  if (opportunities.length === 0) {
    return '## Lighthouse Opportunities\nNo significant opportunities detected.';
  }

  const lines = ['## Lighthouse Opportunities'];
  for (const opp of opportunities.slice(0, 5)) {
    const savings = opp.savingsMs ? ` (potential ${opp.savingsMs.toFixed(0)}ms savings)` : '';
    lines.push(`- ${opp.title}${savings}`);
  }

  if (opportunities.length > 5) {
    lines.push(`- ... and ${opportunities.length - 5} more`);
  }

  return lines.join('\n');
}

/**
 * Task instructions for the AI
 */
function getTaskInstructions(): string {
  return `## Task

Analyze the performance changes above and provide:

1. **Root Cause Analysis**: For each regression, identify the likely cause based on the code changes and Lighthouse opportunities. Be specific about which changes might have caused the regression.

2. **Impact Assessment**: Explain how these changes affect real users (loading time, interactivity, visual stability).

3. **Recommendations**: Provide 3-5 specific, actionable recommendations to fix the regressions. Include:
   - What to change
   - Why it helps
   - Expected impact

4. **Priority**: Order recommendations by impact (highest first).

Keep your response focused and under 500 words. Use bullet points for clarity.`;
}

/**
 * Format a metric value for display
 */
function formatValue(metric: string, value: number): string {
  if (metric.includes('Score')) {
    return `${(value * 100).toFixed(0)}%`;
  }
  if (metric === 'CLS') {
    return value.toFixed(3);
  }
  return `${value.toFixed(0)}ms`;
}

/**
 * Format a diff value for display
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

/**
 * Generate a prompt for auto-fix suggestions
 */
export function generateAutoFixPrompt(data: {
  regression: MetricComparison;
  codeSnippet?: string;
  opportunity?: Opportunity;
}): string {
  return `You are a web performance expert. Generate a specific code fix for the following performance regression:

## Regression
${data.regression.metric}: ${formatValue(data.regression.metric, data.regression.base)} → ${formatValue(data.regression.metric, data.regression.current)}
Severity: ${data.regression.severity}

${data.opportunity ? `## Related Opportunity\n${data.opportunity.title}\n${data.opportunity.description || ''}` : ''}

${data.codeSnippet ? `## Relevant Code\n\`\`\`\n${data.codeSnippet}\n\`\`\`` : ''}

## Task
Provide a specific code change to fix this regression. Format your response as:

1. **Title**: Brief description of the fix
2. **Explanation**: Why this fix helps
3. **Code Change**: Show the before/after in diff format

\`\`\`diff
- old code
+ new code
\`\`\`

Be specific and practical. Only suggest changes that directly address the performance issue.`;
}

/**
 * Parse the AI response into structured recommendations
 */
export function parseAnalysisResponse(response: string): {
  rootCauses: Array<{ metric: string; cause: string; confidence: 'low' | 'medium' | 'high' }>;
  recommendations: Array<{ title: string; description: string; priority: 'low' | 'medium' | 'high'; impact: string; effort: 'low' | 'medium' | 'high' }>;
} {
  const rootCauses: Array<{ metric: string; cause: string; confidence: 'low' | 'medium' | 'high' }> = [];
  const recommendations: Array<{ title: string; description: string; priority: 'low' | 'medium' | 'high'; impact: string; effort: 'low' | 'medium' | 'high' }> = [];

  // Simple parsing - look for patterns in the response
  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('root cause') || lowerLine.includes('cause')) {
      currentSection = 'causes';
    } else if (lowerLine.includes('recommendation') || lowerLine.includes('suggest')) {
      currentSection = 'recommendations';
    }

    // Parse bullet points
    const bulletMatch = line.match(/^[-*•]\s*(.+)/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();

      if (currentSection === 'causes' && content.length > 10) {
        rootCauses.push({
          metric: 'Performance',
          cause: content,
          confidence: 'medium',
        });
      } else if (currentSection === 'recommendations' && content.length > 10) {
        recommendations.push({
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          description: content,
          priority: recommendations.length < 2 ? 'high' : 'medium',
          impact: 'Variable',
          effort: 'medium',
        });
      }
    }
  }

  return { rootCauses, recommendations };
}
