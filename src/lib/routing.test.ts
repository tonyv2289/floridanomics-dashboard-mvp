import { describe, expect, it } from "vitest";
import { resolveAppView } from "./routing";

describe("resolveAppView", () => {
  it("resolves shareable regional paths before query-string views", () => {
    expect(resolveAppView("", "/regions/space-coast/")).toBe("region");
    expect(resolveAppView("?view=atlas", "/regions/southwest/")).toBe("region");
    expect(resolveAppView("", "/floridanomics-dashboard-mvp/regions/panhandle/")).toBe("region");
  });
  it("uses the briefing as the public front door", () => {
    expect(resolveAppView("")).toBe("briefing");
    expect(resolveAppView("?utm_source=linkedin")).toBe("briefing");
  });

  it("opens the full explorer when requested", () => {
    expect(resolveAppView("?view=dashboard")).toBe("dashboard");
  });

  it("adds the atlas without breaking existing deep links", () => {
    expect(resolveAppView("?view=atlas")).toBe("atlas");
    expect(resolveAppView("?view=atlas&tab=trade&region=space-coast")).toBe("atlas");
    expect(resolveAppView("?view=unknown")).toBe("briefing");
  });

  it("preserves existing dashboard deep links", () => {
    expect(resolveAppView("?tab=trade")).toBe("dashboard");
    expect(resolveAppView("?metric=unemploymentRate")).toBe("dashboard");
  });

  it("honors an explicit briefing request over stale dashboard parameters", () => {
    expect(resolveAppView("?view=briefing&tab=trade")).toBe("briefing");
  });
});
