import { mkdir, readFile, writeFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { RegionProfile } from "../src/regions/RegionProfile";
import { SiteNav } from "../src/components/SiteNav";
import { REGIONAL_PROFILES, regionalPath } from "../src/regions/profiles";
import type { RegionalEconomy } from "../src/regions/geographies";

const base = process.env.VITE_BASE_PATH || "/floridanomics-dashboard-mvp/";
if (!/^\/[a-zA-Z0-9_/-]*\/$/.test(base) && base !== "/") throw new Error("Unsupported public base path");
const origin = "https://www.floridanomics.com";
const template = await readFile("dist/index.html", "utf8");
const economy = JSON.parse(await readFile("public/data/regional-economy.json", "utf8")) as RegionalEconomy;
const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8")) as Record<string, { css?: string[] }>;
const style = manifest["src/regions/RegionRoute.tsx"]?.css;
if (!style?.length) throw new Error("Missing regional stylesheet in build manifest");
const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

for (const profile of REGIONAL_PROFILES) {
  const url = `${origin}${regionalPath(profile.id)}`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(profile.title)} | Floridanomics</title>`)
    .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escape(profile.description)}$2`)
    .replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]*("\s*\/?>)/g, `$1${escape(profile.description)}$2`)
    .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*("\s*\/?>)/g, `$1${escape(profile.title)} | Floridanomics$2`)
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${url}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${url}$2`)
    // Regional text previews describe the record; the statewide card stays on the home page.
    .replace(/\s*<meta (?:property="og:image[^"]*"|name="twitter:image[^"]*")[^>]*>/g, "")
    .replace('name="twitter:card" content="summary_large_image"', 'name="twitter:card" content="summary"');
  const content = renderToStaticMarkup(<div className="compare-frame"><a className="v3-skip-link" href="#region-main">Skip to content</a><SiteNav active="regions" base={base} /><RegionProfile profile={profile} economy={economy} base={base} /></div>);
  html = html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  html = html.replace("</head>", `${style.map((file) => `<link rel="stylesheet" href="${base}${file}" />`).join("\n")}\n</head>`);
  const directory = `dist/regions/${profile.id}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, html);
}
console.log(`Pre-rendered ${REGIONAL_PROFILES.length} shareable regional pages with individual metadata and source-linked content.`);
