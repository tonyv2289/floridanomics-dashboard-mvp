// Regional pages are the built index.html with per-region metadata and content.
// Every insertion uses a replacer callback: a replacement string would treat
// "$1", "$&" and similar sequences in profile text or rendered markup as patterns.

export const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

type RegionPage = { title: string; description: string; url: string };

export function withRegionMetadata(template: string, page: RegionPage): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const wrap = (value: string) => (_match: string, open: string, close: string) => `${open}${value}${close}`;
  return template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title} | Floridanomics</title>`)
    .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, wrap(description))
    .replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]*("\s*\/?>)/g, wrap(description))
    .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*("\s*\/?>)/g, wrap(`${title} | Floridanomics`))
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, wrap(page.url))
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, wrap(page.url))
    // Regional text previews describe the record; the statewide card stays on the home page.
    .replace(/\s*<meta (?:property="og:image[^"]*"|name="twitter:image[^"]*")[^>]*>/g, "")
    .replace('name="twitter:card" content="summary_large_image"', 'name="twitter:card" content="summary"');
}

export function withRegionContent(html: string, content: string, stylesheets: string[]): string {
  const links = stylesheets.map((href) => `<link rel="stylesheet" href="${href}" />`).join("\n");
  return html
    .replace('<div id="root"></div>', () => `<div id="root">${content}</div>`)
    .replace("</head>", () => `${links}\n</head>`);
}
