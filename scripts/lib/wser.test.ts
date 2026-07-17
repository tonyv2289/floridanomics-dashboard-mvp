import { describe, expect, it } from "vitest";
import { floridaIsoDate } from "./wser";

describe("floridaIsoDate", () => {
  it("keeps the Florida calendar date before Eastern midnight", () => {
    expect(floridaIsoDate(new Date("2026-07-17T01:00:00Z"))).toBe("2026-07-16");
  });

  it("advances after midnight in Florida", () => {
    expect(floridaIsoDate(new Date("2026-07-17T14:00:00Z"))).toBe("2026-07-17");
  });
});
