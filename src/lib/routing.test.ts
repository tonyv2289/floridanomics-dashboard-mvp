import { describe, expect, it } from "vitest";
import { resolveAppView } from "./routing";

describe("resolveAppView", () => {
  it("uses the briefing as the public front door", () => {
    expect(resolveAppView("")).toBe("briefing");
    expect(resolveAppView("?utm_source=linkedin")).toBe("briefing");
  });

  it("opens the full explorer when requested", () => {
    expect(resolveAppView("?view=dashboard")).toBe("dashboard");
  });

  it("preserves existing dashboard deep links", () => {
    expect(resolveAppView("?tab=trade")).toBe("dashboard");
    expect(resolveAppView("?metric=unemploymentRate")).toBe("dashboard");
  });

  it("honors an explicit briefing request over stale dashboard parameters", () => {
    expect(resolveAppView("?view=briefing&tab=trade")).toBe("briefing");
  });
});
