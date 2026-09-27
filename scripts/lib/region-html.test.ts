import { describe, expect, it } from "vitest";
import { withRegionContent, withRegionMetadata } from "./region-html";

const template = [
  "<!doctype html><html><head>",
  "<title>Floridanomics</title>",
  '<meta name="description" content="statewide" />',
  '<meta property="og:title" content="statewide" />',
  '<meta name="twitter:title" content="statewide" />',
  '<meta property="og:description" content="statewide" />',
  '<meta name="twitter:description" content="statewide" />',
  '<meta property="og:url" content="https://www.floridanomics.com/" />',
  '<link rel="canonical" href="https://www.floridanomics.com/" />',
  '<meta property="og:image" content="https://www.floridanomics.com/og.png" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '</head><body><div id="root"></div></body></html>',
].join("\n");

describe("regional page HTML", () => {
  it("inserts profile text literally, including $ replacement sequences", () => {
    const text = "Ports move $1.2B; $& $' $` stay <literal>";
    const url = "https://www.floridanomics.com/regions/test/";
    const html = withRegionMetadata(template, { title: text, description: text, url });
    const escaped = "Ports move $1.2B; $&amp; $' $` stay &lt;literal&gt;";
    expect(html).toContain(`<title>${escaped} | Floridanomics</title>`);
    expect(html).toContain(`<meta name="description" content="${escaped}" />`);
    expect(html).toContain(`<meta property="og:title" content="${escaped} | Floridanomics" />`);
    expect(html).toContain(`<meta name="twitter:description" content="${escaped}" />`);
    expect(html).toContain(`<link rel="canonical" href="${url}" />`);
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html).not.toContain("og:image");
    expect(html).toContain('name="twitter:card" content="summary"');
  });

  it("inserts rendered content and stylesheets literally", () => {
    const html = withRegionContent(template, "<p>$1 and $& and $'</p>", ["/assets/region.css"]);
    expect(html).toContain("<div id=\"root\"><p>$1 and $& and $'</p></div>");
    expect(html).toContain('<link rel="stylesheet" href="/assets/region.css" />\n</head>');
  });
});
