import type { InnovationMetricId } from "../types/dashboard";

export type LensId = "logistics" | "construction" | "finance" | "health" | "tech";

export type LensDefinition = {
  id: LensId;
  label: string;
  line: string;
  headline: string;
  summary: string;
  sectorIds: string[];
  innovationIds: InnovationMetricId[];
  tradeHeroIds: string[];
  clusterId: string | null;
  projectIds: string[];
  watch: string[];
};

export const LENSES: LensDefinition[] = [
  {
    id: "logistics",
    label: "Logistics & Trade",
    line: "ports, freight, LATAM gateway",
    headline: "The gateway economy is running at record volume.",
    summary:
      "Florida's trade machine sits at the intersection of record export value, growing port capacity, and the LATAM gateway position. The operating question for a logistics business is whether capacity is keeping pace with the volume.",
    sectorIds: ["trade_transport_utilities", "manufacturing"],
    innovationIds: ["realGsp"],
    tradeHeroIds: ["totalExports", "manufacturedExports", "bilateralTrade", "selectFloridaFy"],
    clusterId: "latam-gateway",
    projectIds: ["portmiami-gateway", "port-everglades-cold-chain"],
    watch: [
      "Trade, transportation, and utilities is Florida's largest private supersector; its monthly trend is the demand signal for freight and warehousing.",
      "Port capacity projects determine whether the export record extends; the gateway thesis depends on infrastructure absorbing the growth.",
    ],
  },
  {
    id: "construction",
    label: "Real Estate & Construction",
    line: "the build-out order book",
    headline: "The capex cycle is the construction order book.",
    summary:
      "Aerospace expansions, data-center proposals, and port upgrades all land as construction demand before they land as operating jobs. Construction employment is the proxy for whether the announced build-out is real.",
    sectorIds: ["construction"],
    innovationIds: ["constructionEmployment", "realGsp"],
    tradeHeroIds: [],
    clusterId: "ai-power-readiness",
    projectIds: ["blue-origin-cape", "ai-compute-gap"],
    watch: [
      "Construction payrolls lead the capex story; a sustained decline while projects are announced means announcements are not converting.",
      "Power readiness decides which large projects break ground in Florida instead of Georgia or Texas; the interconnection queue is the early signal.",
    ],
  },
  {
    id: "finance",
    label: "Finance & Investment",
    line: "capital flows and the deal environment",
    headline: "The capital migration is the customer base.",
    summary:
      "Financial activities employment, business formation, and the FDI position describe the deal environment: how much capital is arriving, how many new entities need services, and whether the wealth migration is converting into productive investment.",
    sectorIds: ["financial_activities", "professional_business_services"],
    innovationIds: ["businessApplications", "realGsp"],
    tradeHeroIds: ["bilateralTrade"],
    clusterId: "talent-pipeline",
    projectIds: ["ai-compute-gap"],
    watch: [
      "Business applications are the leading indicator of future demand for banking, legal, and advisory services.",
      "The question for allocators is whether Florida converts income migration into capital formation, not whether the migration is happening.",
    ],
  },
  {
    id: "health",
    label: "Health & Life Sciences",
    line: "care demand and the clinical workforce",
    headline: "Care demand is compounding faster than the workforce.",
    summary:
      "Private education and health services is one of Florida's largest and steadiest employment bases, pushed by population growth and demographics. The binding constraint is clinical labor supply, not patient demand.",
    sectorIds: ["private_education_health_services"],
    innovationIds: ["professionalBusinessEmployment"],
    tradeHeroIds: [],
    clusterId: "talent-pipeline",
    projectIds: [],
    watch: [
      "Health employment growth that lags population growth signals a widening care gap and rising wage pressure for clinical roles.",
      "Credential output from the university system is the supply-side number to watch against the demand curve.",
    ],
  },
  {
    id: "tech",
    label: "Tech & AI",
    line: "compute, talent, formation",
    headline: "Formation is strong; the compute layer is the open question.",
    summary:
      "Business formation and professional services depth are genuine strengths. Information-sector employment and the strategic compute position are where Florida's tech story is still being decided.",
    sectorIds: ["information", "professional_business_services"],
    innovationIds: ["informationEmployment", "businessApplications"],
    tradeHeroIds: [],
    clusterId: "ai-power-readiness",
    projectIds: ["ai-compute-gap", "space-florida-pipeline", "blue-origin-cape"],
    watch: [
      "Information-sector jobs are the truth serum for the tech narrative; formation without information-sector growth means startups are not scaling in state.",
      "The AI capex scoreboard against Texas and Georgia decides whether the next decade's high-wage tech jobs land here.",
    ],
  },
];

export const LENS_IDS = LENSES.map((lens) => lens.id);

export function isLensId(value: string | null): value is LensId {
  return value !== null && (LENS_IDS as string[]).includes(value);
}

export function getLens(id: LensId): LensDefinition {
  const lens = LENSES.find((candidate) => candidate.id === id);
  if (!lens) {
    throw new Error(`Unknown lens: ${id}`);
  }
  return lens;
}
