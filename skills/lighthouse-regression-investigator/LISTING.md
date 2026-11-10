# Agensi listing copy (creator-facing; do not include in customer ZIP)

**Name:** Lighthouse Regression Investigator  
**Suggested price:** $19 one-time (experiment; not a revenue forecast)  
**Summary:** Investigate Lighthouse CI regressions with evidence-first triage. Connect lab metrics, audit findings and code diffs to a prioritized, verifiable web performance fix plan.

## Description

Stop guessing why a Lighthouse CI score changed.

This workflow guides an AI coding agent through comparing like-for-like Lighthouse runs, identifying changes in LCP, CLS, TBT and FCP, validating plausible causes against real repository diffs, and writing a concise prioritized remediation plan with clear verification steps.

Works with your existing Lighthouse CI artifacts and optionally the MIT-licensed `lhci-ai-assistant` CLI. The CLI is free and is **not** included in the purchase. The skill adds a structured investigation process, evidence requirements and report templates.

**Best for:** frontend engineers, web performance teams and PR reviewers using Lighthouse CI.

**Requires:** an agent with read access to the relevant repository and Lighthouse reports; Node.js 18+ only when using the optional CLI. No external model API key is required for the local path.

**Does not:** run a hosted monitoring service, automatically fix or deploy code, prove lab-to-field causality, include the npm CLI, or guarantee a performance score improvement.

## Example request

"Review the Lighthouse CI regression on this pull request. Compare the candidate reports to the last matching baseline, inspect the code diff, and tell me the three fixes with the strongest evidence. Do not edit code."

## Example output (illustrative format, not measured results)

- Comparability: same URL and device settings; number of runs to be verified
- Measured changes: populated only from the buyer's actual report JSON
- Finding 1: suspected hero image discovery delay; confirm LCP element and network priority
- Finding 2: possible layout shift from unsized banner; inspect changed markup
- Next action: reproduce the strongest finding with multiple comparable Lighthouse CI runs

## Listing metadata

Suggested categories: Developer Tools; Productivity; SEO (select only available matches in Agensi).  
Tags: Lighthouse CI, web performance, Core Web Vitals, regression debugging, frontend, code review.  
Pricing rationale: test five real sales in 30 days; reassess rather than expanding prematurely.

## Creator submission checklist

1. Package the **SKILL.md**, **references/** and **templates/** only, preserving their paths. Exclude LISTING.md from the paid customer ZIP.
2. Check the Agensi preview for description, dependency disclosures, permissions and price.
3. Do a real agent test with sanitized LHCI reports before claiming the workflow works.
4. Set up the creator account and payout method for a paid listing, then manually approve submission.
5. Record listing URL, views, purchases and support burden. Review results after 30 days.
