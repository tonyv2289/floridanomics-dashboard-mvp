import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REGIONAL_PROFILES } from "../regions/profiles";

describe("sitemap", () => {
  it("lists the homepage and every regional page", () => {
    const xml = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");
    expect(xml).toContain("<loc>https://www.floridanomics.com/</loc>");
    for (const profile of REGIONAL_PROFILES) expect(xml).toContain(`<loc>https://www.floridanomics.com/regions/${profile.id}/</loc>`);
  });
});
