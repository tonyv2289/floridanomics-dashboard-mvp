import type { ProjectStage, TerminalProject } from "../types/dashboard";

export type ProjectGeographyFilter = "all" | "florida" | "peers";
export type ProjectStageFilter = "all" | "pipeline" | "converted";
export type ProjectSort = "capex" | "newest" | "jobs";

export type ProjectLedgerFilters = {
  geography: ProjectGeographyFilter;
  stage: ProjectStageFilter;
  sector: string;
  query: string;
  sort: ProjectSort;
};

const CONVERTED_STAGES = new Set<ProjectStage>(["under_construction", "operational"]);

export function isConvertedProject(project: TerminalProject): boolean {
  return CONVERTED_STAGES.has(project.stage);
}

export function filterCapexProjects(
  projects: TerminalProject[],
  filters: ProjectLedgerFilters,
): TerminalProject[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return projects
    .filter((project) => {
      if (filters.geography === "florida" && !project.isFlorida) return false;
      if (filters.geography === "peers" && project.isFlorida) return false;
      if (filters.stage === "pipeline" && isConvertedProject(project)) return false;
      if (filters.stage === "converted" && !isConvertedProject(project)) return false;
      if (filters.sector !== "all" && project.sector !== filters.sector) return false;
      if (
        query &&
        ![project.company, project.project, project.state, project.geography, project.sector]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "newest") return b.announcedDate.localeCompare(a.announcedDate);
      if (filters.sort === "jobs") return (b.jobsAnnounced ?? -1) - (a.jobsAnnounced ?? -1);
      return (b.capexUsdMillions ?? -1) - (a.capexUsdMillions ?? -1);
    });
}

export function summarizeCapexProjects(projects: TerminalProject[]) {
  const disclosed = projects.filter((project) => project.capexUsdMillions !== null);
  const florida = disclosed.filter((project) => project.isFlorida);
  const peers = disclosed.filter((project) => !project.isFlorida);
  const sumCapex = (items: TerminalProject[]) =>
    items.reduce((sum, project) => sum + (project.capexUsdMillions ?? 0), 0);
  const announcedJobs = projects.reduce(
    (sum, project) =>
      project.jobsQualifier === "exact" || project.jobsQualifier === "minimum"
        ? sum + (project.jobsAnnounced ?? 0)
        : sum,
    0,
  );
  const disclosedCapex = sumCapex(disclosed);
  const convertedCapex = sumCapex(disclosed.filter(isConvertedProject));
  const floridaCapex = sumCapex(florida);
  const peerCapex = sumCapex(peers);

  return {
    projectCount: projects.length,
    disclosedProjectCount: disclosed.length,
    disclosedCapex,
    convertedCapex,
    convertedShare: disclosedCapex > 0 ? convertedCapex / disclosedCapex : 0,
    floridaCapex,
    peerCapex,
    floridaGap: Math.max(0, peerCapex - floridaCapex),
    announcedJobs,
    wageDisclosureCount: projects.filter((project) => project.averageWageUsd !== null).length,
  };
}

export function formatCapexMillions(value: number | null, qualifier: TerminalProject["amountQualifier"] = "exact") {
  if (value === null) return "Undisclosed";
  const formatted =
    value >= 1000
      ? `$${(value / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`
      : `$${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  return qualifier === "minimum" ? `${formatted}+` : formatted;
}

export function formatProjectJobs(project: TerminalProject) {
  if (project.jobsAnnounced === null) return "Undisclosed";
  const jobs = project.jobsAnnounced.toLocaleString("en-US");
  if (project.jobsQualifier === "supports") return `Supports ${jobs}`;
  return project.jobsQualifier === "minimum" ? `${jobs}+` : jobs;
}

export function formatProjectStage(stage: ProjectStage) {
  return {
    announced: "Announced",
    site_selected: "Site selected",
    under_construction: "Under construction",
    operational: "Operating",
  }[stage];
}
