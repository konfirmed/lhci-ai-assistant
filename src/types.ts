/**
 * Core type definitions for LHCI AI Assistant
 */

// AI Provider types
export type AIProvider = 'copilot' | 'openai' | 'local';

// Output format types
export type OutputFormat = 'terminal' | 'json' | 'markdown';

// Lighthouse report structure
export interface LHReport {
  categories: Record<string, CategoryResult>;
  audits: Record<string, AuditResult>;
  finalUrl: string;
  fetchTime: string;
  requestedUrl?: string;
}

export interface CategoryResult {
  id: string;
  title: string;
  score: number | null;
  auditRefs?: AuditRef[];
}

export interface AuditRef {
  id: string;
  weight: number;
  group?: string;
}

export interface AuditResult {
  id: string;
  title: string;
  description: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  details?: AuditDetails;
}

export interface AuditDetails {
  type: string;
  items?: unknown[];
  overallSavingsMs?: number;
  overallSavingsBytes?: number;
}

// Extracted metrics
export interface Metrics {
  scores: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  coreWebVitals: {
    fcp?: number;
    lcp?: number;
    tbt?: number;
    cls?: number;
    speedIndex?: number;
    tti?: number;
  };
  opportunities: Opportunity[];
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  savingsMs?: number;
  savingsBytes?: number;
  score?: number;
}

// Comparison results
export interface MetricComparison {
  metric: string;
  base: number;
  current: number;
  diff: number;
  diffPercent: number;
  isRegression: boolean;
  isImprovement: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComparisonResult {
  regressions: MetricComparison[];
  improvements: MetricComparison[];
  unchanged: MetricComparison[];
  overallScore: {
    base: number;
    current: number;
    diff: number;
  };
}

// GitHub types
export interface GitHubFile {
  sha: string;
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRDiff {
  files: GitHubFile[];
  additions: number;
  deletions: number;
}

// Analysis options
export interface AnalyzeOptions {
  provider: AIProvider;
  githubToken?: string;
  openaiKey?: string;
  autoFix?: boolean;
  interactive?: boolean;
  postComment?: boolean;
  prNumber?: number;
  baseHash?: string;
  output: OutputFormat;
  configPath?: string;
  repo?: string;
}

// Analysis result
export interface AnalysisResult {
  summary: string;
  regressions: MetricComparison[];
  improvements: MetricComparison[];
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  autoFixes?: AutoFix[];
}

export interface RootCause {
  metric: string;
  cause: string;
  confidence: 'low' | 'medium' | 'high';
  relatedFiles?: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface AutoFix {
  id: string;
  title: string;
  description: string;
  file: string;
  diff: string;
  confidence: 'low' | 'medium' | 'high';
}

// Configuration
export interface Config {
  ai?: {
    provider?: AIProvider;
    githubToken?: string;
    openaiKey?: string;
    autoFix?: boolean;
    outputFormat?: OutputFormat;
  };
  thresholds?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  ignore?: string[];
}
