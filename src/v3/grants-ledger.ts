import type { GovernmentGrantAward, GrantFundingType, GrantStage } from "../types/dashboard";

export type GrantGeographyFilter = "all" | "florida" | "peers";
export type GrantFundingLevelFilter = "all" | "federal" | "state";
export type GrantSort = "award" | "newest" | "leverage";

export type GrantLedgerFilters = {
  geography: GrantGeographyFilter;
  fundingLevel: GrantFundingLevelFilter;
  sector: string;
  query: string;
  sort: GrantSort;
};

export function filterGovernmentGrants(
  awards: GovernmentGrantAward[],
  filters: GrantLedgerFilters,
): GovernmentGrantAward[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return awards
    .filter((award) => {
      if (filters.geography === "florida" && !award.isFlorida) return false;
      if (filters.geography === "peers" && award.isFlorida) return false;
      if (filters.fundingLevel !== "all" && award.fundingLevel !== filters.fundingLevel) return false;
      if (filters.sector !== "all" && award.sector !== filters.sector) return false;
      if (
        query &&
        ![
          award.recipient,
          award.program,
          award.fundingAgency,
          award.administeringAgency ?? "",
          award.state,
          award.geography,
          award.sector,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "newest") return b.awardDate.localeCompare(a.awardDate);
      if (filters.sort === "leverage") {
        return getGrantLeverageRatio(b) - getGrantLeverageRatio(a);
      }
      return b.awardAmountUsdMillions - a.awardAmountUsdMillions;
    });
}

export function getGrantLeverageRatio(award: GovernmentGrantAward): number {
  return award.leveragedCapitalUsdMillions === null
    ? 0
    : award.leveragedCapitalUsdMillions / award.awardAmountUsdMillions;
}

export function summarizeGovernmentGrants(awards: GovernmentGrantAward[]) {
  const countable = awards.filter((award) => award.countInTotals);
  const florida = countable.filter((award) => award.isFlorida);
  const floridaFederal = florida.filter((award) => award.fundingLevel === "federal");
  const peers = countable.filter((award) => !award.isFlorida);
  const sumAwards = (items: GovernmentGrantAward[]) =>
    items.reduce((sum, award) => sum + award.awardAmountUsdMillions, 0);
  const leveragedPeers = peers.filter((award) => award.leveragedCapitalUsdMillions !== null);
  const peerAwardsWithLeverage = sumAwards(leveragedPeers);
  const peerLeveragedCapital = leveragedPeers.reduce(
    (sum, award) => sum + (award.leveragedCapitalUsdMillions ?? 0),
    0,
  );
  const largestPeerAward = peers.reduce<GovernmentGrantAward | null>(
    (largest, award) =>
      largest === null || award.awardAmountUsdMillions > largest.awardAmountUsdMillions ? award : largest,
    null,
  );

  return {
    countableAwardCount: countable.length,
    floridaAwardCount: florida.length,
    floridaAwardAmount: sumAwards(florida),
    floridaHasMinimumAmount: florida.some((award) => award.amountQualifier === "minimum"),
    floridaFederalShare: sumAwards(florida) > 0 ? sumAwards(floridaFederal) / sumAwards(florida) : 0,
    largestPeerAward,
    peerLeverageRatio: peerAwardsWithLeverage > 0 ? peerLeveragedCapital / peerAwardsWithLeverage : 0,
    peerLeverageAwardCount: leveragedPeers.length,
  };
}

export function formatGrantMillions(value: number, qualifier: GovernmentGrantAward["amountQualifier"] = "exact") {
  const formatted =
    value >= 1000
      ? `$${(value / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`
      : `$${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  return qualifier === "minimum" ? `${formatted}+` : formatted;
}

export function formatGrantFundingType(type: GrantFundingType) {
  return type === "cooperative_agreement" ? "Cooperative agreement" : "Grant";
}

export function formatGrantStage(stage: GrantStage) {
  return {
    awarded: "Awarded",
    active: "Active",
    completed: "Completed",
  }[stage];
}
