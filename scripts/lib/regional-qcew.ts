import { REGION_COUNTIES, type RegionalEconomy } from "../../src/regions/geographies";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if (character === "\n" && !quoted) { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += character;
  }
  if (quoted) throw new Error("Unclosed CSV field");
  if (row.length || value) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

export function buildCountyBenchmarks(csv: string, year: number, quarter: number, retrievedAt: string): RegionalEconomy {
  const [headers, ...rows] = parseCsv(csv);
  if (!headers?.includes("avg_wkly_wage")) throw new Error("QCEW schema unavailable");
  const records = rows.map((row) => Object.fromEntries(headers.map((key, index) => [key, row[index]])));
  const counties = Object.values(REGION_COUNTIES).flat().map((county) => {
    const matches = records.filter((row) => row.area_fips === county.fips && row.own_code === "0" && row.industry_code === "10" && row.agglvl_code === "70" && row.size_code === "0" && row.year === String(year) && row.qtr === String(quarter));
    if (matches.length !== 1) throw new Error(`Missing or duplicate QCEW county: ${county.name}`);
    const row = matches[0];
    const jobs = Number(row.month3_emplvl), weeklyWage = Number(row.avg_wkly_wage);
    if (row.disclosure_code?.trim() || !Number.isFinite(jobs) || !Number.isFinite(weeklyWage) || jobs <= 0 || weeklyWage <= 0) throw new Error(`Unavailable QCEW county: ${county.name}`);
    const change = row.oty_disclosure_code?.trim() || !row.oty_month3_emplvl_pct_chg?.trim() ? null : Number(row.oty_month3_emplvl_pct_chg);
    return { ...county, jobs, weeklyWage, employmentChangePercent: change !== null && Number.isFinite(change) ? change : null };
  });
  return {
    period: `Q${quarter} ${year}`,
    employmentMonth: `${year}-${String(quarter * 3).padStart(2, "0")}-01`,
    quarterEnd: new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10),
    retrievedAt,
    sourceUrl: `https://data.bls.gov/cew/data/api/${year}/${quarter}/industry/10.csv`,
    counties,
  };
}

export function completedQuarters(now: Date): Array<{ year: number; quarter: number }> {
  const current = now.getUTCFullYear() * 4 + Math.floor(now.getUTCMonth() / 3);
  return [1, 2, 3, 4].map((offset) => ({ year: Math.floor((current - offset) / 4), quarter: (current - offset) % 4 + 1 }));
}
