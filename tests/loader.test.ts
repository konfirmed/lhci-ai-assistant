import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadLighthouseReports,
  selectCurrentAndBaselineReports,
} from '../src/metrics/loader';
import { LHReport } from '../src/types';

function createReport(url: string, fetchTime: string, requestedUrl?: string): LHReport {
  return {
    categories: {
      performance: { id: 'performance', title: 'Performance', score: 0.9 },
    },
    audits: {},
    finalUrl: url,
    fetchTime,
    requestedUrl,
  };
}

describe('Metrics Loader', () => {
  describe('loadLighthouseReports', () => {
    it('should load reports sorted by latest fetchTime first', async () => {
      const baseDir = mkdtempSync(join(tmpdir(), 'lhci-ai-loader-'));
      const lhciDir = join(baseDir, '.lighthouseci');

      try {
        mkdirSync(lhciDir);

        writeFileSync(
          join(lhciDir, 'lhr-old.json'),
          JSON.stringify(createReport('https://example.com/old', '2024-01-01T00:00:00.000Z'))
        );
        writeFileSync(
          join(lhciDir, 'lhr-new.json'),
          JSON.stringify(createReport('https://example.com/new', '2024-01-02T00:00:00.000Z'))
        );

        const reports = await loadLighthouseReports(baseDir);

        expect(reports[0].finalUrl).toBe('https://example.com/new');
        expect(reports[1].finalUrl).toBe('https://example.com/old');
      } finally {
        rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('selectCurrentAndBaselineReports', () => {
    it('should prefer baseline from the same URL as current', () => {
      const current = createReport(
        'https://example.com/dashboard',
        '2024-01-03T00:00:00.000Z',
        'https://example.com/dashboard?run=current'
      );
      const other = createReport(
        'https://example.com/home',
        '2024-01-02T00:00:00.000Z'
      );
      const baseline = createReport(
        'https://example.com/dashboard',
        '2024-01-01T00:00:00.000Z',
        'https://example.com/dashboard?run=baseline'
      );

      const pair = selectCurrentAndBaselineReports([current, other, baseline]);

      expect(pair.current).toBe(current);
      expect(pair.baseline).toBe(baseline);
    });

    it('should fallback to the next report when same-URL baseline is unavailable', () => {
      const current = createReport('https://example.com/a', '2024-01-03T00:00:00.000Z');
      const next = createReport('https://example.com/b', '2024-01-02T00:00:00.000Z');
      const older = createReport('https://example.com/c', '2024-01-01T00:00:00.000Z');

      const pair = selectCurrentAndBaselineReports([current, next, older]);

      expect(pair.current).toBe(current);
      expect(pair.baseline).toBe(next);
    });

    it('should use second most recent report for latest strategy', () => {
      const current = createReport('https://example.com/a', '2024-01-03T00:00:00.000Z');
      const sameUrlOlder = createReport('https://example.com/a', '2024-01-01T00:00:00.000Z');
      const secondMostRecent = createReport('https://example.com/b', '2024-01-02T00:00:00.000Z');

      const pair = selectCurrentAndBaselineReports(
        [current, secondMostRecent, sameUrlOlder],
        'latest'
      );

      expect(pair.baseline).toBe(secondMostRecent);
      expect(pair.baselineCandidates).toEqual([secondMostRecent]);
    });

    it('should use all same-URL historical runs for median strategy', () => {
      const current = createReport(
        'https://example.com/dashboard',
        '2024-01-04T00:00:00.000Z',
        'https://example.com/dashboard?run=current'
      );
      const baselineA = createReport(
        'https://example.com/dashboard',
        '2024-01-03T00:00:00.000Z',
        'https://example.com/dashboard?run=1'
      );
      const otherUrl = createReport('https://example.com/home', '2024-01-02T00:00:00.000Z');
      const baselineB = createReport(
        'https://example.com/dashboard',
        '2024-01-01T00:00:00.000Z',
        'https://example.com/dashboard?run=2'
      );

      const pair = selectCurrentAndBaselineReports(
        [current, baselineA, otherUrl, baselineB],
        'median'
      );

      expect(pair.baselineCandidates).toEqual([baselineA, baselineB]);
      expect(pair.baseline).toBe(baselineA);
    });

    it('should use same-URL historical runs for percentile strategy', () => {
      const current = createReport('https://example.com/dashboard', '2024-01-04T00:00:00.000Z');
      const baselineA = createReport('https://example.com/dashboard', '2024-01-03T00:00:00.000Z');
      const otherUrl = createReport('https://example.com/home', '2024-01-02T00:00:00.000Z');
      const baselineB = createReport('https://example.com/dashboard', '2024-01-01T00:00:00.000Z');

      const pair = selectCurrentAndBaselineReports(
        [current, baselineA, otherUrl, baselineB],
        'p75'
      );

      expect(pair.baselineCandidates).toEqual([baselineA, baselineB]);
      expect(pair.baseline).toBe(baselineA);
    });
  });
});
