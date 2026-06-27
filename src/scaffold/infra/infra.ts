/**
 * SCAFFOLD - Epic 5: caching/CDN + brotli + fonts.
 * Not wired into the live app. Captures the config that is ready to drop in and the
 * single decision that gates the CDN path.
 *
 * The problem: GitHub Pages caps every asset at cache-control: max-age=600 (even
 * content-hashed immutable bundles) and serves gzip only, no brotli. So repeat visitors
 * past 10 minutes re-revalidate the whole bundle set. Two paths:
 *
 * PATH A (best, needs a decision): front Pages with a CDN that allows immutable headers
 * and brotli (Cloudflare Pages, Netlify, or a Cloudflare proxy in front of Pages).
 * HOLDUP: an account + DNS decision (cannot be done from the repo). Once chosen, the
 * `_headers` / `netlify.toml` below drop straight in.
 *
 * PATH B (works on Pages today, I can build it): a service worker that cache-first
 * serves the hashed /assets/* files, bypassing the 600s ceiling client-side. No infra
 * decision required; just registration in main.tsx + the worker file. The only caution
 * is correct cache invalidation on deploy (handled by hashed filenames + a version skew
 * check). This is the recommended near-term move.
 */

// Drop-in immutable-cache headers for a CDN (Cloudflare Pages / Netlify _headers format).
export const HEADERS_FILE = `/assets/*
  Cache-Control: public, max-age=31536000, immutable

/data/*.json
  Cache-Control: public, max-age=600, must-revalidate

/*
  Cache-Control: public, max-age=600
`;

// Drop-in netlify.toml (if Netlify is chosen).
export const NETLIFY_TOML = `[build]
  command = "npm run data:refresh && npm run memo:generate && npm run build"
  publish = "dist"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
`;

export const INFRA_READINESS = {
  cdnImmutableHeaders: { ready: false, blocker: "account + DNS decision (Cloudflare/Netlify); configs ready" },
  serviceWorkerCacheFirst: { ready: true, blocker: "none; build + register in main.tsx (Pages-compatible)" },
  brotli: { ready: false, blocker: "comes with the CDN choice; Pages cannot serve brotli" },
  fontMigration: {
    ready: true,
    blocker:
      "none; replace the @import font declarations with @font-face + font-display: swap, " +
      "preload the 2-3 above-the-fold faces, drop the 9 woff fallbacks (~166 KB)",
  },
} as const;
