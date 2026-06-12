import { describe, expect, it } from "vitest";
import { candidateQuarters, latestPricePerState, parseQcewTotalRow } from "./benchmarks";

const HEADER =
  '"area_fips","own_code","industry_code","agglvl_code","size_code","year","qtr","disclosure_code","qtrly_estabs","month1_emplvl","month2_emplvl","month3_emplvl","total_qtrly_wages","taxable_qtrly_wages","qtrly_contributions","avg_wkly_wage","lq_disclosure_code","lq_qtrly_estabs","lq_month1_emplvl","lq_month2_emplvl","lq_month3_emplvl","lq_total_qtrly_wages","lq_taxable_qtrly_wages","lq_qtrly_contributions","lq_avg_wkly_wage","oty_disclosure_code","oty_qtrly_estabs_chg","oty_qtrly_estabs_pct_chg","oty_month1_emplvl_chg","oty_month1_emplvl_pct_chg","oty_month2_emplvl_chg","oty_month2_emplvl_pct_chg","oty_month3_emplvl_chg","oty_month3_emplvl_pct_chg","oty_total_qtrly_wages_chg","oty_total_qtrly_wages_pct_chg","oty_taxable_qtrly_wages_chg","oty_taxable_qtrly_wages_pct_chg","oty_qtrly_contributions_chg","oty_qtrly_contributions_pct_chg","oty_avg_wkly_wage_chg","oty_avg_wkly_wage_pct_chg"';

const TOTAL_ROW =
  '"12000","0","10","50","0","2025","3","",867133,9699161,9838658,9832364,170620344133,7848198631,52411400,1341,"",1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,"",1283,0.1,51794,0.5,30281,0.3,-835,0.0,8606803495,5.3,-225254896,-2.8,-16794745,-24.3,64,5.0';

const FEDERAL_ROW =
  '"12000","1","10","51","0","2025","3","",1992,159591,158510,158365,4246140247,0,0,2057,"",0.47,0.87,0.86,0.86,0.89,0.00,0.00,1.04,"",-3,-0.2,-2031,-1.3,-3520,-2.2,-3948,-2.4,74751874,1.8,0,0.0,0,0.0,76,3.8';

describe("parseQcewTotalRow", () => {
  it("extracts the total-covered statewide wage row", () => {
    const parsed = parseQcewTotalRow([HEADER, FEDERAL_ROW, TOTAL_ROW].join("\n"));
    expect(parsed?.avgWeeklyWage).toBe(1341);
    expect(parsed?.yoyPercent).toBe(5.0);
  });

  it("ignores ownership sub-rows", () => {
    const parsed = parseQcewTotalRow([HEADER, FEDERAL_ROW].join("\n"));
    expect(parsed).toBeNull();
  });

  it("returns null on empty payloads", () => {
    expect(parseQcewTotalRow(HEADER)).toBeNull();
  });
});

describe("candidateQuarters", () => {
  it("walks backward from the current year, newest quarter first", () => {
    const candidates = candidateQuarters(new Date(Date.UTC(2026, 5, 12)));
    expect(candidates[0]).toEqual({ year: 2026, quarter: 4 });
    expect(candidates).toHaveLength(8);
    expect(candidates[7]).toEqual({ year: 2025, quarter: 1 });
  });
});

describe("latestPricePerState", () => {
  it("keeps the first (newest) row per state", () => {
    const map = latestPricePerState([
      { period: "2026-03", stateid: "FL", price: "9.1" },
      { period: "2026-03", stateid: "TX", price: 6.5 },
      { period: "2026-02", stateid: "FL", price: 9.4 },
      { period: "2026-02", stateid: "GA", price: "7.2" },
    ]);
    expect(map.get("FL")).toEqual({ price: 9.1, period: "2026-03" });
    expect(map.get("TX")?.price).toBe(6.5);
    expect(map.get("GA")?.period).toBe("2026-02");
  });

  it("drops malformed rows", () => {
    const map = latestPricePerState([{ period: "2026-03", price: 9 }, { stateid: "TX", price: "n/a" }]);
    expect(map.size).toBe(0);
  });
});
