# Security Audit and Hardening

Latest re-audit: 2026-09-27 (America/New_York). It covers the 20 commits merged after the 2026-09-09 audit (3f4e04d through 6b4fa6e), the live site, the domain's email and DNS records, and the analytics payloads now that Plausible is on. The 2026-09-09 results further down still hold unless the re-audit says otherwise. Both are targeted reviews, not penetration-test certifications.

## Re-audit 2026-09-27

### Passing

- Dependencies: full and production npm audits report zero known vulnerabilities. The dependency list and lockfile are unchanged since 2026-09-09. GitHub shows 0 open Dependabot alerts and 0 open secret-scanning alerts.
- Checks: lint, script typecheck, data validation, 244 tests and the production build pass, including both public-artifact privacy gates and the security-policy check.
- Repository controls: secret scanning, push protection and Dependabot security updates are on. `main` still requires `quality` and `dependency-audit`, including for administrators. Every workflow action is pinned to a commit SHA. The data-refresh workflow pushes only `codex/data-refresh-*` review branches, never `main`.
- Code changes: no HTML-injection or navigation sinks (`innerHTML`, `dangerouslySetInnerHTML`, `eval`, `document.write`, message listeners, `window.open`, location assignment) in `src/`, `scripts/` or `public/`. New routes resolve through allowlists. Regional prerendering escapes metadata and renders page content with React.
- Secrets: no token or private-key patterns and no keyed API URLs in the tracked tree, in the history since 2026-09-09, or in the build output.
- Live site: `.env`, `.git`, source files, `package.json`, the build manifest and source maps return 404. Every page carries a CSP and no inline scripts, and the static pages (about, privacy, terms, 404, brief) allow no scripts. HTTP redirects to HTTPS in one hop, HTTPS is enforced, the certificate runs to 2026-11-02 and renews automatically, and the custom domain is verified with GitHub.
- Analytics payload (the open follow-up from 2026-09-09): a real outgoing Plausible event was captured on the live dashboard, loaded with a fake email, token and fragment in its URL. The event carried `u: https://www.floridanomics.com/`, `d: floridanomics.com`, `r: null`, and props limited to the campaign source and the outbound link's origin and label. None of the fake private values appeared, and the site set no cookies. The privacy notice at /privacy/ discloses the cookieless Plausible counts.
- Domain: GoDaddy transfer, update, delete and renew locks are on, with the registration running to 2031-09-26. CAA records restrict certificate issuers, and DKIM is published.

### Open findings

1. Medium, email spoofing. DMARC is `p=none` and SPF ends in `~all`, so receiving servers take no action on mail that forges an @floridanomics.com sender. SPF also includes `+a`, which authorizes the apex A records (GitHub Pages) to send mail for the domain. Fix in the HostPapa DNS zone: remove `+a`, confirm the real senders, then move DMARC to `p=quarantine` and later `p=reject`, with reports going to a mailbox that exists.
2. FIXED 2026-09-27. Low, CSP allowlist. `script-src` still allows `https://www.googletagmanager.com`, and `connect-src` the Google Analytics hosts, although Google Analytics is not used. A tag-manager host on the allowlist weakens the CSP as a fallback if an injection bug ever appears. Fixed: `script-src` and `connect-src` now allow only the site and https://plausible.io, and `src/lib/security-policy.test.ts` pins both lists. The unused Google Analytics code path stays inert and is marked as blocked by the CSP.
3. FIXED 2026-09-27. Low, prerender robustness. `scripts/prerender-regions.tsx` inserts profile text through `String.replace` replacement strings, in which `$1`, `$&` and similar sequences are special. No current title or description contains `$`, and all eight built pages are correct. Fixed: `scripts/lib/region-html.ts` inserts metadata and content through replacer callbacks, and `scripts/lib/region-html.test.ts` covers `$1`, `$&`, `$'` and `` $` `` in profile text and markup.
4. Informational, pipeline notes in public data. `public/data/florida-economy.json` publishes API environment-variable names, key status and internal to-do notes (`envKey`, `missingKeys`, `nextFeeds`). It contains no key values. Consider dropping these fields from the published file.
5. Informational. DNSSEC is not enabled at the DNS host. The Plausible script loads from plausible.io without subresource integrity, because Plausible updates the file; the CSP limits script hosts.
6. Still open from 2026-09-09: the host-level headers under "Remaining host-level protections".

### Method notes

The payload capture wrapped `fetch` and `sendBeacon` on the live page, blocked the outbound navigation, and clicked a source link, so the event went through the site's own analytics code. Browser checks must use the production build or the live site, because the development server removes the CSP. The live-site and DNS probes used `curl`, `dig`, `whois` and `openssl s_client`.

## Audit 2026-09-09: results and changes

This audit superseded the March launch audit.


- Full and production npm audits: zero known vulnerabilities after patching six affected development packages. Vitest/mocker 4.1.11, Browserslist 4.28.9, baseline-browser-mapping 2.11.21, nanoid 3.3.18, and @humanfs/node 0.16.8 are in the lockfile.
- Lint, script typecheck, data validation, production build, and 152 tests pass. Tests cover URL privacy, analytics payloads, credential-free committed environment files, CSP and deployment gates.
- Production HTML now enforces CSP before other resources: no inline/eval scripts, no object embeds or base URL overrides, restricted script/network hosts, and restricted form destinations. Styles still allow inline values for charts and layout. Both the app and standalone AI Capex brief have a no-referrer policy.
- Local production-build browser checks: atlas renders and selects regions, dashboard charts render, briefing signup retains its HTTPS Substack POST destination, and the standalone brief renders. A harmless injected inline-script probe is blocked by CSP. No real subscriptions were submitted.
- Analytics drops credentials, query strings and fragments from page URLs/referrers, drops per-recipient tracking fields, and records outbound origins rather than complete links. GA configuration and both analytics event paths have regression tests. Analytics remains disabled on the current site. (Plausible was enabled on 2026-09-27; see the re-audit.)
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

If analytics is enabled later, review consent/disclosure needs, disable GA4 automatic enhanced measurement in the property, and verify real outgoing payloads. Custom Plausible hosts require an explicit CSP update. Campaign slugs must not contain personal identifiers. (2026-09-27: done for Plausible. The privacy notice is published and a live payload was verified; Google Analytics remains off.)

## References

- [Vitest development-server advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
- [Nano ID advisory](https://github.com/advisories/GHSA-2v37-7h3g-55p8)
- [Browserslist advisory](https://github.com/advisories/GHSA-73wf-gq98-2v4g)
- [CSP frame-ancestors cannot be delivered through meta](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
