# Security Audit (Launch Readiness)

Audit date: 2026-03-10 (America/New_York)

## Scope
- Dependency vulnerabilities (prod + full tree)
- Build and lint integrity checks
- Data contract validation checks
- Deployment workflow permissions sanity

## Commands run
```bash
npm run security:prod
npm run security:audit
npm run qa:full
```

## Results
- `npm run security:prod`: **0 vulnerabilities**
- `npm run security:audit`: **0 vulnerabilities**
- `npm run qa:full`: passed (`data:refresh`, `data:validate`, `lint`, `build`, `security:audit`)

## Hardening completed
- Switched from remote Google Fonts CDN imports to locally packaged fonts (`@fontsource/*`).
- Added automated security workflow:
  - `.github/workflows/security.yml`
- Added launch QA script:
  - `qa:full` in `package.json`
- Added dataset contract validation:
  - `scripts/validate-data.ts`
- Added BLS quota fallback in ingestion:
  - `scripts/refresh-data.ts` reuses cached BLS series when daily quota is exhausted.

## Residual risk notes
- Frontend bundle remains chart-heavy (`~643 kB` JS gzipped output ~197 kB); not a security flaw, but monitor performance and third-party update cadence.
- App is static and does not process user-submitted HTML/Markdown, reducing XSS surface.
- No secrets are stored in the repo or embedded in the frontend bundle.
