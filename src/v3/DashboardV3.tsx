import { startTransition, useEffect, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  CORE_METRIC_IDS,
  INNOVATION_METRIC_IDS,
  type AnyMetric,
  type CoreMetricId,
  chartSeries,
  daysSince,
  deltaTone,
  formatCompact,
  formatDateLabel,
  formatDelta,
  formatMetricValue,
  formatTradeHero,
  formatUsdMillions,
  isCoreMetricId,
  isInnovationMetricId,
} from "../lib/dashboard";
import type { DashboardDataset, InnovationMetricId, InsightSection, PeerStateSnapshot } from "../types/dashboard";
import "./dashboard-v3.css";

type V3TabId = "brief" | "strategy" | "competition" | "terminal" | "scorecard" | "innovation" | "trade";

const TAB_OPTIONS: Array<{ id: V3TabId; label: string; line: string }> = [
  { id: "brief", label: "Brief", line: "what matters now" },
  { id: "strategy", label: "Strategy", line: "peers, clusters, scenarios" },
  { id: "competition", label: "Competition", line: "FDI, tools, capacity" },
  { id: "terminal", label: "Terminal", line: "forecasts and policy alpha" },
  { id: "scorecard", label: "Scorecard", line: "labor, metros, 2030" },
  { id: "innovation", label: "Innovation", line: "formation and capacity" },
  { id: "trade", label: "Trade", line: "exports and gateways" },
];

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(2, 6, 13, 0.98)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: "8px",
  color: "#e8eef9",
};

const TOOLTIP_LABEL_STYLE = {
  color: "#e8eef9",
  fontWeight: 700,
};

const TOOLTIP_ITEM_STYLE = {
  color: "#c6d1df",
};

function readSearchParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

function isV3TabId(value: string | null): value is V3TabId {
  return (
    value === "brief" ||
    value === "strategy" ||
    value === "competition" ||
    value === "terminal" ||
    value === "scorecard" ||
    value === "innovation" ||
    value === "trade"
  );
}

function formatDisplayedValue(metric: AnyMetric, value: number): string {
  if (metric.unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  if (metric.unit === "usd_millions") {
    return `$${formatCompact(value, 1)}`;
  }

  return formatCompact(value, 1);
}

function getMonthlyPayrollChange(dataset: DashboardDataset): number {
  const series = dataset.metrics.nonfarmPayrolls.series;
  const latest = series[series.length - 1];
  const prior = series[series.length - 2] ?? latest;

  if (!latest || !prior) {
    return 0;
  }

  return Math.round((latest.value - prior.value) * 1000);
}

function formatSignedInteger(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toLocaleString()}`;
}

function formatSignedCompact(value: number, maxFractionDigits = 1): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCompact(Math.abs(value), maxFractionDigits)}`;
}

function formatSignedPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function formatUsdValue(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${formatCompact(value / 1_000_000_000, 1)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${formatCompact(value / 1_000_000, 1)}M`;
  }

  return `$${value.toLocaleString()}`;
}

function formatFdiStock(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return `$${value >= 100 ? value.toFixed(0) : value.toFixed(1)}B`;
}

function formatNullableUsdBillions(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  if (Math.abs(value) < 0.1) {
    return `$${Math.round(value * 1000)}M`;
  }

  return `$${value.toFixed(1)}B`;
}

function formatNullableThousands(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  return `${value.toFixed(1)}k`;
}

function formatNullablePercent(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  return `${value.toFixed(1)}%`;
}

function formatNullableSignedPercent(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  return formatSignedPercentage(value);
}

function getMomentumArrow(momentum: DashboardDataset["competition"]["fdiScoreboard"]["observatory"]["deltas"][number]["momentum"]): string {
  if (momentum === "accelerating") {
    return "↑";
  }

  if (momentum === "slowing") {
    return "↓";
  }

  if (momentum === "suppressed") {
    return "•";
  }

  return "→";
}

function formatPeerPayrollDelta(state: PeerStateSnapshot): string {
  const delta = state.nonfarmPayrolls.deltas.oneYear;
  if (!delta) {
    return "n/a";
  }

  return `${formatSignedCompact(delta.absolute * 1000, 1)} (${formatSignedPercentage(delta.percent)})`;
}

function formatPeerLaborForceDelta(state: PeerStateSnapshot): string {
  const delta = state.laborForce.deltas.oneYear;
  if (!delta) {
    return "n/a";
  }

  return `${formatSignedCompact(delta.absolute, 1)} (${formatSignedPercentage(delta.percent)})`;
}

function formatPeerUnemploymentDelta(state: PeerStateSnapshot): string {
  const delta = state.unemploymentRate.deltas.oneYear;
  if (!delta) {
    return "n/a";
  }

  const sign = delta.absolute >= 0 ? "+" : "-";
  return `${sign}${Math.abs(delta.absolute).toFixed(1)} pp`;
}

function firstSentence(value: string): string {
  const [sentence] = value.split(". ");
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function resolveHref(href: string): string {
  if (/^https?:\/\//.test(href)) {
    return href;
  }

  return `${import.meta.env.BASE_URL}${href.replace(/^\/+/, "")}`;
}

function SourceAnchor({ source }: { source?: { label: string; url: string } }) {
  if (!source) {
    return null;
  }

  return (
    <a className="v3-source-link" href={source.url} target="_blank" rel="noreferrer">
      source
    </a>
  );
}

function SourceList({ sources }: { sources: Array<{ label: string; url: string }> }) {
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

function TerminalSourceList({ dataset, sourceIds }: { dataset: DashboardDataset; sourceIds: string[] }) {
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

function CompetitionSourceList({ dataset, sourceIds }: { dataset: DashboardDataset; sourceIds: string[] }) {
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

function Frame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <section className="v3-frame">
      {label ? <p className="v3-kicker">{label}</p> : null}
      {children}
    </section>
  );
}

function ReadHero({ dataset }: { dataset: DashboardDataset }) {
  const payrollChange = getMonthlyPayrollChange(dataset);
  const payrollTone = payrollChange >= 0 ? "good" : "warn";
  const latestPayrollDate = dataset.metrics.nonfarmPayrolls.latest.date;
  const monthName = formatDateLabel(latestPayrollDate, { month: "long", year: "numeric" });
  const unemployment = dataset.metrics.unemploymentRate;
  const laborForce = dataset.metrics.laborForce;
  const exportMetric = dataset.trade.heroMetrics[0];
  const incomeMigration = dataset.scorecard2030.stats.find((stat) => stat.label === "Income migration");

  return (
    <header className="v3-hero">
      <div className="v3-hero-main">
        <p className="v3-kicker">Florida Today | {dataset.asOfLaborMarket}</p>
        <h1 className={clsx(`tone-${payrollTone}`)}>{formatSignedInteger(payrollChange)}</h1>
        <p className="v3-hero-line">
          Florida {payrollChange >= 0 ? "added" : "lost"} {Math.abs(payrollChange).toLocaleString()} nonfarm jobs in{" "}
          {monthName}. The real question is whether hiring, formation, migration, and trade are still moving together.
        </p>
        <div className="v3-hero-meta">
          <span>BLS CES / LAUS</span>
          <span>{daysSince(latestPayrollDate)} days since latest payroll observation</span>
        </div>
      </div>

      <aside className="v3-hero-side">
        <div>
          <span>Unemployment</span>
          <strong>{formatMetricValue(unemployment, unemployment.latest.value)}</strong>
          <small className={clsx(`tone-${deltaTone(unemployment, unemployment.deltas.oneYear)}`)}>
            1Y {formatDelta(unemployment, unemployment.deltas.oneYear)}
          </small>
        </div>
        <div>
          <span>Labor force</span>
          <strong>{formatMetricValue(laborForce, laborForce.latest.value)}</strong>
          <small className={clsx(`tone-${deltaTone(laborForce, laborForce.deltas.oneYear)}`)}>
            1Y {formatDelta(laborForce, laborForce.deltas.oneYear)}
          </small>
        </div>
        <div>
          <span>{exportMetric.label}</span>
          <strong>{formatTradeHero(exportMetric.value, exportMetric.unit)}</strong>
          <small>{exportMetric.helper}</small>
        </div>
        <div>
          <span>Income migration</span>
          <strong>{incomeMigration?.value ?? "n/a"}</strong>
          <small>{incomeMigration?.context ?? "Florida Chamber frame"}</small>
        </div>
      </aside>
    </header>
  );
}

function OperatingRead({ dataset }: { dataset: DashboardDataset }) {
  const payrollChange = getMonthlyPayrollChange(dataset);
  const businessApplications = dataset.innovation.metrics.businessApplications;
  const informationJobs = dataset.innovation.metrics.informationEmployment;
  const tradeDelta = dataset.trade.deltas.find((delta) => delta.id === "oneYear");

  const reads = [
    {
      label: "Hiring pulse",
      value: formatSignedInteger(payrollChange),
      note: "latest monthly payroll move",
      tone: payrollChange >= 0 ? "good" : "warn",
    },
    {
      label: "Formation",
      value: formatMetricValue(businessApplications, businessApplications.latest.value),
      note: `1Y ${formatDelta(businessApplications, businessApplications.deltas.oneYear)}`,
      tone: deltaTone(businessApplications, businessApplications.deltas.oneYear),
    },
    {
      label: "Knowledge-work bench",
      value: formatMetricValue(informationJobs, informationJobs.latest.value),
      note: `1Y ${formatDelta(informationJobs, informationJobs.deltas.oneYear)}`,
      tone: deltaTone(informationJobs, informationJobs.deltas.oneYear),
    },
    {
      label: "Export growth",
      value: tradeDelta?.absolute === null || tradeDelta?.absolute === undefined ? "n/a" : `+$${tradeDelta.absolute.toFixed(1)}B`,
      note: tradeDelta?.baseLabel ?? "latest annual export read",
      tone: "good",
    },
  ] as const;

  return (
    <section className="v3-operating-read" aria-label="Operating read">
      {reads.map((read) => (
        <article key={read.label} className="v3-read-cell">
          <p>{read.label}</p>
          <strong className={clsx(`tone-${read.tone}`)}>{read.value}</strong>
          <span>{read.note}</span>
        </article>
      ))}
    </section>
  );
}

function FloridaBrainNotes({ dataset }: { dataset: DashboardDataset }) {
  return (
    <section className="v3-brain-notes" aria-label="Florida Brain notes">
      <div className="v3-brain-notes-head">
        <p className="v3-kicker">Florida Brain notes</p>
        <h2>Turn the dashboard into publishable questions.</h2>
        <p>
          These are the active editorial reads coming out of Floridanomics. Each note stays source-linked so the
          narrative can move without losing the audit trail.
        </p>
      </div>

      <div className="v3-brain-note-grid">
        {dataset.brainNotes.map((note) => (
          <article key={note.id} className="v3-brain-note">
            <div>
              <p className="v3-kicker">{note.kicker}</p>
              <span>{note.status}</span>
            </div>
            <h3>{note.title}</h3>
            <p>{note.summary}</p>
            <div className="v3-note-source-list">
              {note.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
            {note.href && note.ctaLabel ? (
              <a className="v3-note-cta" href={resolveHref(note.href)}>
                {note.ctaLabel}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function TabNav({ activeTab, onChange }: { activeTab: V3TabId; onChange: (tab: V3TabId) => void }) {
  return (
    <nav className="v3-tabs" aria-label="Floridanomics v3 views">
      {TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          type="button"
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

function EvidenceGrid({ dataset }: { dataset: DashboardDataset }) {
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

function ChartPanel({
  metric,
  title,
  note,
  accent = "sun",
}: {
  metric: AnyMetric;
  title: string;
  note: string;
  accent?: "sun" | "teal";
}) {
  const lineColor = accent === "sun" ? "#ff8f3f" : "#56c2ff";

  return (
    <Frame label="Trend">
      <div className="v3-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{metric.label}</p>
        </div>
        <div className="v3-panel-number">
          <strong>{formatMetricValue(metric, metric.latest.value)}</strong>
          <span className={clsx(`tone-${deltaTone(metric, metric.deltas.oneYear)}`)}>
            1Y {formatDelta(metric, metric.deltas.oneYear)}
          </span>
        </div>
      </div>

      <div className="v3-chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartSeries(metric)} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => formatDisplayedValue(metric, Number(value))} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ stroke: "rgba(255, 143, 63, 0.32)", strokeDasharray: "4 4" }}
              formatter={(value) => [formatDisplayedValue(metric, Number(value)), metric.label]}
            />
            <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="v3-note">{note}</p>
    </Frame>
  );
}

function MetricTable({
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
          <p>The table is the control surface. Pick a row to move the chart.</p>
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

function InsightBlock({ section }: { section: InsightSection }) {
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

function MetroTable({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Metro pulse">
      <div className="v3-panel-head">
        <div>
          <h2>Florida is still a metro-by-metro economy.</h2>
          <p>The statewide read is useful. Operators still need the local spread.</p>
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

function IndustryTable({ dataset }: { dataset: DashboardDataset }) {
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

function BriefTab({ dataset }: { dataset: DashboardDataset }) {
  const watchItems = [
    firstSentence(dataset.narrative.softening[0] ?? "No major supersector is contracting year over year."),
    firstSentence(dataset.innovation.narrative.signals[0] ?? "Business formation is the live innovation signal."),
    firstSentence(dataset.trade.narrative.watchOuts[0] ?? "Watch the trade mix as the export base expands."),
  ];

  return (
    <>
      <ReadHero dataset={dataset} />
      <OperatingRead dataset={dataset} />
      <EvidenceGrid dataset={dataset} />
      <FloridaBrainNotes dataset={dataset} />

      <section className="v3-watch">
        <div>
          <p className="v3-kicker">What to watch</p>
          <h2>The dashboard should leave you with a next question.</h2>
        </div>
        <ol>
          {watchItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </>
  );
}

function StrategyHero({ dataset }: { dataset: DashboardDataset }) {
  const peerStates = dataset.strategy.peerStates;
  const topPayroll = [...peerStates].sort(
    (a, b) => (b.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity) - (a.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity),
  )[0];
  const tightestLabor = [...peerStates].sort((a, b) => a.unemploymentRate.latest.value - b.unemploymentRate.latest.value)[0];
  const florida = peerStates.find((state) => state.id === "FL");

  return (
    <Frame label="Strategy cockpit">
      <div className="v3-strategy-hero">
        <div>
          <h2>{dataset.strategy.headline}</h2>
          <p>{dataset.strategy.summary}</p>
        </div>
        <div className="v3-strategy-hero-stats">
          <article>
            <span>Peer states</span>
            <strong>{peerStates.length}</strong>
            <p>FL, TX, GA, NC, TN, AZ, UT, CA</p>
          </article>
          <article>
            <span>Fastest payroll growth</span>
            <strong>{topPayroll?.shortName ?? "n/a"}</strong>
            <p>{topPayroll ? formatPeerPayrollDelta(topPayroll) : "n/a"}</p>
          </article>
          <article>
            <span>Tightest labor market</span>
            <strong>{tightestLabor?.shortName ?? "n/a"}</strong>
            <p>{tightestLabor ? `${tightestLabor.unemploymentRate.latest.value.toFixed(1)}% unemployment` : "n/a"}</p>
          </article>
          <article>
            <span>Florida read</span>
            <strong>{florida ? `${florida.unemploymentRate.latest.value.toFixed(1)}%` : "n/a"}</strong>
            <p>{florida ? `${formatPeerUnemploymentDelta(florida)} YoY` : "BLS peer benchmark"}</p>
          </article>
        </div>
      </div>
    </Frame>
  );
}

function PeerStateBenchmarks({ dataset }: { dataset: DashboardDataset }) {
  const rankedStates = [...dataset.strategy.peerStates].sort(
    (a, b) => (b.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity) - (a.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity),
  );

  return (
    <Frame label="Peer-state mode">
      <div className="v3-panel-head">
        <div>
          <h2>Florida has to be read against the states eating at the same table.</h2>
          <p>
            This is the first live peer layer: BLS unemployment, labor force, and nonfarm payrolls across the states
            Florida should benchmark against before making a victory-lap claim.
          </p>
        </div>
      </div>

      <div className="v3-peer-table">
        {rankedStates.map((state) => {
          const payrollTone = (state.nonfarmPayrolls.deltas.oneYear?.absolute ?? 0) >= 0 ? "good" : "warn";
          const unemploymentTone = (state.unemploymentRate.deltas.oneYear?.absolute ?? 0) <= 0 ? "good" : "warn";

          return (
            <article key={state.id} className={clsx("v3-peer-row", state.id === "FL" && "is-florida")}>
              <div>
                <strong>{state.name}</strong>
                <span>{state.positioning}</span>
              </div>
              <div>
                <span>Unemployment</span>
                <strong>{state.unemploymentRate.latest.value.toFixed(1)}%</strong>
                <small className={clsx(`tone-${unemploymentTone}`)}>{formatPeerUnemploymentDelta(state)} YoY</small>
              </div>
              <div>
                <span>Payrolls 1Y</span>
                <strong className={clsx(`tone-${payrollTone}`)}>{formatPeerPayrollDelta(state)}</strong>
                <small>BLS CES</small>
              </div>
              <div>
                <span>Labor force 1Y</span>
                <strong>{formatPeerLaborForceDelta(state)}</strong>
                <small>BLS LAUS</small>
              </div>
              <p>{state.watch}</p>
            </article>
          );
        })}
      </div>
    </Frame>
  );
}

function BenchmarkModels({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Models to steal from">
      <div className="v3-benchmark-grid">
        {dataset.strategy.benchmarkExamples.map((example) => (
          <article key={example.id} className="v3-benchmark-card">
            <span>{example.model}</span>
            <h3>{example.name}</h3>
            <p>{example.takeaway}</p>
            <SourceAnchor source={example.source} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function ClusterStrategy({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Cluster strategy">
      <div className="v3-panel-head">
        <div>
          <h2>Do not benchmark Florida as one blob. Benchmark the clusters that can change the wage curve.</h2>
          <p>
            Pennsylvania's useful lesson is structure: sectors, supply chains, workforce gaps, and emerging industries
            should sit in one operating view.
          </p>
        </div>
      </div>

      <div className="v3-cluster-grid">
        {dataset.strategy.clusters.map((cluster) => (
          <article key={cluster.id} className="v3-cluster-card">
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
        ))}
      </div>
    </Frame>
  );
}

function MetroMomentumLayer({ dataset }: { dataset: DashboardDataset }) {
  const sortedMetros = [...dataset.metros].sort(
    (a, b) => (b.laborForce.deltas.oneYear?.percent ?? -Infinity) - (a.laborForce.deltas.oneYear?.percent ?? -Infinity),
  );

  return (
    <Frame label="Metro momentum">
      <div className="v3-panel-head">
        <div>
          <h2>Borrow North Carolina's local-momentum logic for Florida metros.</h2>
          <p>
            The next version should expand this to all counties. For now, the major metros show whether local labor
            force momentum is broadening or narrowing.
          </p>
        </div>
      </div>

      <div className="v3-momentum-grid">
        {sortedMetros.map((metro) => (
          <article key={metro.id} className="v3-momentum-card">
            <span>{metro.name}</span>
            <strong>{metro.unemploymentRate.latest.value.toFixed(1)}%</strong>
            <p>Unemployment rate</p>
            <div>
              <small>Labor force 1Y</small>
              <b>{formatSignedCompact(metro.laborForce.deltas.oneYear?.absolute ?? 0, 1)}</b>
            </div>
            <div>
              <small>Employment 1Y</small>
              <b>{formatSignedCompact(metro.employmentLevel.deltas.oneYear?.absolute ?? 0, 1)}</b>
            </div>
          </article>
        ))}
      </div>
    </Frame>
  );
}

function ScenarioLayer({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Scenario layer">
      <div className="v3-scenario-grid">
        {dataset.strategy.scenarios.map((scenario) => (
          <article key={scenario.id} className={clsx("v3-scenario-card", `scenario-${scenario.id}`)}>
            <span>{scenario.status}</span>
            <h3>{scenario.label}</h3>
            <p>{scenario.summary}</p>
            <ul>
              {scenario.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
            <SourceList sources={scenario.sources} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function TerminalHero({ dataset }: { dataset: DashboardDataset }) {
  const terminal = dataset.terminal;
  const florida = dataset.strategy.peerStates.find((state) => state.id === "FL");
  const texas = dataset.strategy.peerStates.find((state) => state.id === "TX");
  const spread =
    florida && texas ? florida.unemploymentRate.latest.value - texas.unemploymentRate.latest.value : null;

  return (
    <Frame label="Florida Model Terminal">
      <div className="v3-terminal-hero">
        <div className="v3-terminal-hero-copy">
          <h2>{terminal.headline}</h2>
          <p>{terminal.thesis}</p>
          <blockquote>{terminal.operatingQuestion}</blockquote>
        </div>

        <aside className="v3-terminal-score">
          <span>{terminal.aiCapexIndex.label}</span>
          <strong>
            {terminal.aiCapexIndex.score}/{terminal.aiCapexIndex.maxScore}
          </strong>
          <b>{terminal.aiCapexIndex.rating}</b>
          <div className="v3-terminal-score-meter" aria-hidden="true">
            <i
              style={{
                width: `${(terminal.aiCapexIndex.score / terminal.aiCapexIndex.maxScore) * 100}%`,
              }}
            />
          </div>
          <p>{terminal.aiCapexIndex.caveat}</p>
          <div className="v3-terminal-peer-read">
            <small>FL vs TX unemployment spread</small>
            <b>{spread === null ? "n/a" : `${spread >= 0 ? "+" : ""}${spread.toFixed(1)} pp`}</b>
          </div>
        </aside>
      </div>
    </Frame>
  );
}

function AiCapexIndex({ dataset }: { dataset: DashboardDataset }) {
  const index = dataset.terminal.aiCapexIndex;

  return (
    <Frame label="AI capex gap">
      <div className="v3-panel-head">
        <div>
          <h2>Turn the Texas anxiety into an index we can update.</h2>
          <p>
            The point is not to dunk on Florida. It is to separate a solvable strategic-infrastructure gap from a
            normal labor-market cycle.
          </p>
        </div>
      </div>

      <div className="v3-terminal-index">
        <div className="v3-terminal-metric-grid">
          {index.metrics.map((metric) => (
            <article key={metric.id} className="v3-terminal-metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.context}</small>
              <p>{metric.read}</p>
              <TerminalSourceList dataset={dataset} sourceIds={metric.sourceIds} />
            </article>
          ))}
        </div>

        <div className="v3-terminal-factor-panel">
          <h3>Index factors</h3>
          <div className="v3-terminal-factor-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={index.factors.map((factor) => ({
                  label: factor.label,
                  score: factor.score,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 24, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis dataKey="label" type="category" width={142} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(value) => [`${Number(value).toFixed(0)} / 5`, "Score"]}
                />
                <Bar dataKey="score" fill="#ff8f3f" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="v3-terminal-factor-list">
            {index.factors.map((factor) => (
              <article key={factor.id}>
                <div>
                  <strong>{factor.label}</strong>
                  <span>
                    {factor.score}/{factor.maxScore}
                  </span>
                </div>
                <p>{factor.read}</p>
                <TerminalSourceList dataset={dataset} sourceIds={factor.sourceIds} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function HighWageTerminal({ dataset }: { dataset: DashboardDataset }) {
  const liveMetrics = [
    {
      label: "Information jobs",
      metric: dataset.innovation.metrics.informationEmployment,
      note: "knowledge-work bench",
    },
    {
      label: "Construction jobs",
      metric: dataset.innovation.metrics.constructionEmployment,
      note: "capex build-out proxy",
    },
    {
      label: "Professional services",
      metric: dataset.innovation.metrics.professionalBusinessEmployment,
      note: "managerial and technical depth",
    },
  ];

  return (
    <Frame label="High-wage monitor">
      <div className="v3-panel-head">
        <div>
          <h2>{dataset.terminal.highWageMonitor.headline}</h2>
          <p>{dataset.terminal.highWageMonitor.summary}</p>
        </div>
      </div>

      <div className="v3-terminal-live-grid">
        {liveMetrics.map((item) => (
          <article key={item.label} className="v3-terminal-live-card">
            <span>{item.label}</span>
            <strong>{formatMetricValue(item.metric, item.metric.latest.value)}</strong>
            <small className={clsx(`tone-${deltaTone(item.metric, item.metric.deltas.oneYear)}`)}>
              1Y {formatDelta(item.metric, item.metric.deltas.oneYear)}
            </small>
            <p>{item.note}</p>
          </article>
        ))}
      </div>

      <div className="v3-terminal-memo-grid">
        {dataset.terminal.highWageMonitor.metrics.map((metric) => (
          <article key={metric.id} className="v3-terminal-small-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.read}</p>
            <TerminalSourceList dataset={dataset} sourceIds={metric.sourceIds} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function ProjectLedger({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Project ledger">
      <div className="v3-panel-head">
        <div>
          <h2>Move from vibes to named assets.</h2>
          <p>
            A serious state terminal needs a capex ledger: what is announced, what is real, where it sits, and what
            wage curve it should bend.
          </p>
        </div>
      </div>

      <div className="v3-project-ledger">
        {dataset.terminal.projectLedger.map((project) => (
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
  );
}

function ForecastBoard({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Forecast board">
      <div className="v3-forecast-grid">
        {dataset.terminal.forecasts.map((forecast) => (
          <article key={forecast.id} className="v3-forecast-card">
            <div className="v3-forecast-card-head">
              <span>{forecast.horizon}</span>
              <b>{forecast.confidence} confidence</b>
            </div>
            <h3>{forecast.claim}</h3>
            <p>{forecast.mechanism}</p>

            <div className="v3-forecast-cases">
              <section>
                <span>Base</span>
                <p>{forecast.baseCase}</p>
              </section>
              <section>
                <span>Ambition</span>
                <p>{forecast.ambitionCase}</p>
              </section>
              <section>
                <span>Risk</span>
                <p>{forecast.riskCase}</p>
              </section>
              <section>
                <span>Counter-case</span>
                <p>{forecast.counterCase}</p>
              </section>
            </div>

            <div className="v3-forecast-indicators">
              <div>
                <strong>Leading indicators</strong>
                <ul>
                  {forecast.leadingIndicators.map((indicator) => (
                    <li key={indicator}>{indicator}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Lagging indicators</strong>
                <ul>
                  {forecast.laggingIndicators.map((indicator) => (
                    <li key={indicator}>{indicator}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="v3-terminal-trigger">
              <strong>Update trigger:</strong> {forecast.updateTrigger}
            </p>
            <TerminalSourceList dataset={dataset} sourceIds={forecast.sourceIds} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function PolicyMemoBoard({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Policy alpha">
      <div className="v3-policy-grid">
        {dataset.terminal.policyMemos.map((memo) => (
          <article key={memo.id} className="v3-policy-card">
            <h3>{memo.title}</h3>
            <p className="v3-policy-stance">{memo.stance}</p>
            <dl>
              <div>
                <dt>What changed</dt>
                <dd>{memo.whatChanged}</dd>
              </div>
              <div>
                <dt>Mechanism</dt>
                <dd>{memo.mechanism}</dd>
              </div>
              <div>
                <dt>Recommendation</dt>
                <dd>{memo.recommendation}</dd>
              </div>
              <div>
                <dt>Do not do</dt>
                <dd>{memo.whatNotToDo}</dd>
              </div>
            </dl>
            <div>
              <strong>Next moves</strong>
              <ul>
                {memo.nextMoves.map((move) => (
                  <li key={move}>{move}</li>
                ))}
              </ul>
            </div>
            <TerminalSourceList dataset={dataset} sourceIds={memo.sourceIds} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function EvidenceExport({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Exportable Florida model">
      <div className="v3-evidence-export-grid">
        {dataset.terminal.evidenceBlocks.map((block) => (
          <article key={block.id} className="v3-evidence-export-card">
            <h3>{block.title}</h3>
            <p>{block.briefCopy}</p>
            <small>{block.exportUse}</small>
            <TerminalSourceList dataset={dataset} sourceIds={block.sourceIds} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function TerminalTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <TerminalHero dataset={dataset} />
      <AiCapexIndex dataset={dataset} />
      <HighWageTerminal dataset={dataset} />
      <ProjectLedger dataset={dataset} />
      <ForecastBoard dataset={dataset} />
      <PolicyMemoBoard dataset={dataset} />
      <EvidenceExport dataset={dataset} />
    </>
  );
}

function StrategyTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <StrategyHero dataset={dataset} />
      <PeerStateBenchmarks dataset={dataset} />
      <ClusterStrategy dataset={dataset} />
      <div className="v3-two-up">
        <InsightBlock section={dataset.strategy.talentPipeline} />
        <BenchmarkModels dataset={dataset} />
      </div>
      <MetroMomentumLayer dataset={dataset} />
      <ScenarioLayer dataset={dataset} />
    </>
  );
}

function CompetitionHero({ dataset }: { dataset: DashboardDataset }) {
  const competition = dataset.competition;
  const florida = competition.fdiScoreboard.states.find((state) => state.id === "FL");
  const texas = competition.fdiScoreboard.states.find((state) => state.id === "TX");
  const firstMetric = competition.fdiScoreboard.metrics[0];

  return (
    <Frame label="State competition terminal">
      <div className="v3-competition-hero">
        <div className="v3-competition-hero-main">
          <h2>{competition.headline}</h2>
          <p>{competition.summary}</p>
          <blockquote>
            {texas && florida
              ? `The live question is not whether Florida is growing. It is whether Florida can convert its migration and trade flywheel into Texas-scale capital intensity: ${formatFdiStock(florida.fdiPpeUsdBillions)} versus ${formatFdiStock(texas.fdiPpeUsdBillions)} in foreign-owned PP&E.`
              : "The live question is whether Florida can turn a growth story into a competitor-state operating system."}
          </blockquote>
          <p className="v3-competition-caveat">{competition.vaultLog.caveat}</p>
        </div>

        <aside className="v3-competition-scorecard">
          <span>{firstMetric?.label ?? "FDI read"}</span>
          <strong>{firstMetric?.value ?? "n/a"}</strong>
          <p>{firstMetric?.read ?? competition.fdiScoreboard.summary}</p>
          {firstMetric ? <CompetitionSourceList dataset={dataset} sourceIds={firstMetric.sourceIds} /> : null}
        </aside>
      </div>
    </Frame>
  );
}

function FederalDataSpine({ dataset }: { dataset: DashboardDataset }) {
  const federal = dataset.federal;
  if (!federal) {
    return null;
  }

  const liveSignals = federal.signals.filter((item) => item.status === "live").length;

  return (
    <Frame label="Federal data spine">
      <div className="v3-federal-spine-head">
        <div>
          <h2>{federal.headline}</h2>
          <p>{federal.summary}</p>
        </div>
        <div className="v3-federal-spine-score">
          <strong>
            {liveSignals}/{federal.signals.length}
          </strong>
          <span>live federal feeds</span>
        </div>
      </div>

      <div className="v3-federal-signal-grid">
        {federal.signals.map((signal) => (
          <article key={signal.id} className={clsx("v3-federal-signal", `status-${signal.status}`)}>
            <div>
              <span className="v3-federal-agency">{signal.geography}</span>
              <span className="v3-federal-status">{signal.status.replace(/_/g, " ")}</span>
            </div>
            <strong>{signal.value}</strong>
            <small>
              {signal.label} | {signal.period}
            </small>
            <p>{signal.read}</p>
            {signal.caveat ? <p className="v3-federal-caveat">{signal.caveat}</p> : null}
            <a href={signal.sourceUrl} target="_blank" rel="noreferrer">
              source
            </a>
          </article>
        ))}
      </div>

      {federal.missingKeys.length > 0 ? (
        <div className="v3-federal-keys">
          <span>Keys to activate</span>
          <p>{federal.missingKeys.join(", ")}</p>
        </div>
      ) : null}
    </Frame>
  );
}

function FdiScoreboard({ dataset }: { dataset: DashboardDataset }) {
  const states = dataset.competition.fdiScoreboard.states;
  const observatory = dataset.competition.fdiScoreboard.observatory;
  const chartData = states.map((state) => ({
    id: state.id,
    name: state.name,
    jobs: state.fdiJobs,
    projects: state.greenfieldProjects,
  }));

  return (
    <Frame label="FDI scoreboard">
      <div className="v3-panel-head">
        <div>
          <h2>{dataset.competition.fdiScoreboard.headline}</h2>
          <p>{dataset.competition.fdiScoreboard.summary}</p>
        </div>
      </div>

      <div className="v3-fdi-observatory">
        <div className="v3-fdi-observatory-head">
          <div>
            <h3>{observatory.headline}</h3>
            <p>{observatory.summary}</p>
          </div>
          <strong>4 scores</strong>
        </div>

        <div className="v3-fdi-score-grid">
          {observatory.scores.map((score) => {
            const scorePercent = Math.min(100, Math.max(0, (score.score / score.maxScore) * 100));

            return (
              <article key={score.id} className={clsx("v3-fdi-score-card", `is-${score.id}`)}>
                <span>{score.label}</span>
                <strong>{score.value}</strong>
                <div className="v3-fdi-score-meter" aria-label={`${score.label} score ${score.score} of ${score.maxScore}`}>
                  <i style={{ width: `${scorePercent}%` }} />
                </div>
                <small>
                  {score.score}/{score.maxScore} | {score.status}
                </small>
                <p className="v3-fdi-delta">{score.delta}</p>
                <p>{score.read}</p>
                <CompetitionSourceList dataset={dataset} sourceIds={score.sourceIds} />
              </article>
            );
          })}
        </div>

        <div className="v3-fdi-delta-table" aria-label="FDI momentum deltas by state">
          {observatory.deltas.map((state) => (
            <article
              key={state.id}
              className={clsx("v3-fdi-delta-row", `momentum-${state.momentum}`, state.id === "FL" && "is-florida")}
            >
              <div>
                <span className="v3-fdi-momentum-label">
                  <em aria-hidden="true">{getMomentumArrow(state.momentum)}</em>
                  {state.momentum}
                </span>
                <strong>{state.state}</strong>
                <p>{state.read}</p>
              </div>
              <div>
                <span>2024 flow</span>
                <strong>{formatNullableUsdBillions(state.latestExpendituresUsdBillions)}</strong>
                <small>{formatNullableSignedPercent(state.oneYearExpendituresPercent)} YoY</small>
              </div>
              <div>
                <span>Employment</span>
                <strong>{formatNullableThousands(state.currentEmploymentThousands)}</strong>
                <small>{formatNullableSignedPercent(state.oneYearEmploymentPercent)} YoY</small>
              </div>
              <div>
                <span>Greenfield share</span>
                <strong>{formatNullablePercent(state.greenfieldSharePercent)}</strong>
                <small>first-year capex mix</small>
              </div>
              <CompetitionSourceList dataset={dataset} sourceIds={state.sourceIds} />
            </article>
          ))}
        </div>
      </div>

      <div className="v3-competition-metric-grid">
        {dataset.competition.fdiScoreboard.metrics.map((metric) => (
          <article key={metric.id} className="v3-competition-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.context}</small>
            <p>{metric.read}</p>
            <CompetitionSourceList dataset={dataset} sourceIds={metric.sourceIds} />
          </article>
        ))}
      </div>

      <div className="v3-competition-chart-layout">
        <div className="v3-chart">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 18, left: 18, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => formatCompact(Number(value), 1)} />
              <YAxis dataKey="id" type="category" width={44} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value, name) => [
                  name === "jobs" ? formatCompact(Number(value), 1) : Number(value).toLocaleString(),
                  name === "jobs" ? "FDI jobs" : "Greenfield projects",
                ]}
              />
              <Bar dataKey="jobs" radius={[0, 8, 8, 0]}>
                {chartData.map((state) => (
                  <Cell key={state.id} fill={state.id === "FL" ? "#ff8f3f" : state.id === "TX" ? "#56c2ff" : "#334155"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="v3-competition-state-list">
          {states.map((state) => (
            <article key={state.id} className={clsx("v3-competition-state-row", state.id === "FL" && "is-florida")}>
              <div>
                <span>{state.tier}</span>
                <strong>{state.name}</strong>
                <p>{state.posture}</p>
              </div>
              <div>
                <span>FDI jobs</span>
                <strong>{state.fdiJobs.toLocaleString()}</strong>
              </div>
              <div>
                <span>Projects</span>
                <strong>{state.greenfieldProjects.toLocaleString()}</strong>
              </div>
              <div>
                <span>FDI stock</span>
                <strong>{formatFdiStock(state.fdiPpeUsdBillions)}</strong>
              </div>
              <p>{state.capitalIntensityRead}</p>
            </article>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function PolicyToolkit({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Policy toolkit ledger">
      <div className="v3-panel-head">
        <div>
          <h2>{dataset.competition.policyToolkit.headline}</h2>
          <p>{dataset.competition.policyToolkit.summary}</p>
        </div>
      </div>

      <div className="v3-policy-toolkit-grid">
        {dataset.competition.policyToolkit.states.map((state) => (
          <article key={state.id} className={clsx("v3-policy-toolkit-card", state.id === "florida" && "is-florida")}>
            <span>{state.state}</span>
            <h3>{state.competitorSignal}</h3>
            <ul>
              {state.tools.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
            <p>
              <strong>Florida read:</strong> {state.floridaGap}
            </p>
            <CompetitionSourceList dataset={dataset} sourceIds={state.sourceIds} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function CapacityAndMigration({ dataset }: { dataset: DashboardDataset }) {
  return (
    <div className="v3-two-up">
      <Frame label="Institutional capacity">
        <div className="v3-panel-head">
          <div>
            <h2>{dataset.competition.institutionalCapacity.headline}</h2>
            <p>{dataset.competition.institutionalCapacity.summary}</p>
          </div>
        </div>

        <div className="v3-capacity-grid">
          {dataset.competition.institutionalCapacity.metrics.map((metric) => (
            <article key={metric.id} className="v3-capacity-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.context}</small>
              <p>{metric.read}</p>
              <CompetitionSourceList dataset={dataset} sourceIds={metric.sourceIds} />
            </article>
          ))}
        </div>

        <ol className="v3-lesson-list">
          {dataset.competition.institutionalCapacity.operatingLessons.map((lesson) => (
            <li key={lesson}>{lesson}</li>
          ))}
        </ol>
      </Frame>

      <Frame label="Migration flywheel">
        <div className="v3-panel-head">
          <div>
            <h2>{dataset.competition.migration.headline}</h2>
            <p>{dataset.competition.migration.summary}</p>
          </div>
        </div>

        <div className="v3-migration-list">
          {dataset.competition.migration.rankings.map((ranking) => (
            <article key={ranking.state} className={clsx("v3-migration-row", ranking.state === "Florida" && "is-florida")}>
              <span>#{ranking.rank}</span>
              <strong>{ranking.state}</strong>
              <p>2021: {ranking.netMigration2021.toLocaleString()}</p>
              <p>2022: {ranking.netMigration2022.toLocaleString()}</p>
            </article>
          ))}
        </div>

        <p className="v3-competition-read">{dataset.competition.migration.read}</p>
        <CompetitionSourceList dataset={dataset} sourceIds={dataset.competition.migration.sourceIds} />
      </Frame>
    </div>
  );
}

function SemiconductorCommitments({ dataset }: { dataset: DashboardDataset }) {
  const commitments = dataset.competition.semiconductor.commitments;
  const totalCommitment = commitments.reduce((sum, item) => sum + item.valueUsd, 0);

  return (
    <Frame label="Strategic compute and semiconductors">
      <div className="v3-panel-head">
        <div>
          <h2>{dataset.competition.semiconductor.headline}</h2>
          <p>{dataset.competition.semiconductor.summary}</p>
        </div>
        <div className="v3-panel-number">
          <strong>{formatUsdValue(totalCommitment)}</strong>
          <span>logged commitments</span>
        </div>
      </div>

      <div className="v3-semiconductor-list">
        {commitments.map((commitment) => (
          <article key={commitment.id} className="v3-semiconductor-row">
            <div>
              <strong>{commitment.label}</strong>
              <p>{commitment.context}</p>
            </div>
            <span>{formatUsdValue(commitment.valueUsd)}</span>
          </article>
        ))}
      </div>

      <p className="v3-competition-read">{dataset.competition.semiconductor.read}</p>
      <CompetitionSourceList dataset={dataset} sourceIds={dataset.competition.semiconductor.sourceIds} />
    </Frame>
  );
}

function CompetitionNextMoves({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Build queue">
      <div className="v3-next-moves">
        <div>
          <h2>The next layer is a live war room.</h2>
          <p>
            This tab now turns the SelectFlorida archive into a product surface. The next build should replace static
            archive reads with refreshed primary-source feeds and a deal-by-deal competitor ledger.
          </p>
        </div>
        <ol>
          {dataset.competition.nextMoves.map((move) => (
            <li key={move}>{move}</li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

function CompetitionTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <CompetitionHero dataset={dataset} />
      <FederalDataSpine dataset={dataset} />
      <FdiScoreboard dataset={dataset} />
      <PolicyToolkit dataset={dataset} />
      <CapacityAndMigration dataset={dataset} />
      <SemiconductorCommitments dataset={dataset} />
      <CompetitionNextMoves dataset={dataset} />
    </>
  );
}

function ScorecardTab({
  dataset,
  selectedMetricId,
  onSelectMetric,
}: {
  dataset: DashboardDataset;
  selectedMetricId: CoreMetricId;
  onSelectMetric: (metricId: CoreMetricId) => void;
}) {
  const selectedMetric = dataset.metrics[selectedMetricId];

  return (
    <>
      <ChartPanel
        metric={selectedMetric}
        title="Start with the live labor signal."
        note="A good state dashboard should make the active metric obvious, then show the supporting evidence around it."
      />
      <MetricTable dataset={dataset} selectedMetricId={selectedMetricId} onSelect={onSelectMetric} />
      <InsightBlock section={dataset.scorecard2030} />
      <InsightBlock section={dataset.distinctives.snowbirdIndex} />
      <div className="v3-two-up">
        <IndustryTable dataset={dataset} />
        <MetroTable dataset={dataset} />
      </div>
    </>
  );
}

function InnovationTab({
  dataset,
  selectedMetricId,
  onSelectMetric,
}: {
  dataset: DashboardDataset;
  selectedMetricId: InnovationMetricId;
  onSelectMetric: (metricId: InnovationMetricId) => void;
}) {
  const selectedMetric = dataset.innovation.metrics[selectedMetricId];

  return (
    <>
      <ChartPanel
        metric={selectedMetric}
        title="Formation, output, and advanced jobs need one focal signal."
        note="The useful read is the spread between new company formation and the depth of Florida's knowledge-work bench."
        accent="teal"
      />

      <Frame label="Innovation signals">
        <div className="v3-toggle-grid">
          {INNOVATION_METRIC_IDS.map((metricId) => {
            const metric = dataset.innovation.metrics[metricId];
            return (
              <button
                key={metricId}
                type="button"
                className={clsx("v3-toggle-card", selectedMetricId === metricId && "is-active")}
                onClick={() => startTransition(() => onSelectMetric(metricId))}
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

      <InsightBlock section={dataset.distinctives.spaceCoastCadence} />

      <Frame label="Resource stack">
        <div className="v3-resource-list">
          {dataset.innovation.resources.map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer">
              <span>{resource.region}</span>
              <strong>{resource.name}</strong>
              <small>{resource.category}</small>
            </a>
          ))}
        </div>
      </Frame>
    </>
  );
}

function TradeTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <Frame label="Trade read">
        <div className="v3-panel-head">
          <div>
            <h2>{dataset.trade.headline}</h2>
            <p>{dataset.trade.narrative.headline}</p>
          </div>
        </div>

        <div className="v3-stat-grid">
          {dataset.trade.heroMetrics.map((metric) => (
            <article key={metric.id} className="v3-stat-card">
              <span>{metric.label}</span>
              <strong>{formatTradeHero(metric.value, metric.unit)}</strong>
              <p>{metric.helper}</p>
            </article>
          ))}
        </div>
      </Frame>

      <InsightBlock section={dataset.distinctives.latamGateway} />

      <div className="v3-two-up">
        <Frame label="Top markets">
          <div className="v3-table">
            {dataset.trade.topMarkets.map((market) => (
              <div key={market.country} className="v3-table-row is-static">
                <span>{market.rank}. {market.country}</span>
                <strong>{market.region}</strong>
                <small>gateway market</small>
              </div>
            ))}
          </div>
        </Frame>

        <Frame label="Export categories">
          <div className="v3-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={dataset.trade.topCategories.map((category) => ({
                  label: category.label,
                  value: category.valueUsdBillions,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 62 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />
                <XAxis
                  dataKey="label"
                  angle={-18}
                  textAnchor="end"
                  interval={0}
                  height={82}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => `$${Number(value).toFixed(0)}B`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(value) => [`$${Number(value).toFixed(1)}B`, "Export value"]}
                />
                <Bar dataKey="value" fill="#ff8f3f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Frame>
      </div>

      <Frame label="Execution">
        <div className="v3-stat-grid">
          <article className="v3-stat-card">
            <span>Businesses served</span>
            <strong>{dataset.trade.selectFlorida.businessesServed.toLocaleString()}</strong>
            <p>{dataset.trade.selectFlorida.businessesWindow}</p>
          </article>
          <article className="v3-stat-card">
            <span>Sales generated</span>
            <strong>{formatUsdMillions(dataset.trade.selectFlorida.salesGeneratedUsdMillions)}+</strong>
            <p>SelectFlorida measured outcome</p>
          </article>
          {dataset.trade.selectFlorida.showResults.map((show) => (
            <article key={show.id} className="v3-stat-card">
              <span>{show.show}</span>
              <strong>{formatUsdMillions(show.reportedSalesUsdMillions)}+</strong>
              <p>{show.window}</p>
            </article>
          ))}
        </div>
      </Frame>
    </>
  );
}

function SourceFooter({ dataset }: { dataset: DashboardDataset }) {
  return (
    <footer className="v3-sources">
      <p className="v3-kicker">Source stack</p>
      <h2>Every public claim should have somewhere to land.</h2>
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

function DashboardV3() {
  const { data, error, status } = useDashboardData();
  const [activeTab, setActiveTab] = useState<V3TabId>(() => {
    const param = readSearchParam("tab");
    return isV3TabId(param) ? param : "brief";
  });
  const [selectedMetricId, setSelectedMetricId] = useState<CoreMetricId>(() => {
    const param = readSearchParam("metric");
    return isCoreMetricId(param) ? param : "nonfarmPayrolls";
  });
  const [selectedInnovationMetricId, setSelectedInnovationMetricId] = useState<InnovationMetricId>(() => {
    const param = readSearchParam("innovationMetric");
    return isInnovationMetricId(param) ? param : "businessApplications";
  });

  useEffect(() => {
    if (!data || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    params.set("metric", selectedMetricId);
    params.set("innovationMetric", selectedInnovationMetricId);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab, data, selectedInnovationMetricId, selectedMetricId]);

  if (status === "error") {
    return (
      <main className="v3-root">
        <section className="v3-state">
          <p className="v3-kicker">Data load error</p>
          <h1>The dashboard could not load the Florida dataset.</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!data || status === "loading") {
    return (
      <main className="v3-root">
        <section className="v3-state">
          <p className="v3-kicker">Floridanomics v3</p>
          <h1>Loading the operating brief.</h1>
          <p>Pulling the current Florida dataset into the new reading surface.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="v3-root">
      <div className="v3-shell">
        <div className="v3-masthead">
          <div>
            <p className="v3-kicker">Floridanomics v3 | first-principles rewrite</p>
            <h1>Florida economic intelligence, rewritten as an operating brief.</h1>
          </div>
          <div className="v3-freshness">
            <span>Dataset</span>
            <strong>{formatDateLabel(data.generatedAt)}</strong>
            <small>Labor: {data.asOfLaborMarket} | Population: {data.asOfPopulation}</small>
          </div>
        </div>

        <TabNav activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "brief" ? <BriefTab dataset={data} /> : null}
        {activeTab === "strategy" ? <StrategyTab dataset={data} /> : null}
        {activeTab === "competition" ? <CompetitionTab dataset={data} /> : null}
        {activeTab === "terminal" ? <TerminalTab dataset={data} /> : null}
        {activeTab === "scorecard" ? (
          <ScorecardTab dataset={data} selectedMetricId={selectedMetricId} onSelectMetric={setSelectedMetricId} />
        ) : null}
        {activeTab === "innovation" ? (
          <InnovationTab
            dataset={data}
            selectedMetricId={selectedInnovationMetricId}
            onSelectMetric={setSelectedInnovationMetricId}
          />
        ) : null}
        {activeTab === "trade" ? <TradeTab dataset={data} /> : null}

        <SourceFooter dataset={data} />
      </div>
    </main>
  );
}

export default DashboardV3;
