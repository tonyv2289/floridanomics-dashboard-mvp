import { useMemo, useState } from "react";
import clsx from "clsx";
import type { DashboardDataset } from "../types/dashboard";
import { Frame, TerminalSourceList } from "./primitives";
import {
  filterCapexProjects,
  formatCapexMillions,
  formatProjectJobs,
  formatProjectStage,
  summarizeCapexProjects,
  type ProjectGeographyFilter,
  type ProjectSort,
  type ProjectStageFilter,
} from "./project-ledger";

function LedgerMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="v3-capex-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ProjectRows({ dataset, projectIds }: { dataset: DashboardDataset; projectIds: string[] }) {
  const projectMap = new Map(dataset.terminal.projectLedger.projects.map((project) => [project.id, project]));
  const projects = projectIds.flatMap((id) => {
    const project = projectMap.get(id);
    return project ? [project] : [];
  });

  return (
    <div className="v3-capex-rows">
      <div className="v3-capex-row v3-capex-row-head" aria-hidden="true">
        <span>Project</span>
        <span>Capital</span>
        <span>Jobs</span>
        <span>Stage</span>
      </div>
      {projects.map((project) => (
        <article key={project.id} className="v3-capex-row">
          <div className="v3-capex-project">
            <div>
              <span className={clsx("v3-capex-state", project.isFlorida && "is-florida")}>{project.stateId}</span>
              <small>{project.geography}</small>
            </div>
            <h3>{project.company}</h3>
            <p>{project.project}</p>
            <span className="v3-capex-sector">{project.sector}</span>
          </div>
          <div className="v3-capex-cell" data-label="Capital">
            <strong>{formatCapexMillions(project.capexUsdMillions, project.amountQualifier)}</strong>
            <small>{project.facilityScale ?? "Facility scale undisclosed"}</small>
          </div>
          <div className="v3-capex-cell" data-label="Jobs">
            <strong>{formatProjectJobs(project)}</strong>
            <small>
              {project.averageWageUsd === null
                ? "Wage undisclosed"
                : `${project.averageWageUsd.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })} average`}
            </small>
          </div>
          <div className="v3-capex-cell v3-capex-stage-cell" data-label="Stage">
            <b className={clsx("v3-capex-stage", `is-${project.stage}`)}>{formatProjectStage(project.stage)}</b>
            <small>{new Date(`${project.announcedDate}T00:00:00Z`).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}</small>
          </div>
          <details className="v3-capex-detail">
            <summary>Decision read</summary>
            <div>
              <p>{project.strategicRead}</p>
              <dl>
                <div>
                  <dt>Delivery</dt>
                  <dd>{project.stageDetail}</dd>
                </div>
                <div>
                  <dt>Expected operation</dt>
                  <dd>
                    {project.expectedOperationalDate === null
                      ? "Not disclosed"
                      : new Date(`${project.expectedOperationalDate}T00:00:00Z`).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                  </dd>
                </div>
                <div>
                  <dt>Last verified</dt>
                  <dd>{project.lastVerifiedDate}</dd>
                </div>
              </dl>
              <TerminalSourceList dataset={dataset} sourceIds={project.sourceIds} />
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}

export function ProjectCapexLedger({ dataset, compact = false }: { dataset: DashboardDataset; compact?: boolean }) {
  const ledger = dataset.terminal.projectLedger;
  const summary = useMemo(() => summarizeCapexProjects(ledger.projects), [ledger.projects]);
  const [geography, setGeography] = useState<ProjectGeographyFilter>("all");
  const [stage, setStage] = useState<ProjectStageFilter>("all");
  const [sector, setSector] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProjectSort>("capex");
  const sectors = useMemo(
    () => [...new Set(ledger.projects.map((project) => project.sector))].sort(),
    [ledger.projects],
  );
  const visibleProjects = useMemo(
    () => filterCapexProjects(ledger.projects, { geography, stage, sector, query, sort }),
    [geography, ledger.projects, query, sector, sort, stage],
  );
  const compactProjects = useMemo(
    () =>
      filterCapexProjects(ledger.projects, {
        geography: "all",
        stage: "all",
        sector: "all",
        query: "",
        sort: "capex",
      }).slice(0, 6),
    [ledger.projects],
  );

  return (
    <Frame label="Project capex ledger">
      <div className="v3-panel-head v3-capex-head">
        <div>
          <h2>{ledger.headline}</h2>
          <p>{ledger.summary}</p>
        </div>
        <div className="v3-panel-number">
          <strong>{ledger.projects.length}</strong>
          <span>verified projects</span>
        </div>
      </div>

      <div className="v3-capex-scoreboard">
        <LedgerMetric
          label="Florida disclosed"
          value={formatCapexMillions(summary.floridaCapex)}
          note={`${ledger.projects.filter((project) => project.isFlorida).length} named projects`}
        />
        <LedgerMetric
          label="Florida converted"
          value={`${Math.round(summary.floridaConvertedShare * 100)}%`}
          note={`${formatCapexMillions(summary.floridaConvertedCapex)} building or operating`}
        />
        <LedgerMetric
          label="Largest peer project"
          value={formatCapexMillions(
            summary.largestPeerProject?.capexUsdMillions ?? null,
            summary.largestPeerProject?.amountQualifier,
          )}
          note={
            summary.largestPeerProject
              ? `${summary.largestPeerProject.company} | ${summary.largestPeerProject.state}`
              : "No disclosed peer project"
          }
        />
        <LedgerMetric
          label="Florida direct jobs"
          value={summary.floridaAnnouncedJobs.toLocaleString("en-US")}
          note={`Wages disclosed for ${summary.floridaWageDisclosureCount} Florida ${summary.floridaWageDisclosureCount === 1 ? "project" : "projects"}`}
        />
      </div>

      <p className="v3-capex-coverage">{ledger.coverageNote}</p>

      {compact ? (
        <ProjectRows dataset={dataset} projectIds={compactProjects.map((project) => project.id)} />
      ) : (
        <>
          <div className="v3-capex-controls">
            <fieldset>
              <legend>Geography</legend>
              <div className="v3-capex-segments">
                {([
                  ["all", "All"],
                  ["florida", "Florida"],
                  ["peers", "Peers"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(geography === value && "is-active")}
                    onClick={() => setGeography(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Delivery</legend>
              <div className="v3-capex-segments">
                {([
                  ["all", "All"],
                  ["pipeline", "Pipeline"],
                  ["converted", "Converted"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(stage === value && "is-active")}
                    onClick={() => setStage(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              <span>Sector</span>
              <select value={sector} onChange={(event) => setSector(event.target.value)}>
                <option value="all">All sectors</option>
                {sectors.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as ProjectSort)}>
                <option value="capex">Largest capital</option>
                <option value="newest">Newest announcement</option>
                <option value="jobs">Most jobs</option>
              </select>
            </label>
            <label className="v3-capex-search">
              <span>Search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Company, place, sector"
              />
            </label>
          </div>

          <div className="v3-capex-results-head">
            <strong>{visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}</strong>
            <span>{visibleProjects.filter((project) => project.capexUsdMillions === null).length} with undisclosed capital</span>
          </div>
          {visibleProjects.length > 0 ? (
            <ProjectRows dataset={dataset} projectIds={visibleProjects.map((project) => project.id)} />
          ) : (
            <div className="v3-capex-empty">No projects match the current filters.</div>
          )}

          <div className="v3-capex-context">
            {ledger.context.map((item) => (
              <article key={item.id}>
                <span>{item.label}</span>
                <strong>{item.headline}</strong>
                <p>{item.treatment}</p>
                <TerminalSourceList dataset={dataset} sourceIds={item.sourceIds} />
              </article>
            ))}
          </div>

          <details className="v3-capex-method">
            <summary>Ledger methodology</summary>
            <ol>
              {ledger.methodology.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </details>
        </>
      )}
    </Frame>
  );
}
