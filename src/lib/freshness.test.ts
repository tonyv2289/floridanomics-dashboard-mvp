import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DashboardDataset } from "../types/dashboard";
import regionalEconomy from "../../public/data/regional-economy.json";
import calendarData from "../../public/data/release-calendar.json";
import { assessFreshness } from "./freshness";
import { parseBlsCalendar, type ReleaseCalendar } from "./release-calendar";
const data = () => JSON.parse(readFileSync(new URL("../../public/data/florida-economy.json", import.meta.url), "utf8")) as DashboardDataset;
const calendar = calendarData as ReleaseCalendar;
const row = (date: string, text: string) => `<tr><td class="date-cell"><p>${date}</p></td><td class="desc-cell"><p>${text}</p></td></tr>`;

describe("official release-calendar parser", () => {
  it("preserves monthly observation and scheduled release as different dates", () => {
    const result = parseBlsCalendar(row("Friday, September 18, 2026", "<strong>State Employment and Unemployment (Monthly)</strong> for August 2026"));
    expect(result[0]).toMatchObject({ program: "state-labor", releaseDate: "2026-09-18", observationDate: "2026-08-01" });
  });
  it("maps a quarter to the QCEW third-month jobs observation", () => {
    const result = parseBlsCalendar(row("Wednesday, December 2, 2026", "County Employment and Wages for Second Quarter 2026"));
    expect(result[0].observationDate).toBe("2026-06-01");
  });
  it("does not treat unrelated national releases as Florida state data", () => expect(parseBlsCalendar(row("Friday, September 4, 2026", "Employment Situation for August 2026"))).toEqual([]));
  it("fails on changed date syntax instead of fabricating a date", () => expect(() => parseBlsCalendar(row("TBD", "County Employment and Wages for Next Quarter"))).toThrow());
});

describe("freshness alerts", () => {
  it("does not call current July data overdue before the August release", () => {
    const findings = assessFreshness(data(), regionalEconomy, calendar, new Date("2026-09-11T18:00:00Z"));
    expect(findings.filter((finding) => finding.level === "overdue")).toEqual([]);
    expect(findings.some((finding) => finding.id === "trade-benchmark")).toBe(true);
  });
  it("flags the published state data after the release grace period", () => {
    expect(assessFreshness(data(), regionalEconomy, calendar, new Date("2026-09-21T18:00:00Z")).some((finding) => finding.id === "state-labor")).toBe(true);
  });
  it("clears a state alert only when every headline series has the new observation", () => {
    const d = data();
    for (const id of ["nonfarmPayrolls", "unemploymentRate", "employmentLevel", "laborForce"] as const) d.metrics[id].latest.date = "2026-08-01";
    expect(assessFreshness(d, regionalEconomy, calendar, new Date("2026-09-21")).some((finding) => finding.id === "state-labor")).toBe(false);
    d.metrics.employmentLevel.latest.date = "2026-07-01";
    expect(assessFreshness(d, regionalEconomy, calendar, new Date("2026-09-21")).some((finding) => finding.id === "state-labor")).toBe(true);
  });
  it("checks county release timing and weekly series without pretending retrieval is observation", () => {
    const next = { ...regionalEconomy, retrievedAt: "2026-12-04" };
    const findings = assessFreshness(data(), next, calendar, new Date("2026-12-05"));
    expect(findings.some((finding) => finding.id === "county-wages")).toBe(true);
    expect(findings.some((finding) => finding.id === "initialClaims")).toBe(true);
    expect(findings.some((finding) => finding.id === "calendar")).toBe(true);
  });
});
