# Investigation reference

## Evidence checklist

- Candidate and baseline SHA, run timestamps and exact URL (including route/query when relevant)
- Lighthouse version, device type, throttling, browser/build environment
- Number of runs, distribution or median; avoid over-interpreting single-run variation
- Numeric values and units for LCP, CLS, TBT, FCP and performance score, when present
- LHCI audits/opportunities and related trace/network context
- Relevant diff and inspected file paths (not just a guessed file name)

## Reading signals

- **LCP:** Inspect hero/image discovery and size, resource priority, server response, render-blocking styles/scripts, hydration and font effects. Confirm the actual LCP element before blaming a file.
- **CLS:** Inspect missing media dimensions, late injected content, font swaps and dynamic banners; distinguish lab artifacts from observed shifts.
- **TBT:** Inspect main-thread long tasks, bundle and third-party script execution. TBT is a lab proxy and is **not** field INP.
- **FCP:** Inspect document response time, render-blocking resources and critical CSS.
- **Score:** Weighted and environment-dependent; report actual metric deltas alongside score.

## Working without the CLI

Use locally supplied Lighthouse JSON and the code diff. Extract metric values from `audits` and `categories`, compare like-for-like runs, then identify which audits changed. If data is incomplete, report what cannot be established; do not fabricate a baseline. Give the user a safe collection command for their environment only when asked or when necessary for reproduction.

## Evidence classification

- **Measured:** present in the actual reports.
- **Corroborated:** audit/trace and repository change support a causal mechanism.
- **Hypothesis:** plausible but unverified. Label as such and propose a targeted check.

## Verification

For each fix, state how to reproduce and how to measure the result. Multiple comparable LHCI runs are preferred over a single pass. Preserve a note of remaining variability. Field CrUX data, when available, should be reported separately from Lighthouse lab runs.
