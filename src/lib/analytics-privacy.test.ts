import { describe, expect, it } from "vitest";
import { safeCampaignProps, sanitizeAnalyticsUrl } from "./analytics-privacy";

const BASE = "https://www.floridanomics.com";

describe("analytics privacy", () => {
  it("removes all query strings, fragments and URL credentials", () => {
    expect(sanitizeAnalyticsUrl("https://user:password@example.com/brief?email=private%40example.com&invite=secret#token", BASE))
      .toBe("https://example.com/brief");
  });
  it("keeps only the public path of relative links", () => {
    expect(sanitizeAnalyticsUrl("/briefs/ai-capex-gap/?ref=private#note", BASE)).toBe(`${BASE}/briefs/ai-capex-gap/`);
  });
  it("rejects executable or non-web URLs", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,private", "mailto:private@example.com", "http://["])
      expect(sanitizeAnalyticsUrl(url, BASE)).toBe("");
  });
  it("keeps campaign slugs but drops per-recipient and free-text fields", () => {
    expect(safeCampaignProps("?utm_source=linkedin&utm_medium=social&utm_campaign=fall-2026&invite=secret&ref=person&utm_term=private&utm_content=private&email=a%40b.com"))
      .toEqual({ utm_source: "linkedin", utm_medium: "social", utm_campaign: "fall-2026" });
  });
  it("rejects encoded email addresses and oversized campaign values", () => {
    expect(safeCampaignProps(`?utm_source=person%40example.com&utm_medium=person%2540example.com&utm_campaign=${"a".repeat(49)}`)).toEqual({});
  });
});
