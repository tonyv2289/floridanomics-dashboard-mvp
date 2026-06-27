import { startTransition, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import {
  CORE_METRIC_IDS,
  type AnyMetric,
  type CoreMetricId,
  deltaTone,
  formatCompact,
  formatDelta,
  formatMetricValue,
} from "../lib/dashboard";
import { TAB_OPTIONS, type V3TabId } from "./constants";
import type { DashboardDataset, InsightSection } from "../types/dashboard";

export function SourceAnchor({ source }: { source?: { label: string; url: string } }) {
  if (!source) {
    return null;
  }

  return (
    <a className="v3-source-link" href={source.url} target="_blank" rel="noreferrer">
      source
    </a>
  );
}

export function SourceList({ sources }: { sources: Array<{ label: string; url: string }> }) {
  return (
    <div className="v3-source-pills">
      {sources.map((source) => (
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ))}
    </div>
  );
}

export function TerminalSourceList({ dataset, sourceIds }: { dataset: DashboardDataset; sourceIds: string[] }) {
  const sourceById = new Map(dataset.terminal.sources.map((source) => [source.id, source]));

  return (
    <div className="v3-terminal-source-list">
      {sourceIds.map((sourceId) => {
        const source = sourceById.get(sourceId);
        if (!source) {
          return null;
        }

        return (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <span>{source.tier}</span>
            {source.label}
          </a>
        );
      })}
    </div>
  );
}

export function CompetitionSourceList({ dataset, sourceIds }: { dataset: DashboardDataset; sourceIds: string[] }) {
  const sourceById = new Map(dataset.competition.sources.map((source) => [source.id, source]));

  return (
    <div className="v3-competition-source-list">
      {sourceIds.map((sourceId) => {
        const source = sourceById.get(sourceId);
        if (!source) {
          return null;
        }

        const content = (
          <>
            <b>{source.kind}</b>
            <i>{source.label}</i>
          </>
        );

        return source.url ? (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          <span key={source.id} title={source.macStudioPath}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function Frame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section className="v3-frame">
      {label ? <p className="v3-kicker">{label}</p> : null}
      {children}
    </section>
  );
}

export function TabNav({ activeTab, onChange }: { activeTab: V3TabId; onChange: (tab: V3TabId) => void }) {
  return (
    <nav
      className="v3-tabs"
      aria-label="Floridanomics views"
      style={{ "--v3-tab-count": TAB_OPTIONS.length } as CSSProperties}
    >
      {TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={activeTab === tab.id ? "true" : undefined}
          className={clsx("v3-tab", activeTab === tab.id && "is-active")}
          onClick={() => startTransition(() => onChange(tab.id))}
        >
          <span>{tab.label}</span>
          <small>{tab.line}</small>
        </button>
      ))}
    </nav>
  );
}

export function EvidenceGrid({ dataset }: { dataset: DashboardDataset }) {
  const sections = [
    dataset.scorecard2030,
    dataset.distinctives.snowbirdIndex,
    dataset.distinctives.spaceCoastCadence,
    dataset.distinctives.latamGateway,
  ];

  return (
    <section className="v3-evidence-grid">
      {sections.map((section) => (
        <article key={section.eyebrow} className="v3-evidence-card">
          <p className="v3-kicker">{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <p>{section.summary}</p>
          <div className="v3-stat-row">
            {section.stats.slice(0, 3).map((stat) => (
              <div key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <SourceAnchor source={stat.source} />
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

export function MetricTable({
  dataset,
  selectedMetricId,
  onSelect,
}: {
  dataset: DashboardDataset;
  selectedMetricId: CoreMetricId;
  onSelect: (metricId: CoreMetricId) => void;
}) {
  return (
    <Frame label="Scorecard">
      <div className="v3-panel-head">
        <div>
          <h2>Five numbers, one labor-market read.</h2>
          <p>Each row is selectable and drives the chart above.</p>
        </div>
      </div>

      <div className="v3-table">
        {CORE_METRIC_IDS.map((metricId) => {
          const metric = dataset.metrics[metricId];
          return (
            <button
              key={metric.id}
              type="button"
              className={clsx("v3-table-row", selectedMetricId === metricId && "is-active")}
              onClick={() => startTransition(() => onSelect(metricId))}
            >
              <span>{metric.label}</span>
              <strong>{formatMetricValue(metric, metric.latest.value)}</strong>
              <small className={clsx(`tone-${deltaTone(metric, metric.deltas.oneYear)}`)}>
                {formatDelta(metric, metric.deltas.oneYear)}
              </small>
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

export function InsightBlock({ section }: { section: InsightSection }) {
  return (
    <Frame label={section.eyebrow}>
      <div className="v3-panel-head">
        <div>
          <h2>{section.title}</h2>
          <p>{section.summary}</p>
        </div>
      </div>

      <div className="v3-stat-grid">
        {section.stats.map((stat) => (
          <article key={stat.label} className="v3-stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.context}</p>
            <SourceAnchor source={stat.source} />
          </article>
        ))}
      </div>

      <div className="v3-interpretation">
        {section.interpretation.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </Frame>
  );
}

export function MetroTable({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Metro pulse">
      <div className="v3-panel-head">
        <div>
          <h2>Florida is still a metro-by-metro economy.</h2>
          <p>The statewide number is useful, but the local spread carries most of the story.</p>
        </div>
      </div>

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
  );
}

export function IndustryTable({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Industry mix">
      <div className="v3-panel-head">
        <div>
          <h2>The composition of growth is the story.</h2>
          <p>Florida looks different depending on which sector is carrying the month.</p>
        </div>
      </div>

      <div className="v3-table">
        {dataset.industry.sectors.map((sector) => (
          <div key={sector.id} className="v3-table-row is-static">
            <span>{sector.label}</span>
            <strong>{formatCompact(sector.latest.value * 1000, 1)}</strong>
            <small className={clsx(`tone-${deltaTone({ unit: "thousands_jobs", trendDirection: "up_good" } as AnyMetric, sector.deltas.oneYear)}`)}>
              {formatDelta({ unit: "thousands_jobs", trendDirection: "up_good" } as AnyMetric, sector.deltas.oneYear)}
            </small>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function SourceFooter({ dataset }: { dataset: DashboardDataset }) {
  return (
    <footer className="v3-sources">
      <p className="v3-kicker">Source stack</p>
      <h2>Every public claim here traces to a primary source.</h2>
      <div className="v3-source-grid">
        {dataset.sources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <strong>{source.name}</strong>
            <span>{source.notes}</span>
          </a>
        ))}
      </div>
    </footer>
  );
}
