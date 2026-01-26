# LHCI AI Assistant

AI-powered companion tool for [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) that analyzes performance regressions, explains root causes, and suggests fixes.

## Features

- **AI-Powered Analysis**: Uses GitHub Copilot, OpenAI, or local heuristics to analyze Lighthouse results
- **Regression Detection**: Automatically identifies performance regressions by comparing against baselines
- **Root Cause Analysis**: Explains why performance degraded based on code changes and Lighthouse audits
- **Auto-Fix Suggestions**: Generates specific code fixes for common performance issues
- **GitHub Integration**: Posts analysis as PR comments and fetches code diffs for context
- **Multiple Output Formats**: Terminal (colored), JSON, Markdown

## Installation

```bash
npm install -g lhci-ai-assistant
# or
pnpm add -g lhci-ai-assistant
```

## Quick Start

1. Run Lighthouse CI to collect reports:

```bash
lhci collect --url https://your-site.com
```

2. Analyze with AI:

```bash
# Using local heuristics (no API key required)
lhci-ai analyze

# Using GitHub Copilot (requires gh auth login or GITHUB_TOKEN)
gh auth login  # One-time setup
lhci-ai analyze --provider copilot

# Using OpenAI
lhci-ai analyze --provider openai --openai-key $OPENAI_API_KEY
```

## Commands

### `lhci-ai analyze`

Analyze Lighthouse results with AI assistance.

```bash
lhci-ai analyze [options]

Options:
  --provider <name>      AI provider: copilot | openai | local (default: local)
  --github-token <token> GitHub token for Copilot/PR access
  --openai-key <key>     OpenAI API key
  --auto-fix             Generate auto-fix suggestions
  --post-comment         Post analysis to GitHub PR
  --pr-number <number>   PR number for posting comments
  --repo <repo>          GitHub repository (owner/repo)
  --output <format>      Output format: terminal | json | markdown (default: terminal)
  --config <path>        Config file path
```

### `lhci-ai check`

Quick threshold check for CI/CD gates.

```bash
lhci-ai check [options]

Options:
  --performance <score>     Minimum performance score (0-100)
  --accessibility <score>   Minimum accessibility score (0-100)
  --best-practices <score>  Minimum best practices score (0-100)
  --seo <score>             Minimum SEO score (0-100)
```

Example:

```bash
# Fail if performance drops below 90%
lhci-ai check --performance 90
```

### `lhci-ai init`

Display configuration setup instructions.

## Configuration

Create a `.lhci-ai.js` or add to your existing `.lhcirc.js`:

```javascript
module.exports = {
  ai: {
    provider: 'local',        // 'copilot' | 'openai' | 'local'
    autoFix: true,
    outputFormat: 'terminal',
  },
  thresholds: {
    performance: 0.9,
    accessibility: 0.9,
    bestPractices: 0.9,
    seo: 0.9,
  },
};
```

### Environment Variables

- `GITHUB_TOKEN` - GitHub token for PR comments (Copilot uses GitHub CLI auth)
- `OPENAI_API_KEY` - OpenAI API key

### Copilot Authentication

The Copilot provider uses the official [GitHub Copilot SDK](https://github.com/github/copilot-sdk) which authenticates via:

1. **GitHub CLI** (recommended): Run `gh auth login` once
2. **Environment variable**: Set `GITHUB_TOKEN` with a token that has Copilot access

## CI/CD Integration

### GitHub Actions

```yaml
name: Lighthouse CI

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli lhci-ai-assistant
          lhci collect --url http://localhost:3000
          lhci-ai analyze --provider copilot --post-comment
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Programmatic API

```typescript
import { analyze, quickCheck, loadLighthouseReports } from 'lhci-ai-assistant';

// Run full analysis
const result = await analyze({
  provider: 'local',
  output: 'json',
  autoFix: true,
});

console.log(result.summary);
console.log(result.regressions);
console.log(result.recommendations);

// Quick threshold check
const check = await quickCheck({
  performance: 0.9,
  accessibility: 0.9,
});

if (!check.passed) {
  console.log('Threshold failures:', check.failures);
  process.exit(1);
}
```

## How It Works

1. **Load Reports**: Reads Lighthouse JSON reports from `.lighthouseci/` directory
2. **Extract Metrics**: Parses Core Web Vitals (FCP, LCP, TBT, CLS) and category scores
3. **Compare**: Identifies regressions and improvements vs baseline
4. **Fetch Context**: Retrieves code changes from GitHub PR diff
5. **Analyze**: Uses AI or heuristics to identify root causes
6. **Recommend**: Generates prioritized, actionable recommendations
7. **Output**: Formats results for terminal, JSON, or PR comments

## Supported Metrics

- **Performance Score**: Overall Lighthouse performance score
- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint
- **TBT**: Total Blocking Time
- **CLS**: Cumulative Layout Shift
- **Speed Index**: Visual progress speed
- **TTI**: Time to Interactive

## Auto-Fix Patterns

The tool can detect and suggest fixes for:

- Missing `loading="lazy"` on images
- Missing image dimensions (CLS fix)
- Scripts without `defer` or `async`
- Missing `preconnect` hints
- Missing `font-display: swap`
- Render-blocking resources

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE)

## Related Projects

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Lighthouse](https://github.com/GoogleChrome/lighthouse)
- [web.dev](https://web.dev)
