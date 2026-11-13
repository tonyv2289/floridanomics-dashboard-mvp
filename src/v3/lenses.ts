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
    headline: "Florida's exports are at a record, and its ports are adding capacity.",
    summary:
      "Florida is the gateway to Latin America. Its exports are at a record, and its ports are adding capacity. The question for a logistics company is whether that capacity keeps up with the volume.",
    sectorIds: ["trade_transport_utilities", "manufacturing"],
    innovationIds: ["realGsp"],
    tradeHeroIds: ["totalExports", "manufacturedExports", "bilateralTrade", "selectFloridaFy"],
    clusterId: "latam-gateway",
    projectIds: [],
    watch: [
      "Trade, transportation, and utilities is Florida's largest private industry group. Its monthly job count shows where freight and warehouse demand is heading.",
      "Exports can keep growing only if the ports can handle the cargo. Watch the port expansion projects.",
    ],
  },
  {
    id: "construction",
    label: "Real Estate & Construction",
    line: "what is being built",
    headline: "Announced projects show up in construction first.",
    summary:
      "Aerospace plants, data centers, and port upgrades create construction work before they create permanent jobs. Construction employment is the first sign that an announced project is being built.",
    sectorIds: ["construction"],
    innovationIds: ["constructionEmployment", "realGsp"],
    tradeHeroIds: [],
    clusterId: "ai-power-readiness",
    projectIds: [
      "blue-origin-project-horizon",
      "amazon-leo-expansion",
      "aura-aero-daytona",
      "spacex-gigabay-starship",
      "williams-international-okaloosa",
    ],
    watch: [
      "If construction jobs fall for several months while projects keep being announced, the announcements are not turning into building.",
      "Power availability decides where large projects get built. The utility interconnection queue shows early whether Florida is in the running against Georgia and Texas.",
    ],
  },
  {
    id: "finance",
    label: "Finance & Investment",
    line: "capital and new companies",
    headline: "New residents and new companies are the customer base.",
    summary:
      "Three measures describe the market for financial firms: finance jobs, new business filings, and foreign direct investment. Together they show how much capital is arriving and how many new companies need services. They also show whether the wealth that moved here is being invested in Florida businesses.",
    sectorIds: ["financial_activities", "professional_business_services"],
    innovationIds: ["businessApplications", "realGsp"],
    tradeHeroIds: ["bilateralTrade"],
    clusterId: "talent-pipeline",
    projectIds: [],
    watch: [
      "New business applications are an early sign of demand for banking, legal, and advisory services.",
      "For investors, the question is how much of the income that moved here is invested in Florida companies.",
    ],
  },
  {
    id: "health",
    label: "Health & Life Sciences",
    line: "care demand and the clinical workforce",
    headline: "Demand for care is growing faster than the clinical workforce.",
    summary:
      "Education and health services is one of Florida's largest and steadiest sources of jobs, driven by population growth and the age of its residents. The limit on growth is the supply of clinical workers.",
    sectorIds: ["private_education_health_services"],
    innovationIds: ["professionalBusinessEmployment"],
    tradeHeroIds: [],
    clusterId: "talent-pipeline",
    projectIds: ["abbvie-durham-campus", "ucb-rowen-biologics"],
    watch: [
      "If health jobs grow more slowly than the population, care gets harder to find and clinical wages rise.",
      "Watch how many clinical graduates the universities produce against the number of openings.",
    ],
  },
  {
    id: "tech",
    label: "Tech & AI",
    line: "AI infrastructure, talent, and new companies",
    headline: "Florida starts companies at a high rate, and its place in AI infrastructure is still open.",
    summary:
      "New business filings and professional services jobs are strengths. Information-sector jobs and data center capacity are where Florida has yet to prove itself.",
    sectorIds: ["information", "professional_business_services"],
    innovationIds: ["informationEmployment", "businessApplications"],
    tradeHeroIds: [],
    clusterId: "ai-power-readiness",
    projectIds: [
      "blue-origin-project-horizon",
      "amazon-leo-processing",
      "spacex-gigabay-starship",
      "boeing-embry-riddle-center",
    ],
    watch: [
      "New business filings are strong. Information-sector jobs show whether those companies grow here. If filings rise and those jobs do not, startups are not scaling in Florida.",
      "AI infrastructure investment in Texas and Georgia is the comparison to watch. It will shape where the next decade's high-wage tech jobs go.",
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
