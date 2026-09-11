import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { REGIONAL_PROFILES } from "../src/regions/profiles";

const base = process.env.VITE_BASE_PATH || "/floridanomics-dashboard-mvp/";
const root = await readFile("dist/index.html", "utf8");
assert(root.includes('property="og:image" content="https://www.floridanomics.com/og.png"'), "Missing evergreen sharing card");
assert((await stat("dist/og.png")).size > 10000, "Sharing card is missing or empty");
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const pages = [root];
for (const profile of REGIONAL_PROFILES) {
  const html = await readFile(`dist/regions/${profile.id}/index.html`, "utf8");
  const url = `https://www.floridanomics.com/regions/${profile.id}/`;
  assert(html.includes(`<title>${escape(profile.title)} | Floridanomics</title>`), `${profile.id}: wrong title`);
  assert(html.includes(`rel="canonical" href="${url}"`), `${profile.id}: wrong canonical`);
  assert(html.includes(`property="og:url" content="${url}"`), `${profile.id}: wrong sharing URL`);
  assert(html.includes(`name="description" content="${escape(profile.description)}"`), `${profile.id}: wrong description`);
  assert(!html.includes('property="og:image"'), `${profile.id}: inherited statewide record image`);
  assert(html.includes('id="region-main"') && html.includes("Selected County Benchmarks"), `${profile.id}: missing pre-rendered content`);
  assert(!html.includes('class="region-anchor-grid"></div>'), `${profile.id}: empty anchor section`);
  assert((html.match(/aria-current="page"/g) ?? []).length === 1, `${profile.id}: navigation selection`);
  pages.push(html);
}
const assets = new Set<string>();
for (const html of pages) {
  assert(html.includes('http-equiv="Content-Security-Policy"'), "Missing document security policy");
  assert(!html.includes("%BASE_URL%") && !html.includes("%VITE_PUBLIC_URL%"), "Unresolved template value");
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
    if (!match[1].startsWith(base)) continue;
    const path = match[1].slice(base.length);
    if (path.startsWith("assets/") || path === "favicon.svg" || path === "data/florida-economy.json") assets.add(path);
  }
}
for (const asset of assets) assert((await stat(`dist/${asset}`)).isFile(), `Missing asset: ${asset}`);
console.log(`Verified homepage sharing metadata, ${REGIONAL_PROFILES.length} regional pages, security policies and ${assets.size} referenced assets.`);
