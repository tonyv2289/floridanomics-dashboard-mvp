import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import economy from "../../public/data/regional-economy.json";
import { REGIONS } from "../atlas/data";
import { REGIONAL_PROFILES, regionIdFromPath, regionalPath } from "./profiles";
import { REGION_COUNTIES } from "./geographies";
import { RegionProfile } from "./RegionProfile";
import { SiteNav } from "../components/SiteNav";
import { SECTION_TABS, sectionForTab, PRIMARY_TAB_OPTIONS, DEEP_TAB_OPTIONS } from "../v3/constants";

describe("regional profiles", () => {
  it("covers all eight map regions with employers, research, projects and county benchmarks", () => {
    expect(REGIONAL_PROFILES.map((region) => region.id)).toEqual(REGIONS.map((region) => region.id));
    for (const profile of REGIONAL_PROFILES) {
      expect(profile.employers.length).toBeGreaterThan(0);
      expect(profile.research.length).toBeGreaterThan(0);
      expect(profile.projects.length).toBeGreaterThan(0);
      for (const county of REGION_COUNTIES[profile.id]) expect(economy.counties.find((row) => row.fips === county.fips)?.weeklyWage).toBeGreaterThan(0);
      for (const entry of [...profile.employers, ...profile.research, ...profile.projects]) {
        expect(new URL(entry.source.url).protocol).toBe("https:");
        expect(entry.source.asOf).toMatch(/^20\d{2}-\d{2}/);
        expect(entry.detail).not.toMatch(/salesforce|@|pelayo-vault|\bCRM\b/);
      }
    }
  });

  it.each(REGIONAL_PROFILES)("renders a source-linked, independently readable $id page", (profile) => {
    const html = renderToStaticMarkup(createElement(RegionProfile, { profile, economy, base: "/" }));
    expect(html).toContain(profile.title.replaceAll("&", "&amp;"));
    expect(html).toContain("Employers to Know");
    expect(html).toContain("Research &amp; Commercialization");
    expect(html).toContain("Weekly wage");
    expect(html).toContain("not residents in the labor force");
    expect(html).toContain("not totals for the illustrated map region");
    expect(html).toContain(economy.sourceUrl);
    expect(html).toContain(`?view=atlas&amp;region=${profile.id}`);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("NaN");
  });

  it("supports root and subdirectory profile links without reflecting unknown ids", () => {
    expect(regionIdFromPath("/regions/space-coast/")).toBe("space-coast");
    expect(regionIdFromPath("/floridanomics-dashboard-mvp/regions/northeast/")).toBe("northeast");
    expect(regionIdFromPath("/regions/unknown/")).toBeNull();
    expect(regionIdFromPath("/regions/%3Cscript%3E/")).toBeNull();
    expect(regionalPath("southwest", "/example/")).toBe("/example/regions/southwest/");
  });

  it("keeps planned capacity and conditional funding explicitly qualified", () => {
    const orlando = REGIONAL_PROFILES.find((profile) => profile.id === "orlando-osceola")!;
    expect(orlando.projects[0].status).toBe("Funding awarded");
    expect(orlando.projects[0].detail).toContain("up to $45 million");
    expect(REGIONAL_PROFILES.find((profile) => profile.id === "southwest")!.projects[0].status).toBe("Planned");
    expect(REGIONAL_PROFILES.find((profile) => profile.id === "space-coast")!.projects[0].status).toBe("Construction announced");
  });
});

describe("five-section navigation", () => {
  it("presents the same five top-level destinations on every page", () => {
    const html = renderToStaticMarkup(createElement(SiteNav, { active: "regions", base: "/" }));
    for (const label of ["Briefing", "Regions", "Industry &amp; Investment", "Policy", "Sources"]) expect(html).toContain(label);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain("undefined");
  });
  it("retains every legacy dashboard view inside its appropriate section", () => {
    const all = [...PRIMARY_TAB_OPTIONS, ...DEEP_TAB_OPTIONS];
    const grouped = Object.values(SECTION_TABS).flat();
    expect(grouped.map((tab) => tab.id).sort()).toEqual(all.map((tab) => tab.id).sort());
    for (const tab of all) expect(SECTION_TABS[sectionForTab(tab.id)].some((item) => item.id === tab.id)).toBe(true);
  });
});
