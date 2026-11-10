---
name: lighthouse-regression-investigator
description: Diagnose Lighthouse CI performance regressions in a JavaScript or web repository, corroborate causes using audit evidence and code diffs, and produce a prioritized, verifiable remediation plan. Use when a user provides Lighthouse CI reports, asks why LCP/CLS/TBT/FCP changed, or wants a performance regression assessed before merging.
version: 1.0.0
tags: [web-performance, lighthouse, lighthouse-ci, debugging, core-web-vitals]
---

# Lighthouse Regression Investigator

Analyze existing Lighthouse CI (LHCI) reports using the open-source `lhci-ai-assistant` CLI, then verify its recommendations against the actual evidence. The skill is a guided investigation, **not** a promise that a synthetic Lighthouse score explains real-user Core Web Vitals.

## Safety and prerequisites

- Work only in a repository the user has authorized you to inspect.
- Read reports, config and diffs before proposing edits. Never silently install packages, run untrusted repository scripts, change files, push commits, post PR comments or upload reports. Ask permission for changes or external actions.
- Do not expose tokens, private URLs, headers, cookies, source contents or report artifacts to an AI provider. The default is local analysis. An external provider requires the user's explicit consent and credentials already configured by them.
- The npm package is an **optional dependency**, not bundled in this skill. It requires Node.js 18+ and is available at `https://www.npmjs.com/package/lhci-ai-assistant`. Avoid global installs when the user has an existing project setup.
- If the package or LHCI reports are absent, explain what is missing and use the read-only manual workflow in [references/investigation.md](references/investigation.md). Do not pretend an analysis ran.
- Treat AI/heuristic recommendations as hypotheses. Distinguish measured regression, suspected cause, and confirmed code evidence.

## Workflow

1. **Establish scope.** Record tested URL(s), commit/PR, environment, LHCI run date and baseline strategy. Check that baseline and candidate match URL, device emulation, throttling, Lighthouse version and other relevant configuration. Flag comparisons that are not comparable.
2. **Locate evidence.** Find `.lighthouseci/` report JSON files, the LHCI configuration, recent code diff and relevant project files. Do not copy sensitive report data outside the authorized environment. If reports are missing, request sanitized JSON or instructions for generating comparable runs.
3. **Run local analysis where permitted.** If `lhci-ai` is already installed, run `lhci-ai analyze --provider local --baseline-strategy same-url --output json` from the project root. Use existing project/package manager conventions if not installed, and obtain consent before installing dependencies. If output is not parseable JSON, use Markdown output instead and report that limitation. Run `lhci-ai check` only when explicit threshold requirements are known. Do not claim an `--auto-fix` option applies a patch: it generates suggestions.
4. **Corroborate each finding.** Match Lighthouse metric/audit evidence to actual file paths, source changes and plausible render/network effects. Separate audit evidence from code inference; do not assert causation solely from score changes.
5. **Prioritize.** Prefer regressions with user-visible impact and strong evidence; classify priority P0 (breakage), P1 (high impact), P2 (moderate), P3 (cleanup). Give concrete fix guidance, estimated effort band (small/medium/large), confidence (high/medium/low) and a verification step.
6. **Deliver.** Use [templates/report.md](templates/report.md). Include exact baseline/candidate evidence, unknowns, findings and executable verification instructions. Limit to the three highest-value recommended changes unless asked for a comprehensive audit.
7. **Validate after changes.** If authorized changes occur, rerun comparable LHCI samples and report before/after numbers. Do not promise field-user improvements from lab results; use CrUX or other RUM separately when available. Never merge/deploy without permission.

## If there is no regression

State that the provided evidence does not demonstrate a reproducible regression. Describe the coverage and variability limits; do not invent a root cause or fabricate a fix.

## Boundaries

No automatic code changes, remote API calls, PR posting, or marketplace purchase is required to use this skill. The underlying npm CLI remains MIT licensed. This skill adds a reproducible, evidence-first triage and reporting workflow; it does not sell exclusive rights to the CLI.
