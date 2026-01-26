import { analyzeLocally } from '../src/ai/local';
import { generateAnalysisPrompt, parseAnalysisResponse } from '../src/ai/prompt';
import { MetricComparison, Opportunity } from '../src/types';

describe('Local Analyzer', () => {
  const mockRegressions: MetricComparison[] = [
    {
      metric: 'LCP',
      base: 2000,
      current: 3500,
      diff: 1500,
      diffPercent: 75,
      isRegression: true,
      isImprovement: false,
      severity: 'high',
    },
    {
      metric: 'CLS',
      base: 0.05,
      current: 0.15,
      diff: 0.1,
      diffPercent: 200,
      isRegression: true,
      isImprovement: false,
      severity: 'medium',
    },
  ];

  const mockImprovements: MetricComparison[] = [
    {
      metric: 'TBT',
      base: 300,
      current: 150,
      diff: -150,
      diffPercent: -50,
      isRegression: false,
      isImprovement: true,
      severity: 'low',
    },
  ];

  const mockOpportunities: Opportunity[] = [
    {
      id: 'render-blocking-resources',
      title: 'Eliminate render-blocking resources',
      savingsMs: 500,
    },
    {
      id: 'uses-responsive-images',
      title: 'Properly size images',
      savingsMs: 800,
    },
  ];

  describe('analyzeLocally', () => {
    it('should generate analysis result', () => {
      const result = analyzeLocally({
        regressions: mockRegressions,
        improvements: mockImprovements,
        opportunities: mockOpportunities,
      });

      expect(result.summary).toBeDefined();
      expect(result.regressions).toEqual(mockRegressions);
      expect(result.improvements).toEqual(mockImprovements);
    });

    it('should identify root causes', () => {
      const result = analyzeLocally({
        regressions: mockRegressions,
        improvements: mockImprovements,
        opportunities: mockOpportunities,
      });

      expect(result.rootCauses.length).toBeGreaterThan(0);

      // Should have cause for LCP
      const lcpCause = result.rootCauses.find((c) => c.metric === 'LCP');
      expect(lcpCause).toBeDefined();
      expect(lcpCause?.cause).toContain('Largest Contentful Paint');
    });

    it('should generate recommendations', () => {
      const result = analyzeLocally({
        regressions: mockRegressions,
        improvements: mockImprovements,
        opportunities: mockOpportunities,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should include opportunity-based recommendations
      const hasOpportunityRec = result.recommendations.some(
        (r) => r.title.includes('render-blocking') || r.title.includes('image')
      );
      expect(hasOpportunityRec).toBe(true);
    });

    it('should prioritize recommendations', () => {
      const result = analyzeLocally({
        regressions: mockRegressions,
        improvements: mockImprovements,
        opportunities: mockOpportunities,
      });

      // First recommendations should be high priority
      const priorities = result.recommendations.map((r) => r.priority);
      const highCount = priorities.filter((p) => p === 'high').length;

      // Should have some high priority items
      expect(highCount).toBeGreaterThan(0);
    });
  });
});

describe('AI Prompt Generator', () => {
  const mockData = {
    regressions: [
      {
        metric: 'LCP',
        base: 2000,
        current: 3000,
        diff: 1000,
        diffPercent: 50,
        isRegression: true,
        isImprovement: false,
        severity: 'high' as const,
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
        severity: 'low' as const,
      },
    ],
    opportunities: [
      {
        id: 'render-blocking-resources',
        title: 'Eliminate render-blocking resources',
        savingsMs: 500,
      },
    ],
  };

  describe('generateAnalysisPrompt', () => {
    it('should include performance changes', () => {
      const prompt = generateAnalysisPrompt(mockData);

      expect(prompt).toContain('Performance Changes');
      expect(prompt).toContain('LCP');
      expect(prompt).toContain('2000');
      expect(prompt).toContain('3000');
    });

    it('should include opportunities', () => {
      const prompt = generateAnalysisPrompt(mockData);

      expect(prompt).toContain('Lighthouse Opportunities');
      expect(prompt).toContain('render-blocking');
    });

    it('should include task instructions', () => {
      const prompt = generateAnalysisPrompt(mockData);

      expect(prompt).toContain('Root Cause');
      expect(prompt).toContain('Recommendations');
    });

    it('should handle code diff', () => {
      const dataWithDiff = {
        ...mockData,
        codeDiff: {
          files: [
            {
              sha: '1',
              filename: 'src/App.tsx',
              status: 'modified' as const,
              additions: 10,
              deletions: 5,
              changes: 15,
            },
          ],
          additions: 10,
          deletions: 5,
        },
      };

      const prompt = generateAnalysisPrompt(dataWithDiff);

      expect(prompt).toContain('Code Changes');
      expect(prompt).toContain('App.tsx');
    });
  });

  describe('parseAnalysisResponse', () => {
    it('should parse root causes from response', () => {
      const response = `
## Root Cause Analysis
- The LCP regression is caused by a large unoptimized image
- JavaScript bundle size increased by 50KB

## Recommendations
- Optimize the hero image using WebP format
- Implement code splitting for the dashboard module
      `;

      const parsed = parseAnalysisResponse(response);

      expect(parsed.rootCauses.length).toBeGreaterThan(0);
    });

    it('should parse recommendations from response', () => {
      const response = `
## Root Cause Analysis
- Large image file added

## Recommendations
- Compress images using modern formats
- Add lazy loading for below-fold content
- Defer third-party scripts
      `;

      const parsed = parseAnalysisResponse(response);

      expect(parsed.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty response', () => {
      const response = '';

      const parsed = parseAnalysisResponse(response);

      expect(parsed.rootCauses).toEqual([]);
      expect(parsed.recommendations).toEqual([]);
    });
  });
});
