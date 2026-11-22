import { describe, expect, it } from "vitest";
import { asSentence, withoutPanelMonths } from "./format";

describe("withoutPanelMonths", () => {
  const trim = (headline: string) => withoutPanelMonths(headline, "October 2026", "September 2026");

  it("drops the two months the panel heading already names", () => {
    expect(trim("Nonfarm Payrolls: 10M in October 2026, up 8K jobs from September 2026.")).toBe("Nonfarm Payrolls: 10M, up 8K jobs.");
    expect(trim("Miami unemployment rose to 4.1% in October 2026, up 0.2 points from September 2026.")).toBe(
      "Miami unemployment rose to 4.1%, up 0.2 points.",
    );
  });

  it("keeps the dates on a line about other months", () => {
    expect(trim("Business Applications: 58.9K in September 2026, down 75 from August 2026.")).toBe(
      "Business Applications: 58.9K in September 2026, down 75 from August 2026.",
    );
  });

  it("leaves revision lines alone", () => {
    expect(trim("Nonfarm Payrolls for September 2026 was revised to 10M from 10M.")).toBe(
      "Nonfarm Payrolls for September 2026 was revised to 10M from 10M.",
    );
  });
});

describe("asSentence", () => {
  it("adds a period to a data note that has none", () => {
    expect(asSentence("FloridaCommerce's April 2026 annual-release estimate; later Census revisions differ")).toBe(
      "FloridaCommerce's April 2026 annual-release estimate; later Census revisions differ.",
    );
  });

  it("keeps end punctuation that is already there", () => {
    expect(asSentence("Targets are policy goals.")).toBe("Targets are policy goals.");
    expect(asSentence("Is it a forecast?")).toBe("Is it a forecast?");
  });

  it("closes a note that ends in parentheses", () => {
    expect(asSentence("Counted in twenty-foot-equivalent units (TEUs)")).toBe("Counted in twenty-foot-equivalent units (TEUs).");
  });
});
