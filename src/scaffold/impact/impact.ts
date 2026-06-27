/**
 * SCAFFOLD - Epic 1: IMPLAN-style economic-impact multiplier layer (the WEG moat).
 * Not wired into the live app. Exists to prove the shape and expose the holdups.
 *
 * HOLDUP (the real blocker): the multiplier COEFFICIENTS. IMPLAN multipliers are
 * licensed/proprietary; WEG (Dr. Tony Villamil) runs them under license. We cannot
 * compute real direct/indirect/induced effects without those region+industry
 * coefficients. The math below is trivial; the data is the gate.
 *
 * Decision needed: (a) get a licensed export of FL IMPLAN multipliers from WEG (by
 * NAICS sector + region), or (b) ship a clearly-labeled "illustrative" mode using
 * published RIMS II-style multipliers from BEA (free, coarser) until WEG data lands.
 */

export type ImpactInput = {
  /** Direct effect in jobs (or dollars if outputUsd is used). */
  directJobs: number;
  /** Direct output in USD (optional, drives output multiplier). */
  directOutputUsd?: number;
  /** NAICS sector key the multipliers are keyed on. */
  sector: string;
  /** Region the multipliers apply to (statewide or MSA). */
  region: "florida" | "miami" | "tampa" | "orlando" | "jacksonville";
};

export type SectorMultiplier = {
  sector: string;
  /** Type II employment multiplier (total jobs per direct job). */
  employment: number;
  /** Output multiplier (total output per direct output dollar). */
  output: number;
  /** Provenance: must say whether these are licensed IMPLAN or an illustrative stand-in. */
  provenance: "implan-weg-licensed" | "bea-rims2-illustrative" | "placeholder";
};

export type ImpactResult = {
  directJobs: number;
  indirectInducedJobs: number;
  totalJobs: number;
  totalOutputUsd?: number;
  multiplier: SectorMultiplier;
};

/**
 * PLACEHOLDER coefficients. These are NOT licensed IMPLAN values. They are round
 * stand-ins so the UI can render end-to-end. Replace wholesale with WEG's licensed
 * Florida multiplier table before anything ships to an executive.
 */
export const PLACEHOLDER_MULTIPLIERS: SectorMultiplier[] = [
  { sector: "manufacturing", employment: 2.4, output: 1.9, provenance: "placeholder" },
  { sector: "information", employment: 2.1, output: 1.8, provenance: "placeholder" },
  { sector: "professional_business", employment: 1.8, output: 1.6, provenance: "placeholder" },
  { sector: "construction", employment: 1.7, output: 1.7, provenance: "placeholder" },
];

export function computeImpact(input: ImpactInput, table: SectorMultiplier[]): ImpactResult | null {
  const multiplier = table.find((m) => m.sector === input.sector);
  if (!multiplier) {
    return null;
  }
  const totalJobs = Math.round(input.directJobs * multiplier.employment);
  const totalOutputUsd =
    input.directOutputUsd != null ? Math.round(input.directOutputUsd * multiplier.output) : undefined;
  return {
    directJobs: input.directJobs,
    indirectInducedJobs: totalJobs - input.directJobs,
    totalJobs,
    totalOutputUsd,
    multiplier,
  };
}
