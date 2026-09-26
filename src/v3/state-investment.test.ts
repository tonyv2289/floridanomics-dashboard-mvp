import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatStateValue, ordinal, stateBars } from "./state-investment";
import type { DashboardDataset, StateInvestmentMeasure } from "../types/dashboard";

const dataset = () =>
  JSON.parse(readFileSync(new URL("../../public/data/florida-economy.json", import.meta.url), "utf8")) as DashboardDataset;

const measure = (states: Array<{ state: string; value: number }>, format: StateInvestmentMeasure["format"] = "signedPct1"): StateInvestmentMeasure => ({
  id: "test",
  label: "Test measure",
  question: "Test?",
  period: "2025",
  format,
  florida: { value: 1, rank: 1, rankOf: 3, rankScope: "test" },
  reference: null,
  states,
  read: "Read.",
  caveat: "Caveat.",
  sourceIds: ["si_bls_ces"],
});

describe("state investment comparison", () => {
  it("formats each unit without inventing precision", () => {
    expect(formatStateValue(13.89, "decimal1")).toBe("13.9");
    expect(formatStateValue(163.7, "usd0")).toBe("$164");
    expect(formatStateValue(0.92, "pct1")).toBe("0.9%");
    expect(formatStateValue(4.19, "signedPct1")).toBe("+4.2%");
    expect(formatStateValue(-3.04, "signedPct1")).toBe("-3.0%");
  });

  it("uses correct ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 31, 46].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "31st", "46th"]);
  });

  it("draws negative values left of a shared zero line and flags Florida", () => {
    const { bars, zeroPercent } = stateBars(measure([{ state: "Texas", value: 6 }, { state: "Florida", value: 4 }, { state: "Virginia", value: -3 }]));
    expect(bars.map((bar) => bar.state)).toEqual(["Texas", "Florida", "Virginia"]);
    expect(zeroPercent).toBeCloseTo(33.33, 1);
    const virginia = bars[2];
    expect(virginia.offsetPercent + virginia.widthPercent).toBeCloseTo(zeroPercent, 5);
    expect(bars.find((bar) => bar.isFlorida)?.label).toBe("+4.0%");
  });

  it("ships a complete comparison: five measures, Florida in every one, every claim cited", () => {
    const data = dataset();
    const invest = data.competition.stateInvestment;
    expect(invest).toBeDefined();
    const sourceIds = new Set(data.competition.sources.map((source) => source.id));
    expect(invest!.measures).toHaveLength(5);
    for (const item of invest!.measures) {
      expect(item.states.some((row) => row.state === "Florida")).toBe(true);
      expect(item.states).toHaveLength(invest!.peerStates.length + 1);
      expect(item.florida.rank).toBeLessThanOrEqual(item.florida.rankOf);
      expect(item.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
    }
    for (const fact of invest!.dataCenters.facts) expect(fact.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
    expect(invest!.finalists.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
  });

  it("never attributes the undisclosed Fort Meade end user", () => {
    const text = JSON.stringify(dataset().competition.stateInvestment);
    expect(text).toContain("end user undisclosed");
    expect(/Fort Meade[^.]*\bMeta\b/.test(text)).toBe(false);
  });
});
