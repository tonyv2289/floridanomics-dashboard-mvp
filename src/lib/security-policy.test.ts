import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("release security safeguards", () => {
  for (const path of ["index.html", "public/briefs/ai-capex-gap/index.html"]) {
    it(`enforces a restrictive script and form policy in ${path}`, () => {
      const html = read(path);
      const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
      expect(policy).toBeTruthy();
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'none'");
      expect(policy).toContain("form-action ");
      expect(policy?.match(/script-src ([^;]+)/)?.[1]).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
      expect(html).toContain('<meta name="referrer" content="no-referrer"');
      // These protections cannot be implemented by a meta tag.
      expect(policy).not.toContain("frame-ancestors");
      expect(html.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(html.indexOf("<link"));
    });
  }
  it("keeps committed environment files credential-free", () => {
    const assignments = (text: string) => text.split("\n").filter((line) => /^\w+=/.test(line));
    expect(assignments(read(".env.production"))).toEqual(["VITE_PUBLIC_URL=https://www.floridanomics.com/"]);
    expect(assignments(read(".env.example")).every((line) => /^\w+=$/.test(line))).toBe(true);
    expect(read(".gitignore")).toContain("\n.env\n.env.*\n");
  });
  it("requires security and tests before production artifacts are uploaded", () => {
    const workflow = read(".github/workflows/deploy-pages.yml");
    expect(workflow).toContain("npm run security:prod && npm run security:audit");
    expect(workflow).toContain("npm run lint && npm test");
    expect(workflow.indexOf("Security gate")).toBeLessThan(workflow.indexOf("Upload artifact"));
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
  });
});
