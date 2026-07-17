import { describe, expect, it } from "vitest";
import type { GovernmentGrantAward } from "../types/dashboard";
import {
  filterGovernmentGrants,
  formatGrantMillions,
  getGrantLeverageRatio,
  summarizeGovernmentGrants,
} from "./grants-ledger";

const floridaAward: GovernmentGrantAward = {
  id: "fl-award",
  recipient: "Florida Recipient",
  recipientType: "state_agency",
  fundingAgency: "Federal Agency",
  administeringAgency: null,
  program: "Florida Program",
  stateId: "FL",
  state: "Florida",
  geography: "Statewide",
  isFlorida: true,
  sector: "Workforce",
  fundingType: "cooperative_agreement",
  fundingLevel: "federal",
  awardAmountUsdMillions: 40,
  amountQualifier: "minimum",
  leveragedCapitalUsdMillions: null,
  jobsCreated: null,
  jobsRetained: null,
  stage: "awarded",
  stageDetail: "Awarded",
  awardDate: "2026-07-07",
  performanceEndDate: null,
  assistanceListing: null,
  awardId: null,
  countInTotals: true,
  strategicRead: "Read",
  lastVerifiedDate: "2026-07-17",
  sourceIds: ["source"],
};

const peerAward: GovernmentGrantAward = {
  ...floridaAward,
  id: "peer-award",
  recipient: "Peer Recipient",
  program: "Semiconductor Fund",
  stateId: "TX",
  state: "Texas",
  geography: "Austin",
  isFlorida: false,
  sector: "Semiconductors",
  fundingType: "grant",
  fundingLevel: "state",
  awardAmountUsdMillions: 10,
  amountQualifier: "exact",
  leveragedCapitalUsdMillions: 200,
  awardDate: "2026-01-01",
};

describe("government grants ledger", () => {
  it("filters by geography and funding level without mixing peer awards", () => {
    const results = filterGovernmentGrants([floridaAward, peerAward], {
      geography: "peers",
      fundingLevel: "state",
      sector: "all",
      query: "semiconductor",
      sort: "award",
    });

    expect(results.map((award) => award.id)).toEqual(["peer-award"]);
  });

  it("counts only eligible award rows and preserves minimum qualifiers", () => {
    const excluded = { ...peerAward, id: "context-row", countInTotals: false };
    const summary = summarizeGovernmentGrants([floridaAward, peerAward, excluded]);

    expect(summary.countableAwardCount).toBe(2);
    expect(summary.floridaAwardAmount).toBe(40);
    expect(summary.floridaFederalShare).toBe(1);
    expect(summary.floridaHasMinimumAmount).toBe(true);
    expect(summary.largestPeerAward?.id).toBe("peer-award");
  });

  it("calculates documented leverage only from awards with disclosed capital", () => {
    const summary = summarizeGovernmentGrants([floridaAward, peerAward]);

    expect(getGrantLeverageRatio(peerAward)).toBe(20);
    expect(summary.peerLeverageRatio).toBe(20);
    expect(summary.peerLeverageAwardCount).toBe(1);
  });

  it("formats award amounts without hiding a minimum disclosure", () => {
    expect(formatGrantMillions(40, "minimum")).toBe("$40M+");
    expect(formatGrantMillions(4730)).toBe("$4.7B");
  });
});
