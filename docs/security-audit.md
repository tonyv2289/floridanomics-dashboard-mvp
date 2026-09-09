# Security Audit and Hardening

Audit date: 2026-09-09 (America/New_York). Target: the public Floridanomics site and Florida Brain atlas. This supersedes the March launch audit; it is a targeted review, not a penetration-test certification.

## Results and changes

- Full and production npm audits: zero known vulnerabilities after patching six affected development packages. Vitest/mocker 4.1.11, Browserslist 4.28.9, baseline-browser-mapping 2.11.21, nanoid 3.3.18, and @humanfs/node 0.16.8 are in the lockfile.
- Lint, script typecheck, data validation, production build, and 152 tests pass. Tests cover URL privacy, analytics payloads, credential-free committed environment files, CSP and deployment gates.
- Production HTML now enforces CSP before other resources: no inline/eval scripts, no object embeds or base URL overrides, restricted script/network hosts, and restricted form destinations. Styles still allow inline values for charts and layout. Both the app and standalone AI Capex brief have a no-referrer policy.
- Local production-build browser checks: atlas renders and selects regions, dashboard charts render, briefing signup retains its HTTPS Substack POST destination, and the standalone brief renders. A harmless injected inline-script probe is blocked by CSP. No real subscriptions were submitted.
- Analytics drops credentials, query strings and fragments from page URLs/referrers, drops per-recipient tracking fields, and records outbound origins rather than complete links. GA configuration and both analytics event paths have regression tests. Analytics remains disabled on the current site.
- `.env` and credential-file patterns are ignored. Committed `.env.example` must have empty values; `.env.production` is restricted by a test to the public canonical URL. Public repository secret scanning and push protection were already enabled; no open secret-scanning alerts were found during the audit.
- Initial pattern scan found no secret matches in tracked text and deployed artifacts. Sensitive file probes (`.env`, `.git/config`, development entrypoints and a source map) returned 404 on production. No source maps were included in the build.
- The protected `main` branch now requires GitHub Actions `quality` and `dependency-audit` checks, including administrators, with force pushes/deletion disallowed. Deploys independently rerun security and quality gates, accept only `main`, and give Pages/OIDC write permission only to the deployment job.
- Workflow actions are pinned to verified commit SHAs. Weekly Dependabot updates and automated security fixes are enabled. Reviewed data/policy updates stage checked branches rather than publishing around protection.

## Recheck commands

```sh
npm ci
npm run security:prod
npm run security:audit
npm run lint
npm run typecheck:scripts
npm run data:validate
npm test
VITE_BASE_PATH=/ VITE_PUBLIC_URL=https://www.floridanomics.com/ npm run build
```

Do not use `qa:full` for a read-only audit: it refreshes data. Browser checks must target the production build or live site because the localhost development transform removes CSP for React hot reload.

## Remaining host-level protections

GitHub Pages serves HTTPS and redirects HTTP, but this deployment does not provide configurable response headers. HSTS, `X-Content-Type-Options`, Permissions-Policy, and anti-framing (`frame-ancestors` / X-Frame-Options) remain host/CDN follow-ups. A meta CSP cannot enforce `frame-ancestors`; `frame-src 'none'` only prevents this page from embedding other frames. No ineffective meta anti-framing tag or JavaScript frame-buster has been substituted. Adding a header-capable CDN or changing hosts requires a separate infrastructure decision.

The static read-only atlas has no login, account actions, payments or user-upload endpoint. Missing anti-framing is defense-in-depth here, not a demonstrated compromise. No test guarantees that a website is vulnerability-free.

If analytics is enabled later, review consent/disclosure needs, disable GA4 automatic enhanced measurement in the property, and verify real outgoing payloads. Custom Plausible hosts require an explicit CSP update. Campaign slugs must not contain personal identifiers.

## References

- [Vitest development-server advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
- [Nano ID advisory](https://github.com/advisories/GHSA-2v37-7h3g-55p8)
- [Browserslist advisory](https://github.com/advisories/GHSA-73wf-gq98-2v4g)
- [CSP frame-ancestors cannot be delivered through meta](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
