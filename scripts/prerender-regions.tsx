import { mkdir, readFile, writeFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { RegionProfile } from "../src/regions/RegionProfile";
import { SiteNav } from "../src/components/SiteNav";
import { REGIONAL_PROFILES, regionalPath } from "../src/regions/profiles";
import type { RegionalEconomy } from "../src/regions/geographies";
import { withRegionContent, withRegionMetadata } from "./lib/region-html";

const base = process.env.VITE_BASE_PATH || "/floridanomics-dashboard-mvp/";
if (!/^\/[a-zA-Z0-9_/-]*\/$/.test(base) && base !== "/") throw new Error("Unsupported public base path");
const origin = "https://www.floridanomics.com";
const template = await readFile("dist/index.html", "utf8");
const economy = JSON.parse(await readFile("public/data/regional-economy.json", "utf8")) as RegionalEconomy;
const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8")) as Record<string, { css?: string[] }>;
const style = manifest["src/regions/RegionRoute.tsx"]?.css;
if (!style?.length) throw new Error("Missing regional stylesheet in build manifest");

for (const profile of REGIONAL_PROFILES) {
  const url = `${origin}${regionalPath(profile.id)}`;
  let html = withRegionMetadata(template, { title: profile.title, description: profile.description, url });
  const content = renderToStaticMarkup(<div className="compare-frame"><a className="v3-skip-link" href="#region-main">Skip to content</a><SiteNav active="regions" base={base} /><RegionProfile profile={profile} economy={economy} base={base} /></div>);
  html = withRegionContent(html, content, style.map((file) => `${base}${file}`));
  const directory = `dist/regions/${profile.id}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, html);
}
console.log(`Pre-rendered ${REGIONAL_PROFILES.length} shareable regional pages with individual metadata and source-linked content.`);
