import { startTransition } from "react";
import clsx from "clsx";
import {
  deltaTone,
  formatCompact,
  formatDelta,
  formatMetricValue,
  formatTradeHero,
  type AnyMetric,
} from "../lib/dashboard";
import { Frame, SourceList, TerminalSourceList } from "./primitives";
import { LENSES, getLens, type LensId } from "./lenses";
import type { DashboardDataset } from "../types/dashboard";

function LensMenu({ activeLens, onChange }: { activeLens: LensId; onChange: (lens: LensId) => void }) {
  return (
    <nav className="v3-competition-menu" aria-label="Industry lenses">
      <div>
        <span>Industry lenses</span>
        <strong>The same data, read for your business.</strong>
      </div>
      <div>
        {LENSES.map((lens) => (
          <button
            key={lens.id}
            type="button"
            className={clsx("v3-competition-menu-button", activeLens === lens.id && "is-active")}
            onClick={() => startTransition(() => onChange(lens.id))}
          >
            <span>{lens.label}</span>
            <small>{lens.line}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

function sectorAsMetric(label: string): AnyMetric {
  return { label, unit: "thousands_jobs", trendDirection: "up_good" } as AnyMetric;
}

export function LensTab({
  dataset,
  activeLens,
  onSelectLens,
}: {
  dataset: DashboardDataset;
  activeLens: LensId;
  onSelectLens: (lens: LensId) => void;
}) {
  const lens = getLens(activeLens);
  const sectors = dataset.industry.sectors.filter((sector) => lens.sectorIds.includes(sector.id));
  const innovationMetrics = lens.innovationIds.map((id) => dataset.innovation.metrics[id]).filter(Boolean);
  const tradeMetrics = dataset.trade.heroMetrics.filter((metric) => lens.tradeHeroIds.includes(metric.id));
  const projects = dataset.terminal.projectLedger.filter((project) => lens.projectIds.includes(project.id));
  const cluster = lens.clusterId
    ? dataset.strategy.clusters.find((candidate) => candidate.id === lens.clusterId)
    : undefined;

  return (
    <>
      <LensMenu activeLens={activeLens} onChange={onSelectLens} />

      <Frame label={lens.label}>
        <div className="v3-panel-head">
          <div>
            <h2>{lens.headline}</h2>
            <p>{lens.summary}</p>
          </div>
        </div>

        <div className="v3-stat-grid">
          {sectors.map((sector) => (
            <article key={sector.id} className="v3-stat-card">
              <span>{sector.label}</span>
              <strong>{formatCompact(sector.latest.value * 1000, 1)}</strong>
              <p
                className={clsx(
                  `tone-${deltaTone(sectorAsMetric(sector.label), sector.deltas.oneYear)}`,
                )}
              >
                1Y {formatDelta(sectorAsMetric(sector.label), sector.deltas.oneYear)}
              </p>
            </article>
          ))}
          {innovationMetrics.map((metric) => (
            <article key={metric.id} className="v3-stat-card">
              <span>{metric.label}</span>
              <strong>{formatMetricValue(metric, metric.latest.value)}</strong>
              <p className={clsx(`tone-${deltaTone(metric, metric.deltas.oneYear)}`)}>
                1Y {formatDelta(metric, metric.deltas.oneYear)}
              </p>
            </article>
          ))}
          {tradeMetrics.map((metric) => (
            <article key={metric.id} className="v3-stat-card">
              <span>{metric.label}</span>
              <strong>{formatTradeHero(metric.value, metric.unit)}</strong>
              <p>{metric.helper}</p>
            </article>
          ))}
        </div>
      </Frame>

      {projects.length > 0 ? (
        <Frame label="Projects that touch this lens">
          <div className="v3-project-ledger">
            {projects.map((project) => (
              <article key={project.id} className="v3-project-card">
                <div>
                  <span>{project.geography}</span>
                  <b>{project.stage}</b>
                </div>
                <h3>{project.name}</h3>
                <div className="v3-project-meta">
                  <p>
                    <span>Sector</span>
                    {project.sector}
                  </p>
                  <p>
                    <span>Capex / capacity</span>
                    {project.capex}
                  </p>
                  <p>
                    <span>Jobs</span>
                    {project.jobs}
                  </p>
                </div>
                <p>{project.strategicRead}</p>
                <TerminalSourceList dataset={dataset} sourceIds={project.sourceIds} />
              </article>
            ))}
          </div>
        </Frame>
      ) : null}

      {cluster ? (
        <Frame label="The cluster thesis">
          <div className="v3-cluster-grid">
            <article className="v3-cluster-card">
              <h3>{cluster.title}</h3>
              <p>{cluster.thesis}</p>
              <dl>
                <div>
                  <dt>Bottleneck</dt>
                  <dd>{cluster.bottleneck}</dd>
                </div>
                <div>
                  <dt>Proof</dt>
                  <dd>{cluster.proof}</dd>
                </div>
                <div>
                  <dt>Track next</dt>
                  <dd>{cluster.whatToTrack}</dd>
                </div>
              </dl>
              <SourceList sources={cluster.sources} />
            </article>
          </div>
        </Frame>
      ) : null}

      <div className="v3-two-up">
        <Frame label="Local labor conditions">
          <div className="v3-table">
            {dataset.metros.map((metro) => (
              <div key={metro.id} className="v3-table-row is-static">
                <span>{metro.name}</span>
                <strong>{metro.unemploymentRate.latest.value.toFixed(1)}%</strong>
                <small>{formatCompact(metro.laborForce.latest.value, 1)} labor force</small>
              </div>
            ))}
          </div>
        </Frame>

        <Frame label="What to watch">
          <ol className="v3-lesson-list">
            {lens.watch.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </Frame>
      </div>
    </>
  );
}
