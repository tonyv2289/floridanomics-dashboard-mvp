// Selected county benchmarks, never totals for the atlas's illustrative pieces.
export const REGION_COUNTIES: Record<string, Array<{ fips: string; name: string }>> = {
  "space-coast": [{ fips: "12009", name: "Brevard" }],
  "orlando-osceola": [{ fips: "12095", name: "Orange" }, { fips: "12097", name: "Osceola" }],
  "tampa-bay": [{ fips: "12057", name: "Hillsborough" }, { fips: "12103", name: "Pinellas" }, { fips: "12101", name: "Pasco" }],
  "south-florida": [{ fips: "12086", name: "Miami-Dade" }, { fips: "12011", name: "Broward" }, { fips: "12099", name: "Palm Beach" }],
  northeast: [{ fips: "12031", name: "Duval" }, { fips: "12109", name: "St. Johns" }],
  "north-central": [{ fips: "12001", name: "Alachua" }, { fips: "12073", name: "Leon" }],
  panhandle: [{ fips: "12033", name: "Escambia" }, { fips: "12091", name: "Okaloosa" }, { fips: "12005", name: "Bay" }],
  southwest: [{ fips: "12071", name: "Lee" }, { fips: "12021", name: "Collier" }, { fips: "12015", name: "Charlotte" }],
};

export type CountyBenchmark = { fips: string; name: string; jobs: number; weeklyWage: number; employmentChangePercent: number | null };
export type RegionalEconomy = {
  period: string;
  employmentMonth: string;
  quarterEnd: string;
  retrievedAt: string;
  sourceUrl: string;
  counties: CountyBenchmark[];
};
