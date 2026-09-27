## Floridanomics data review
- The economic dataset has new observations, revisions or source changes awaiting review.
- State labor data: The 2026-08 observation was scheduled for release on 2026-09-18. Published data still show 2026-07; verify the source and review before updating.
- Job postings index: The latest observation is 2026-09-04. Check its source; no new observation has been published here within the 21-day review window.
- Initial unemployment claims: The latest observation is 2026-08-29. Check its source; no new observation has been published here within the 21-day review window.
- Continued unemployment claims: The latest observation is 2026-08-22. Check its source; no new observation has been published here within the 28-day review window.
- Trade: Annual 2025 figures are retained. These are dated annual benchmarks, not current-month trade. Direct Census API revalidation is still needed.

### Publication gate
Review the dated sources, the data differences and any affected interpretation. Project announcements and TJ’s Read require separate editorial review. The scheduled check does not publish to the website or merge a branch.

Review artifacts: https://github.com/tonyv2289/floridanomics-dashboard-mvp/actions/workflows/refresh-data.yml
Dispatch Refresh Data with publish=true only to stage a checked branch. Review and merge through the normal protected-main process to publish.
