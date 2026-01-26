import {
  filterPerformanceRelevantFiles,
  summarizeCodeChanges,
} from '../src/github/diff-fetcher';
import { formatPRComment } from '../src/github/pr-commenter';
import { GitHubFile, AnalysisResult } from '../src/types';

describe('GitHub Diff Fetcher', () => {
  describe('filterPerformanceRelevantFiles', () => {
    const mockFiles: GitHubFile[] = [
      {
        sha: '1',
        filename: 'src/App.tsx',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
      },
      {
        sha: '2',
        filename: 'src/styles.css',
        status: 'modified',
        additions: 20,
        deletions: 10,
        changes: 30,
      },
      {
        sha: '3',
        filename: 'README.md',
        status: 'modified',
        additions: 5,
        deletions: 2,
        changes: 7,
      },
      {
        sha: '4',
        filename: 'public/logo.png',
        status: 'added',
        additions: 0,
        deletions: 0,
        changes: 0,
      },
      {
        sha: '5',
        filename: 'package.json',
        status: 'modified',
        additions: 2,
        deletions: 1,
        changes: 3,
      },
      {
        sha: '6',
        filename: 'webpack.config.js',
        status: 'modified',
        additions: 15,
        deletions: 5,
        changes: 20,
      },
    ];

    it('should filter to performance-relevant files', () => {
      const filtered = filterPerformanceRelevantFiles(mockFiles);

      // Should include tsx, css, png, package.json, webpack config
      expect(filtered.length).toBeGreaterThan(0);

      // Should not include README.md
      const hasReadme = filtered.some((f) => f.filename === 'README.md');
      expect(hasReadme).toBe(false);
    });

    it('should include TypeScript/JavaScript files', () => {
      const filtered = filterPerformanceRelevantFiles(mockFiles);

      const hasTsx = filtered.some((f) => f.filename.endsWith('.tsx'));
      expect(hasTsx).toBe(true);
    });

    it('should include CSS files', () => {
      const filtered = filterPerformanceRelevantFiles(mockFiles);

      const hasCss = filtered.some((f) => f.filename.endsWith('.css'));
      expect(hasCss).toBe(true);
    });

    it('should include image files', () => {
      const filtered = filterPerformanceRelevantFiles(mockFiles);

      const hasPng = filtered.some((f) => f.filename.endsWith('.png'));
      expect(hasPng).toBe(true);
    });

    it('should include build config files', () => {
      const filtered = filterPerformanceRelevantFiles(mockFiles);

      const hasWebpack = filtered.some((f) => f.filename.includes('webpack'));
      expect(hasWebpack).toBe(true);
    });
  });

  describe('summarizeCodeChanges', () => {
    it('should summarize code changes', () => {
      const diff = {
        files: [
          {
            sha: '1',
            filename: 'src/App.tsx',
            status: 'modified' as const,
            additions: 10,
            deletions: 5,
            changes: 15,
          },
          {
            sha: '2',
            filename: 'src/styles.css',
            status: 'modified' as const,
            additions: 20,
            deletions: 10,
            changes: 30,
          },
        ],
        additions: 30,
        deletions: 15,
      };

      const summary = summarizeCodeChanges(diff);

      expect(summary).toContain('performance-relevant files changed');
      expect(summary).toContain('App.tsx');
      expect(summary).toContain('styles.css');
    });

    it('should handle empty diff', () => {
      const diff = {
        files: [],
        additions: 0,
        deletions: 0,
      };

      const summary = summarizeCodeChanges(diff);

      expect(summary).toContain('No code changes available');
    });
  });
});

describe('PR Commenter', () => {
  describe('formatPRComment', () => {
    const mockResult: AnalysisResult = {
      summary: 'Performance analysis complete. Found 2 regressions.',
      regressions: [
        {
          metric: 'LCP',
          base: 2000,
          current: 3000,
          diff: 1000,
          diffPercent: 50,
          isRegression: true,
          isImprovement: false,
          severity: 'high',
        },
        {
          metric: 'Performance Score',
          base: 0.9,
          current: 0.8,
          diff: -0.1,
          diffPercent: -11.1,
          isRegression: true,
          isImprovement: false,
          severity: 'medium',
        },
      ],
      improvements: [
        {
          metric: 'TBT',
          base: 200,
          current: 100,
          diff: -100,
          diffPercent: -50,
          isRegression: false,
          isImprovement: true,
          severity: 'low',
        },
      ],
      rootCauses: [
        {
          metric: 'LCP',
          cause: 'Large image added to hero section',
          confidence: 'high',
          relatedFiles: ['src/Hero.tsx'],
        },
      ],
      recommendations: [
        {
          title: 'Optimize hero image',
          description: 'Compress and resize the hero image',
          priority: 'high',
          impact: '~500ms improvement',
          effort: 'low',
        },
      ],
    };

    it('should format as valid Markdown', () => {
      const comment = formatPRComment(mockResult);

      // Should have title
      expect(comment).toContain('LHCI AI Analysis');

      // Should have regressions table
      expect(comment).toContain('Performance Regressions');
      expect(comment).toContain('| Metric |');
      expect(comment).toContain('LCP');

      // Should have improvements
      expect(comment).toContain('Improvements');
      expect(comment).toContain('TBT');

      // Should have root causes
      expect(comment).toContain('Root Cause');
      expect(comment).toContain('hero section');

      // Should have recommendations
      expect(comment).toContain('Recommendations');
      expect(comment).toContain('Optimize hero image');
    });

    it('should include severity indicators', () => {
      const comment = formatPRComment(mockResult);

      // Should have severity emojis
      expect(comment).toMatch(/🔴|🟠|🟡|🟢/);
    });

    it('should include signature', () => {
      const comment = formatPRComment(mockResult);

      expect(comment).toContain('lhci-ai-assistant');
    });
  });
});
