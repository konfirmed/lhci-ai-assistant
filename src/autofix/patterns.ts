/**
 * Known performance fix patterns
 * These are common optimizations that can be automatically suggested
 */

export interface FixPattern {
  id: string;
  name: string;
  description: string;
  metrics: string[]; // Which metrics this affects
  detect: (code: string, filename: string) => boolean;
  fix: (code: string, filename: string) => string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Collection of known fix patterns
 */
export const fixPatterns: FixPattern[] = [
  // Image optimization patterns
  {
    id: 'add-image-loading-lazy',
    name: 'Add lazy loading to images',
    description: 'Add loading="lazy" attribute to offscreen images',
    metrics: ['LCP', 'Speed Index'],
    detect: (code, filename) => {
      if (!filename.match(/\.(html|jsx|tsx|vue|svelte)$/)) return false;
      // Look for img tags without loading attribute
      return /<img\s+(?![^>]*loading=)[^>]*>/i.test(code);
    },
    fix: (code) => {
      // Add loading="lazy" to img tags that don't have it
      return code.replace(
        /<img\s+(?![^>]*loading=)([^>]*)>/gi,
        '<img loading="lazy" $1>'
      );
    },
    confidence: 'high',
  },

  {
    id: 'add-image-dimensions',
    name: 'Add explicit dimensions to images',
    description: 'Add width and height attributes to prevent layout shifts',
    metrics: ['CLS'],
    detect: (code, filename) => {
      if (!filename.match(/\.(html|jsx|tsx|vue|svelte)$/)) return false;
      // Look for img tags without width/height
      return /<img\s+(?![^>]*(width|height)=)[^>]*>/i.test(code);
    },
    fix: (code) => {
      // This is a placeholder - actual implementation would need image analysis
      return code;
    },
    confidence: 'low',
  },

  // Script optimization patterns
  {
    id: 'add-script-defer',
    name: 'Add defer to scripts',
    description: 'Add defer attribute to non-critical scripts',
    metrics: ['FCP', 'TBT'],
    detect: (code, filename) => {
      if (!filename.match(/\.html$/)) return false;
      // Look for script tags without async/defer
      return /<script\s+(?![^>]*(async|defer))[^>]*src=/i.test(code);
    },
    fix: (code) => {
      // Add defer to external scripts that don't have async/defer
      return code.replace(
        /<script\s+(?![^>]*(async|defer))([^>]*src=[^>]*)>/gi,
        '<script defer $2>'
      );
    },
    confidence: 'medium',
  },

  {
    id: 'add-script-async',
    name: 'Add async to analytics scripts',
    description: 'Add async attribute to analytics and tracking scripts',
    metrics: ['FCP', 'TBT'],
    detect: (code, filename) => {
      if (!filename.match(/\.html$/)) return false;
      // Look for common analytics scripts without async
      return /<script\s+(?![^>]*async)[^>]*(google|analytics|gtag|segment)/i.test(code);
    },
    fix: (code) => {
      return code.replace(
        /<script\s+(?![^>]*async)([^>]*(google|analytics|gtag|segment)[^>]*)>/gi,
        '<script async $1>'
      );
    },
    confidence: 'high',
  },

  // Preload patterns
  {
    id: 'add-font-preload',
    name: 'Preload critical fonts',
    description: 'Add preload link for critical web fonts',
    metrics: ['FCP', 'LCP'],
    detect: (code, filename) => {
      if (!filename.match(/\.html$/)) return false;
      // Has font-face but no preload
      const hasFontFace = /@font-face/i.test(code);
      const hasPreload = /<link[^>]*rel="preload"[^>]*as="font"/i.test(code);
      return hasFontFace && !hasPreload;
    },
    fix: (code) => {
      // This would need to extract font URLs - placeholder
      return code;
    },
    confidence: 'low',
  },

  {
    id: 'add-preconnect',
    name: 'Add preconnect hints',
    description: 'Add preconnect for third-party origins',
    metrics: ['FCP', 'LCP'],
    detect: (code, filename) => {
      if (!filename.match(/\.html$/)) return false;
      // Has third-party scripts but no preconnect
      const hasThirdParty = /src=["'][^"']*\/\/(fonts\.googleapis|cdn\.|unpkg|cdnjs)/i.test(code);
      const hasPreconnect = /<link[^>]*rel="preconnect"/i.test(code);
      return hasThirdParty && !hasPreconnect;
    },
    fix: (code) => {
      // Add preconnect for common CDNs
      const preconnects: string[] = [];
      if (/fonts\.googleapis/i.test(code)) {
        preconnects.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
        preconnects.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      }
      if (/unpkg\.com/i.test(code)) {
        preconnects.push('<link rel="preconnect" href="https://unpkg.com">');
      }
      if (/cdnjs\.cloudflare/i.test(code)) {
        preconnects.push('<link rel="preconnect" href="https://cdnjs.cloudflare.com">');
      }

      if (preconnects.length > 0) {
        return code.replace(/<head>/i, `<head>\n    ${preconnects.join('\n    ')}`);
      }
      return code;
    },
    confidence: 'high',
  },

  // CSS optimization patterns
  {
    id: 'add-font-display-swap',
    name: 'Add font-display: swap',
    description: 'Add font-display: swap to @font-face rules',
    metrics: ['FCP', 'LCP'],
    detect: (code, filename) => {
      if (!filename.match(/\.css$/)) return false;
      // Has font-face without font-display
      return /@font-face\s*\{[^}]*(?!font-display)[^}]*\}/i.test(code);
    },
    fix: (code) => {
      return code.replace(
        /@font-face\s*\{([^}]*(?!font-display)[^}]*)\}/gi,
        '@font-face {$1  font-display: swap;\n}'
      );
    },
    confidence: 'high',
  },

  // JavaScript patterns
  {
    id: 'use-dynamic-import',
    name: 'Use dynamic imports',
    description: 'Convert static imports to dynamic imports for code splitting',
    metrics: ['TBT', 'TTI'],
    detect: (code, filename) => {
      if (!filename.match(/\.(js|ts|jsx|tsx)$/)) return false;
      // Look for large module imports that could be dynamic
      const largeModules = ['moment', 'lodash', 'chart.js', 'd3', 'three'];
      return largeModules.some((mod) =>
        new RegExp(`import\\s+.*from\\s+['"]${mod}['"]`, 'i').test(code)
      );
    },
    fix: (code) => {
      // This is complex and needs context - placeholder
      return code;
    },
    confidence: 'low',
  },

  // React-specific patterns
  {
    id: 'add-react-lazy',
    name: 'Use React.lazy for components',
    description: 'Wrap component imports with React.lazy for code splitting',
    metrics: ['TBT', 'TTI'],
    detect: (code, filename) => {
      if (!filename.match(/\.(jsx|tsx)$/)) return false;
      // Look for component imports that could be lazy loaded
      return /import\s+\w+\s+from\s+['"]\.\.?\/.*[A-Z].*['"]/.test(code);
    },
    fix: (code) => {
      // Placeholder - needs careful analysis
      return code;
    },
    confidence: 'low',
  },
];

