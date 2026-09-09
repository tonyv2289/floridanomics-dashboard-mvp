import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertPublicDataset, assertPublicText, isPublicSourceUrl } from "../../scripts/lib/public-data";

const fixture = () => JSON.parse(readFileSync(new URL("../../public/data/florida-economy.json", import.meta.url), "utf8"));

describe("public data boundary", () => {
  it("publishes only the public competition contract with valid citation references", () => {
    expect(() => assertPublicDataset(fixture())).not.toThrow();
  });
  it.each(["/Users/example/private.docx", "/home/example/private", "C:\\Users\\example\\note", "file:///private/note", "pelayo-vault", "Dropbox source", "Vault derivative"])("rejects private text at any depth: %s", (value) => {
    const data = fixture();
    data.extra = { nested: [{ note: value }] };
    expect(() => assertPublicDataset(data)).toThrow(/Publication blocked/);
  });
  it.each(["vaultLog", "macStudioPath", "localPath", "internalNote", "accessToken"])("rejects private keys: %s", (key) => {
    const data = fixture(); data.extra = { [key]: "hidden" };
    expect(() => assertPublicDataset(data)).toThrow(/Publication blocked/);
  });
  it("rejects unknown fields in sources instead of copying arbitrary provenance", () => {
    const data = fixture(); data.competition.sources[0].researchMemo = "not public";
    expect(() => assertPublicDataset(data)).toThrow(/unapproved/);
  });
  it("rejects withdrawn private-only sections", () => {
    const data = fixture(); data.competition.institutionalCapacity = {};
    expect(() => assertPublicDataset(data)).toThrow(/unapproved/);
  });
  it("rejects dangling or empty citations", () => {
    for (const refs of [[], ["unreviewed_source"]]) {
      const data = fixture(); data.competition.fdiScoreboard.observatory.deltas[0].sourceIds = refs;
      expect(() => assertPublicDataset(data)).toThrow(/citation/);
    }
  });
  it.each(["javascript:alert(1)", "file:///tmp/file", "https://user:secret@example.com/", "https://127.0.0.1/", "https://localhost/", "https://foo.internal/", "https://www.dropbox.com/s/private"])("rejects nonpublic source URL %s", (url) => {
    expect(isPublicSourceUrl(url)).toBe(false);
  });
  it("accepts public primary-source HTTPS URLs", () => {
    expect(isPublicSourceUrl("https://www.bea.gov/data/")).toBe(true);
    expect(() => assertPublicText("Contact info@floridanomics.com")).not.toThrow();
  });
  it("keeps refresh, validation, and build behind privacy gates", () => {
    const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    const refresh = read("scripts/refresh-data.ts");
    expect(refresh.indexOf("assertPublicDataset(dataset)")).toBeLessThan(refresh.indexOf("await writeFile(OUTPUT_FILE"));
    expect(read("scripts/validate-data.ts")).toContain("assertPublicDataset(data)");
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(scripts.build).toContain("check-public-artifacts.ts public");
    expect(scripts.build).toContain("check-public-artifacts.ts dist");
  });
});
