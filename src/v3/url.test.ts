import { describe, expect, it } from "vitest";
import { isCompetitionViewId, isV3TabId } from "./url";

describe("v3 URL guards", () => {
  it("recognizes the four primary executive views", () => {
    expect(isV3TabId("brief")).toBe(true);
    expect(isV3TabId("competition")).toBe(true);
    expect(isV3TabId("policy")).toBe(true);
    expect(isV3TabId("evidence")).toBe(true);
  });

  it("preserves specialist views and rejects unknown tabs", () => {
    expect(isV3TabId("talent")).toBe(true);
    expect(isV3TabId("strategy")).toBe(true);
    expect(isV3TabId("news")).toBe(false);
    expect(isV3TabId(null)).toBe(false);
  });

  it("recognizes every competition ledger and comparison view", () => {
    for (const view of ["projects", "grants", "metro", "international", "fdi"]) {
      expect(isCompetitionViewId(view)).toBe(true);
    }
    expect(isCompetitionViewId("policy")).toBe(false);
  });
});
