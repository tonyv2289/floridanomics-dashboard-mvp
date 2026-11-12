## Floridanomics data review
- The economic dataset has new observations, revisions or source changes awaiting review.
- TJ’s Read is more than 45 days old. Review the column separately; do not automatically rewrite or redate it.
- State labor data: The 2026-09 observation was scheduled for release on 2026-10-20. Published data still show 2026-08; verify the source and review before updating.
- Metro labor data: The 2026-09 observation was scheduled for release on 2026-10-28. Published data still show 2026-07; verify the source and review before updating.
- Job postings index: The latest observation is 2026-09-18. Check its source; no new observation has been published here within the 21-day review window.
- Initial unemployment claims: The latest observation is 2026-09-19. Check its source; no new observation has been published here within the 21-day review window.
- Continued unemployment claims: The latest observation is 2026-09-12. Check its source; no new observation has been published here within the 28-day review window.
- Building permits (units): The latest observation is 2026-08-01. Check its source; no new observation has been published here within the 100-day review window.
- Trade: Annual 2025 figures are retained. These are dated annual benchmarks, not current-month trade. Direct Census API revalidation is still needed.
- Industrial electricity price: The price benchmark is 2026-06; check the latest EIA monthly table.

### Publication gate
Review the dated sources, the data differences and any affected interpretation. Project announcements and TJ’s Read require separate editorial review. The scheduled check does not publish to the website or merge a branch.

Review artifacts: https://github.com/tonyv2289/floridanomics-dashboard-mvp/actions/workflows/refresh-data.yml
Dispatch Refresh Data with publish=true only to stage a checked branch. Review and merge through the normal protected-main process to publish.
