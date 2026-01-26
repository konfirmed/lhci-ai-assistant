# Contributing to LHCI AI Assistant

Thank you for your interest in contributing! This document provides guidelines for development and contributions.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/example/lhci-ai-assistant.git
cd lhci-ai-assistant

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Link for local testing
pnpm link --global
```

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── index.ts            # Programmatic API exports
├── types.ts            # TypeScript type definitions
├── config.ts           # Configuration loader
├── analyzer.ts         # Main analysis orchestrator
├── github/             # GitHub API integration
├── ai/                 # AI provider clients
├── autofix/            # Auto-fix suggestion engine
├── metrics/            # Lighthouse metrics handling
└── output/             # Output formatters

tests/
├── analyzer.test.ts
├── github.test.ts
└── metrics.test.ts
```

## Development Workflow

### Running in Development

```bash
# Watch mode for TypeScript compilation
pnpm dev

# In another terminal, test CLI
node dist/cli.js analyze --help
```

### Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- metrics.test.ts
```

### Linting

```bash
pnpm lint
```

## Code Guidelines

### TypeScript

- Use strict TypeScript with explicit types
- Avoid `any` when possible
- Export types from `types.ts`

### Error Handling

- Use descriptive error messages
- Create custom error classes for specific error types
- Always catch and handle errors gracefully

### Testing

- Write tests for new features
- Maintain test coverage above 80%
- Use descriptive test names

## Adding New Features

### New AI Provider

1. Create a new file in `src/ai/` (e.g., `src/ai/newprovider.ts`)
2. Implement the provider interface:

```typescript
export async function analyzeWithNewProvider(
  prompt: string,
  options: NewProviderOptions
): Promise<string> {
  // Implementation
}
```

3. Add the provider to `src/analyzer.ts`
4. Add CLI option in `src/cli.ts`
5. Update types in `src/types.ts`
6. Add tests

### New Auto-Fix Pattern

1. Add pattern to `src/autofix/patterns.ts`:

```typescript
{
  id: 'pattern-id',
  name: 'Pattern Name',
  description: 'What this pattern fixes',
  metrics: ['LCP', 'FCP'],
  detect: (code, filename) => {
    // Return true if pattern applies
  },
  fix: (code, filename) => {
    // Return fixed code
  },
  confidence: 'high',
}
```

2. Add tests for the new pattern

### New Output Format

1. Create new file in `src/output/` (e.g., `src/output/html.ts`)
2. Implement the formatter:

```typescript
export function formatAsHTML(result: AnalysisResult): string {
  // Implementation
}
```

3. Add to `src/analyzer.ts` output handling
4. Add CLI option
5. Export from `src/index.ts`

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit with descriptive message
7. Push to your fork
8. Open a Pull Request

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Types exported if needed
- [ ] CLI help text updated if applicable
- [ ] Changelog entry added

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.0.0`
4. Push with tags: `git push --tags`
5. Publish: `pnpm publish`

## Getting Help

- Open an issue for bugs or feature requests
- Discussions for questions and ideas
- Check existing issues before creating new ones

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to build something useful together.
