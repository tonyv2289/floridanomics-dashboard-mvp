import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import regionalEconomy from "../../public/data/regional-economy.json";
import type { DashboardDataset } from "../types/dashboard";
import type { RegionalEconomy } from "../regions/geographies";
import { buildHomeModel, formatCountyChange, parseScaled } from "./home-model";

const dataset = () => JSON.parse(readFileSync(new URL("../../public/data/florida-economy.json", import.meta.url), "utf8")) as DashboardDataset;
const model = () => buildHomeModel(dataset(), regionalEconomy as RegionalEconomy);

describe("homepage model", () => {
  it("builds the hero from the published metrics, with dated labels and signed changes", () => {
    const hero = model().hero;
    const data = dataset();
    expect(hero).toHaveLength(4);
    expect(hero[0].value).toBe(Math.round(data.metrics.nonfarmPayrolls.latest.value * 1000).toLocaleString("en-US"));
    expect(hero[0].label).toMatch(/^Payroll jobs, [A-Z][a-z]+ \d{4}$/);
    expect(hero[1].value).toBe(`${data.metrics.unemploymentRate.latest.value.toFixed(1)}%`);
    expect(hero[3].value).toMatch(/^\$\d+\.\dB$/);
  });

  it("travels the eight regions in geographic order with every benchmark county placed on the map", () => {
    const { regions, countyCount } = model();
    expect(regions.map((region) => region.id)).toEqual(["panhandle", "north-central", "northeast", "orlando-osceola", "space-coast", "tampa-bay", "southwest", "south-florida"]);
    expect(countyCount).toBe((regionalEconomy as RegionalEconomy).counties.length);
    for (const region of regions) {
      expect(region.counties.length).toBeGreaterThan(0);
      expect(region.note.length).toBeGreaterThan(10);
      expect(region.href).toMatch(new RegExp(`/regions/${region.id}/$`));
    }
  });

  it("derives region notes from the data rather than fixed text", () => {
    const counties = (regionalEconomy as RegionalEconomy).counties.filter((county) => county.employmentChangePercent !== null);
    const fastest = counties.reduce((a, b) => ((b.employmentChangePercent ?? 0) > (a.employmentChangePercent ?? 0) ? b : a));
    const note = model().regions.find((region) => region.counties.some((county) => county.fips === fastest.fips))?.note ?? "";
    if ((fastest.employmentChangePercent ?? 0) > 0) expect(note).toContain(`${fastest.name} grew jobs`);
    expect(model().regions.find((region) => region.id === "space-coast")?.note).toMatch(/launches in \d{4}/);
  });

  it("charts the facility-project climb from the year-by-year table", () => {
    const climb = model().climb!;
    const florida = dataset().competition.stateInvestment!.facilityHistory!.states.find((row) => row.state === "Florida")!;
    expect(climb.ranks).toEqual(florida.rankPerMillion);
    expect(climb.title).toMatch(/^From \d+(st|nd|rd|th) to \d+(st|nd|rd|th) per resident\.$/);
    expect(climb.body).toMatch(/(below|above) the 50-state median/);
  });

  it("reads the flows from the published distinctives and parses printed figures", () => {
    expect(parseScaled("1.115M TEUs")).toBeCloseTo(1_115_000);
    expect(parseScaled("$3.3B")).toBeCloseTo(3_300_000_000);
    expect(parseScaled("126,392 TEUs")).toBe(126_392);
    expect(parseScaled("Almost")).toBeNull();
    const { launches, ports, migration } = model();
    expect(launches?.count).toBeGreaterThan(0);
    expect(ports?.bars.length).toBeGreaterThan(0);
    expect(ports?.bars.every((bar) => bar.share > 0 && bar.share <= 1)).toBe(true);
    expect(migration?.value).not.toMatch(/hr/);
  });

  it("lists every state comparison measure, best relative rank first", () => {
    const ledger = model().ledger;
    expect(ledger).toHaveLength(dataset().competition.stateInvestment!.measures.length);
    expect(ledger.every((row, i) => i === 0 || row.position >= ledger[i - 1].position)).toBe(true);
    expect(ledger.every((row) => row.position >= 0 && row.position <= 1)).toBe(true);
  });

  it("formats county changes with a true minus sign and never uses an em dash (brand rule)", () => {
    expect(formatCountyChange(-2.1)).toBe("−2.1%");
    expect(formatCountyChange(2.1)).toBe("+2.1%");
    expect(formatCountyChange(null)).toBe("n/a");
    expect(JSON.stringify(model())).not.toContain("—");
  });
});
