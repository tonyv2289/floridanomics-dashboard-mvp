import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const base = readFileSync(new URL("./atlas.css", import.meta.url), "utf8");
const scenes = readFileSync(new URL("./regional-scenes.css", import.meta.url), "utf8");

describe("Florida Brain brand stays independent of scene art direction", () => {
  it("retains the established orange, midnight navy and cool white brand tokens", () => {
    expect(base).toContain("--atlas-sun:#ff8f3f");
    expect(base).toContain("background:#02060d;color:#e8eef9");
    expect(scenes).not.toMatch(/--atlas-(?:sun|border|muted)\s*:/);
  });

  it("uses the brand accent instead of the reference site's yellow", () => {
    expect(scenes).not.toMatch(/#(?:f4c638|ffdf70|f4d567|d2b64f)/i);
    expect(scenes).toContain("background: var(--atlas-sun)");
    expect(scenes).toContain("color: var(--atlas-sun)");
  });
});
