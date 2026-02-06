import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { BaselineStrategy, LHReport } from '../types';

const LHCI_DIR = '.lighthouseci';

/**
 * Load Lighthouse reports from the .lighthouseci directory
 */
export async function loadLighthouseReports(basePath?: string): Promise<LHReport[]> {
  const lhciDir = join(basePath || process.cwd(), LHCI_DIR);

  if (!existsSync(lhciDir)) {
    throw new Error(
      `No ${LHCI_DIR} directory found. Run \`lhci collect\` first to generate Lighthouse reports.`
    );
  }

  const files = readdirSync(lhciDir);
  const jsonFiles = files
    .filter((file) => file.startsWith('lhr-') && file.endsWith('.json'))
    .sort();

  if (jsonFiles.length === 0) {
    throw new Error(
      `No Lighthouse reports found in ${LHCI_DIR}. Run \`lhci collect\` first.`
    );
  }

  const reports: Array<{ file: string; report: LHReport }> = [];

  for (const file of jsonFiles) {
    try {
      const content = readFileSync(join(lhciDir, file), 'utf-8');
      const report = JSON.parse(content) as LHReport;
      reports.push({ file, report });
    } catch (error) {
      console.warn(`Warning: Failed to parse ${file}:`, error);
    }
  }

  if (reports.length === 0) {
    throw new Error('Failed to load any valid Lighthouse reports.');
  }

  return sortReportsByRecency(reports);
}

/**
 * Load a specific Lighthouse report by filename
 */
export async function loadReportByName(filename: string, basePath?: string): Promise<LHReport> {
  const lhciDir = join(basePath || process.cwd(), LHCI_DIR);
  const filePath = join(lhciDir, filename);

  if (!existsSync(filePath)) {
    throw new Error(`Report not found: ${filename}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as LHReport;
}

/**
 * Load the manifest file from .lighthouseci
 */
export async function loadManifest(basePath?: string): Promise<ManifestEntry[]> {
  const lhciDir = join(basePath || process.cwd(), LHCI_DIR);
  const manifestPath = join(lhciDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    return [];
  }

  const content = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content) as ManifestEntry[];
}

export interface ManifestEntry {
  url: string;
  isRepresentativeRun: boolean;
  jsonPath: string;
  htmlPath: string;
  summary: {
    performance: number;
    accessibility: number;
    'best-practices': number;
    seo: number;
    pwa?: number;
  };
}

/**
 * Get the representative run for each URL
 */
export async function getRepresentativeRuns(basePath?: string): Promise<Map<string, LHReport>> {
  const manifest = await loadManifest(basePath);
  const runs = new Map<string, LHReport>();

  for (const entry of manifest) {
    if (entry.isRepresentativeRun) {
      try {
        const report = await loadReportByName(
          normalizeManifestPath(entry.jsonPath),
          basePath
        );
        runs.set(entry.url, report);
      } catch (error) {
        console.warn(`Warning: Failed to load representative run for ${entry.url}`);
      }
    }
  }

  return runs;
}

/**
 * List available Lighthouse reports
 */
export function listReports(basePath?: string): string[] {
  const lhciDir = join(basePath || process.cwd(), LHCI_DIR);

  if (!existsSync(lhciDir)) {
    return [];
  }

  const files = readdirSync(lhciDir);
  return files
    .filter((file) => file.startsWith('lhr-') && file.endsWith('.json'))
    .sort();
}

export interface ReportPair {
  current: LHReport;
  baseline?: LHReport;
  baselineCandidates: LHReport[];
}

/**
 * Select a deterministic current and baseline report pair
 */
export function selectCurrentAndBaselineReports(
  reports: LHReport[],
  strategy: BaselineStrategy = 'same-url'
): ReportPair {
  if (reports.length === 0) {
    throw new Error('At least one Lighthouse report is required');
  }

  const current = reports[0];
  const historical = reports.slice(1);

  if (reports.length === 1) {
    return { current, baselineCandidates: [] };
  }

  const baselineCandidates = getBaselineCandidates(current, historical, strategy);
  const baseline = baselineCandidates[0];

  return { current, baseline, baselineCandidates };
}

function sortReportsByRecency(
  reports: Array<{ file: string; report: LHReport }>
): LHReport[] {
  return reports
    .sort((a, b) => {
      const aTime = parseTime(a.report.fetchTime);
      const bTime = parseTime(b.report.fetchTime);

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return b.file.localeCompare(a.file);
    })
    .map((entry) => entry.report);
}

function parseTime(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeManifestPath(jsonPath: string): string {
  return jsonPath.replace(/\\/g, '/').replace('.lighthouseci/', '');
}

function normalizeReportUrl(report: LHReport): string {
  const raw = report.requestedUrl || report.finalUrl || '';

  try {
    const parsed = new URL(raw);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${path}`;
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

function getBaselineCandidates(
  current: LHReport,
  historical: LHReport[],
  strategy: BaselineStrategy
): LHReport[] {
  if (historical.length === 0) {
    return [];
  }

  switch (strategy) {
    case 'latest':
      return historical.slice(0, 1);

    case 'median': {
      const sameUrl = historical.filter(
        (report) => normalizeReportUrl(report) === normalizeReportUrl(current)
      );

      return sameUrl.length > 0 ? sameUrl : historical;
    }

    case 'same-url':
    default: {
      if (/^p(?:[1-9]\d?|100)$/.test(strategy)) {
        const sameUrl = historical.filter(
          (report) => normalizeReportUrl(report) === normalizeReportUrl(current)
        );

        return sameUrl.length > 0 ? sameUrl : historical;
      }

      const sameUrl = historical.filter(
        (report) => normalizeReportUrl(report) === normalizeReportUrl(current)
      );

      return sameUrl.length > 0 ? sameUrl : historical.slice(0, 1);
    }
  }
}
