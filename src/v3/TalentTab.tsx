import { useMemo, type CSSProperties } from "react";
import clsx from "clsx";
import type { DashboardDataset, TalentCluster, TerminalProject } from "../types/dashboard";
import { formatProjectJobs, formatProjectStage } from "./project-ledger";
import {
  filterTalentClusters,
  getTalentCoverage,
  getTalentCoverageBand,
  summarizeTalentMatch,
  type TalentFocus,
  type TalentSort,
} from "./talent-match";
import { Frame, SourceList } from "./primitives";

const FOCUS_OPTIONS: Array<{ id: TalentFocus; label: string }> = [
  { id: "all", label: "All pathways" },
  { id: "under-50", label: "Under 50%" },
  { id: "fast-growth", label: "20%+ growth" },
  { id: "project-linked", label: "Project-linked" },
];

const SORT_OPTIONS: Array<{ id: TalentSort; label: string }> = [
  { id: "coverage", label: "Coverage proxy" },
  { id: "openings", label: "Annual openings" },
  { id: "growth", label: "Projected growth" },
  { id: "wage", label: "First-year wage" },
];

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatCurrency(value: number | null): string {
  if (value === null) return "Not disclosed";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCoverage(cluster: TalentCluster): string {
  return `${Math.round(getTalentCoverage(cluster) * 100)}%`;
}

function formatProjectTiming(project: TerminalProject): string {
  if (project.stage === "operational") return project.stageDetail;
  if (project.expectedOperationalDate) return `Expected ${project.expectedOperationalDate.slice(0, 4)}`;
  return project.stageDetail;
}

function coverageLabel(cluster: TalentCluster): string {
  return {
    thin: "Thin visible pipeline",
    watch: "Watch",
    broad: "Broad visible pipeline",
  }[getTalentCoverageBand(cluster)];
}

function TalentHero({ dataset }: { dataset: DashboardDataset }) {
  const summary = summarizeTalentMatch(dataset.talent);

  return (
    <Frame label="Talent Match">
      <div className="v3-talent-hero">
        <div>
          <h2>{dataset.talent.headline}</h2>
          <p>{dataset.talent.summary}</p>
        </div>
        <dl className="v3-talent-scoreboard">
          <div>
            <dt>Pathways</dt>
            <dd>{dataset.talent.clusters.length}</dd>
          </div>
          <div>
            <dt>Annual openings</dt>
            <dd>{formatNumber(summary.totalAnnualOpenings)}</dd>
          </div>
          <div>
            <dt>Covered graduates</dt>
            <dd>{formatNumber(summary.coveredGraduates)}</dd>
          </div>
          <div>
            <dt>Avg. first-year wage</dt>
            <dd>{formatCurrency(summary.weightedAverageWage)}</dd>
          </div>
        </dl>
      </div>
      <p className="v3-talent-caveat">
        <strong>Read this as a coverage proxy.</strong> {dataset.talent.coverageNote}
      </p>
    </Frame>
  );
}

function PathwayMatrix({
  clusters,
  selectedClusterId,
  onSelectCluster,
}: {
  clusters: TalentCluster[];
  selectedClusterId: string;
  onSelectCluster: (clusterId: string) => void;
}) {
  return (
    <div className="v3-talent-matrix">
      <div className="v3-talent-matrix-head" aria-hidden="true">
        <span>Pathway</span>
        <span>Annual openings</span>
        <span>Covered grads</span>
        <span>Coverage proxy</span>
        <span>Growth / wage</span>
      </div>
      {clusters.map((cluster) => {
        const coverage = getTalentCoverage(cluster);
        const band = getTalentCoverageBand(cluster);

        return (
          <button
            key={cluster.id}
            type="button"
            aria-pressed={selectedClusterId === cluster.id}
            className={clsx("v3-talent-row", selectedClusterId === cluster.id && "is-active")}
            onClick={() => onSelectCluster(cluster.id)}
          >
            <span className="v3-talent-pathway" data-label="Pathway">
              <strong>{cluster.label}</strong>
              <small>{cluster.demand.occupation}</small>
            </span>
            <span className="v3-talent-value" data-label="Annual openings">
              <strong>{formatNumber(cluster.demand.annualOpenings)}</strong>
              <small>2022-32 projection</small>
            </span>
            <span className="v3-talent-value" data-label="Covered grads">
              <strong>{formatNumber(cluster.pipeline.graduates)}</strong>
              <small>{cluster.pipeline.academicYear}</small>
            </span>
            <span className="v3-talent-coverage" data-label="Coverage proxy">
              <span>
                <strong>{formatCoverage(cluster)}</strong>
                <small className={`is-${band}`}>{coverageLabel(cluster)}</small>
              </span>
              <i aria-hidden="true">
                <b
                  style={
                    {
                      "--v3-talent-coverage": `${Math.min(coverage, 1) * 100}%`,
                    } as CSSProperties
                  }
                />
              </i>
            </span>
            <span className="v3-talent-value" data-label="Growth / wage">
              <strong>+{cluster.demand.growthPercent}%</strong>
              <small>{formatCurrency(cluster.pipeline.averageAnnualWageUsd)}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SelectedPathway({ dataset, cluster }: { dataset: DashboardDataset; cluster: TalentCluster }) {
  const sourceById = new Map(dataset.talent.sources.map((source) => [source.id, source]));
  const sources = cluster.sourceIds.flatMap((sourceId) => {
    const source = sourceById.get(sourceId);
    return source ? [{ label: source.label, url: source.url }] : [];
  });
  const projects = dataset.terminal.projectLedger.projects
    .filter((project) => cluster.projectIds.includes(project.id))
    .sort((a, b) => b.announcedDate.localeCompare(a.announcedDate));

  return (
    <Frame label="Selected pathway">
      <div className="v3-talent-detail-head">
        <div>
          <span>{cluster.shortLabel}</span>
          <h2>{cluster.question}</h2>
          <p>{cluster.read}</p>
        </div>
        <div className={`v3-talent-band is-${getTalentCoverageBand(cluster)}`}>
          <strong>{formatCoverage(cluster)}</strong>
          <span>coverage proxy</span>
          <small>{coverageLabel(cluster)}</small>
        </div>
      </div>

      <div className="v3-talent-signal-grid">
        <section>
          <span>Demand signal</span>
          <h3>{cluster.demand.occupation}</h3>
          <dl>
            <div>
              <dt>Annual openings</dt>
              <dd>{formatNumber(cluster.demand.annualOpenings)}</dd>
            </div>
            <div>
              <dt>Projected growth</dt>
              <dd>+{cluster.demand.growthPercent}%</dd>
            </div>
            <div>
              <dt>{cluster.demand.baseYear} employment</dt>
              <dd>{formatNumber(cluster.demand.baseEmployment)}</dd>
            </div>
            <div>
              <dt>{cluster.demand.projectedYear} employment</dt>
              <dd>{formatNumber(cluster.demand.projectedEmployment)}</dd>
            </div>
          </dl>
          <small>SOC {cluster.demand.soc}</small>
        </section>

        <section>
          <span>Covered degree pipeline</span>
          <h3>{cluster.pipeline.program}</h3>
          <dl>
            <div>
              <dt>Graduates</dt>
              <dd>{formatNumber(cluster.pipeline.graduates)}</dd>
            </div>
            <div>
              <dt>Employed in Florida</dt>
              <dd>{cluster.pipeline.employedPercent}%</dd>
            </div>
            <div>
              <dt>Full-time in Florida</dt>
              <dd>{cluster.pipeline.fullTimePercent}%</dd>
            </div>
            <div>
              <dt>Average annual wage</dt>
              <dd>{formatCurrency(cluster.pipeline.averageAnnualWageUsd)}</dd>
            </div>
          </dl>
          <small>CIP {cluster.pipeline.cip} | {cluster.pipeline.academicYear}</small>
        </section>
      </div>

      <section className="v3-talent-institutions">
        <div className="v3-talent-section-head">
          <div>
            <span>Institution leaders</span>
            <h3>Largest disclosed producers in the covered program</h3>
          </div>
          <small>Florida public universities | {cluster.pipeline.academicYear}</small>
        </div>
        <div className="v3-talent-institution-list">
          {cluster.institutions.map((institution, index) => (
            <article key={institution.name}>
              <b>{index + 1}</b>
              <div>
                <strong>{institution.name}</strong>
                <span>{institution.region}</span>
              </div>
              <dl>
                <div>
                  <dt>Graduates</dt>
                  <dd>{formatNumber(institution.graduates)}</dd>
                </div>
                <div>
                  <dt>Full-time</dt>
                  <dd>{institution.fullTimePercent === null ? "n/a" : `${institution.fullTimePercent}%`}</dd>
                </div>
                <div>
                  <dt>Wage</dt>
                  <dd>{formatCurrency(institution.averageAnnualWageUsd)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="v3-talent-projects">
        <div className="v3-talent-section-head">
          <div>
            <span>Project pressure</span>
            <h3>{projects.length > 0 ? "Named projects already testing the pathway" : "No named project link yet"}</h3>
          </div>
          <small>{projects.length} linked ledger {projects.length === 1 ? "record" : "records"}</small>
        </div>
        {projects.length > 0 ? (
          <div className="v3-talent-project-list">
            {projects.map((project) => (
              <article key={project.id}>
                <div>
                  <strong>{project.company}</strong>
                  <span>{project.project}</span>
                </div>
                <div>
                  <b>{formatProjectStage(project.stage)}</b>
                  <span>{project.geography}</span>
                </div>
                <div>
                  <b>{formatProjectJobs(project)} jobs</b>
                  <span>{formatProjectTiming(project)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="v3-talent-empty">
            The Floridanomics capex ledger does not yet contain a named project tied to this pathway. Demand and
            degree outcomes remain the operating signals.
          </p>
        )}
      </section>

      <div className="v3-talent-evidence">
        <SourceList sources={sources} />
        <section className="v3-talent-method" id="talent-methodology" aria-labelledby="talent-methodology-title">
          <h3 id="talent-methodology-title">Method and limits</h3>
          <ol>
            {dataset.talent.methodology.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </div>
    </Frame>
  );
}

export function TalentTab({
  dataset,
  selectedClusterId,
  onSelectCluster,
  focus,
  onFocusChange,
  sort,
  onSortChange,
}: {
  dataset: DashboardDataset;
  selectedClusterId: string;
  onSelectCluster: (clusterId: string) => void;
  focus: TalentFocus;
  onFocusChange: (focus: TalentFocus) => void;
  sort: TalentSort;
  onSortChange: (sort: TalentSort) => void;
}) {
  const clusters = useMemo(
    () => filterTalentClusters(dataset.talent.clusters, focus, sort),
    [dataset.talent.clusters, focus, sort],
  );
  const selectedCluster =
    clusters.find((cluster) => cluster.id === selectedClusterId) ?? clusters[0] ?? dataset.talent.clusters[0];

  return (
    <>
      <TalentHero dataset={dataset} />
      <Frame label="Pathway matrix">
        <div className="v3-panel-head">
          <div>
            <h2>Where is the visible pipeline thinnest?</h2>
            <p>Compare representative occupations with their closest covered bachelor's programs.</p>
          </div>
          <span className="v3-talent-result-count">
            {clusters.length} of {dataset.talent.clusters.length} pathways
          </span>
        </div>
        <div className="v3-talent-controls">
          <div className="v3-talent-segments" aria-label="Filter pathways">
            {FOCUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={focus === option.id}
                className={focus === option.id ? "is-active" : undefined}
                onClick={() => onFocusChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="v3-talent-sort">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as TalentSort)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="v3-talent-legend">
          <span>
            Coverage tiers: <b>Thin</b> under 25% | <b>Watch</b> 25-74% | <b>Broad</b> 75%+
          </span>
          <a href="#talent-methodology">Method and limits</a>
        </div>
        <PathwayMatrix
          clusters={clusters}
          selectedClusterId={selectedCluster.id}
          onSelectCluster={onSelectCluster}
        />
      </Frame>
      <SelectedPathway dataset={dataset} cluster={selectedCluster} />
    </>
  );
}
