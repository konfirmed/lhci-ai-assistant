import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { LHReport } from '../types';

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
  const jsonFiles = files.filter((file) => file.startsWith('lhr-') && file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    throw new Error(
      `No Lighthouse reports found in ${LHCI_DIR}. Run \`lhci collect\` first.`
    );
  }

  const reports: LHReport[] = [];

  for (const file of jsonFiles) {
    try {
      const content = readFileSync(join(lhciDir, file), 'utf-8');
      const report = JSON.parse(content) as LHReport;
      reports.push(report);
    } catch (error) {
      console.warn(`Warning: Failed to parse ${file}:`, error);
    }
  }

  if (reports.length === 0) {
    throw new Error('Failed to load any valid Lighthouse reports.');
  }

  return reports;
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
          entry.jsonPath.replace('.lighthouseci/', ''),
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
  return files.filter((file) => file.startsWith('lhr-') && file.endsWith('.json'));
}