/**
 * Find applicable fix patterns for a file
 */
export function findApplicablePatterns(
  code: string,
  filename: string
): FixPattern[] {
  return fixPatterns.filter((pattern) => pattern.detect(code, filename));
}

/**
 * Find patterns that could help with specific metrics
 */
export function findPatternsForMetric(metric: string): FixPattern[] {
  return fixPatterns.filter((pattern) => pattern.metrics.includes(metric));
}

/**
 * Apply a fix pattern to code
 */
export function applyPattern(
  pattern: FixPattern,
  code: string,
  filename: string
): { fixed: boolean; code: string; diff: string } {
  if (!pattern.detect(code, filename)) {
    return { fixed: false, code, diff: '' };
  }

  const newCode = pattern.fix(code, filename);
  const diff = generateDiff(code, newCode);

  return {
    fixed: newCode !== code,
    code: newCode,
    diff,
  };
}

/**
 * Generate a simple diff between two code strings
 */
function generateDiff(oldCode: string, newCode: string): string {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  const diff: string[] = [];

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      continue;
    }

    if (oldLine !== undefined && newLine !== undefined) {
      diff.push(`- ${oldLine}`);
      diff.push(`+ ${newLine}`);
    } else if (oldLine !== undefined) {
      diff.push(`- ${oldLine}`);
    } else if (newLine !== undefined) {
      diff.push(`+ ${newLine}`);
    }
  }

  return diff.join('\n');
}
