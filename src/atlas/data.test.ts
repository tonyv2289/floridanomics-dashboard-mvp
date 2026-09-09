import { describe, expect, it } from "vitest";
import florida from "../data/florida.geo.json";
import { ALL_ASSETS, REGIONS, SECTORS, TOUR, nextTourRegion, projectLocation, readAtlasQuery, regionMatches } from "./data";

describe("public atlas content", () => {
  it("has eight curated regions, eight guided chapters and unique identifiers", () => {
    expect(REGIONS).toHaveLength(8);
    expect(TOUR.map((r) => r.id)).toEqual(REGIONS.map((r) => r.id));
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length);
    expect(new Set(ALL_ASSETS.map((a) => a.id)).size).toBe(ALL_ASSETS.length);
    expect(REGIONS.every((r) => r.assets.length > 0)).toBe(true);
    expect(ALL_ASSETS.some((a) => a.kind === "Company")).toBe(true);
  });

  it("requires a public primary source for every asset and contains no contacts", () => {
    const hosts = new Set(["www.nasa.gov", "www.portcanaveral.com", "www.neocityfl.com", "www.ist.ucf.edu", "www.porttb.com", "www.sofwerx.org", "www.usf.edu", "researchparkfau.com", "www.miamidade.gov", "www.jaxport.com", "ufinnovateaccelerate.com", "nationalmaglab.org", "www.ihmc.us", "www.fgcu.edu"]);
    for (const asset of ALL_ASSETS) {
      const url = new URL(asset.source);
      expect(url.protocol).toBe("https:");
      expect(hosts.has(url.hostname)).toBe(true);
      expect(asset.sourceName.length).toBeGreaterThan(5);
      expect(asset.summary).not.toMatch(/@|salesforce|dossier|pelayo-vault/i);
      expect(SECTORS).toContain(asset.sector);
      expect(asset.sector).not.toBe("All sectors");
    }
  });

  it("makes every sector useful and reveals cross-regional overlaps", () => {
    for (const sector of SECTORS) expect(REGIONS.some((r) => regionMatches(r, sector))).toBe(true);
    expect(REGIONS.filter((r) => regionMatches(r, "Trade & logistics")).map((r) => r.id)).toEqual(["space-coast", "tampa-bay", "south-florida", "northeast"]);
    expect(REGIONS.filter((r) => regionMatches(r, "Advanced industry")).map((r) => r.id)).toEqual(["orlando-osceola", "north-central"]);
  });

  it("links MagLab to its current official HTTPS host", () => {
    expect(ALL_ASSETS.find((asset) => asset.id === "maglab")?.source).toBe("https://nationalmaglab.org/");
  });
});

describe("atlas navigation", () => {
  it("starts and wraps the guided tour in both directions", () => {
    expect(nextTourRegion(null, 1)).toBe("space-coast");
    expect(nextTourRegion(null, -1)).toBe("southwest");
    expect(nextTourRegion("space-coast", -1)).toBe("southwest");
    expect(nextTourRegion("tampa-bay", 1)).toBe("south-florida");
    expect(nextTourRegion("southwest", 1)).toBe("space-coast");
  });

  it("restores valid deep links and sanitizes unknown or incompatible filters", () => {
    expect(readAtlasQuery("?region=tampa-bay&sector=Trade%20%26%20logistics")).toEqual({ regionId: "tampa-bay", sector: "Trade & logistics" });
    expect(readAtlasQuery("?region=unknown&sector=unknown")).toEqual({ regionId: null, sector: "All sectors" });
    expect(readAtlasQuery("?region=tampa-bay&sector=Space")).toEqual({ regionId: null, sector: "Space" });
  });
});

describe("Florida map geometry", () => {
  it("keeps geography in the expected Florida extent and preserves north and east", () => {
    for (const asset of ALL_ASSETS) {
      const [lon, lat] = asset.coordinates;
      expect(lon).toBeGreaterThan(-88);
      expect(lon).toBeLessThan(-79);
      expect(lat).toBeGreaterThan(24);
      expect(lat).toBeLessThan(32);
    }
    expect(projectLocation([-80, 28])[0]).toBeGreaterThan(projectLocation([-87, 28])[0]);
    expect(projectLocation([-83, 31])[1]).toBeLessThan(projectLocation([-83, 25])[1]);
    expect(florida.geometry.coordinates.flat(2).every((p) => projectLocation(p).every(Number.isFinite))).toBe(true);
  });

});
