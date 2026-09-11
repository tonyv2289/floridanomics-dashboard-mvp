import { describe, expect, it } from "vitest";
import { buildCountyBenchmarks, completedQuarters, parseCsv } from "./regional-qcew";
import { REGION_COUNTIES } from "../../src/regions/geographies";

const header = "area_fips,own_code,industry_code,agglvl_code,size_code,year,qtr,disclosure_code,month3_emplvl,avg_wkly_wage,oty_disclosure_code,oty_month3_emplvl_pct_chg";
const rows = () => Object.values(REGION_COUNTIES).flat().map((county) => `${county.fips},0,10,70,0,2026,1,,100000,1500,,1.2`);

describe("county benchmark ingestion", () => {
  it("handles quoted CSV fields, commas, escaped quotes and CRLF", () => expect(parseCsv('a,b\r\n"A, B","He said ""yes"""\r\n')).toEqual([["a", "b"], ["A, B", 'He said "yes"']]));
  it("requires the exact county all-ownership, all-industry population", () => {
    const result = buildCountyBenchmarks([header, ...rows()].join("\n"), 2026, 1, "2026-09-11");
    expect(result.counties).toHaveLength(19);
    expect(result.employmentMonth).toBe("2026-03-01");
    expect(result.quarterEnd).toBe("2026-03-31");
    expect(result.counties[0].weeklyWage).toBe(1500);
  });
  it("rejects missing, duplicated and suppressed county data instead of publishing partial coverage", () => {
    expect(() => buildCountyBenchmarks([header, ...rows().slice(1)].join("\n"), 2026, 1, "2026-09-11")).toThrow("Missing or duplicate");
    expect(() => buildCountyBenchmarks([header, ...rows(), rows()[0]].join("\n"), 2026, 1, "2026-09-11")).toThrow("Missing or duplicate");
    expect(() => buildCountyBenchmarks([header, ...rows().map((row) => row.replace("2026,1,,", "2026,1,N,"))].join("\n"), 2026, 1, "2026-09-11")).toThrow("Unavailable");
  });
  it("rejects a mixed vintage and malformed CSV", () => {
    expect(() => buildCountyBenchmarks([header, ...rows()].join("\n"), 2026, 2, "2026-09-11")).toThrow();
    expect(() => parseCsv('"unfinished')).toThrow();
  });
  it("probes only completed quarters and crosses calendar years correctly", () => {
    expect(completedQuarters(new Date("2026-09-11"))[0]).toEqual({ year: 2026, quarter: 2 });
    expect(completedQuarters(new Date("2027-01-11"))[0]).toEqual({ year: 2026, quarter: 4 });
  });
});
