import { startTransition, useEffect, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
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
import type { DashboardDataset, InnovationMetricId, InsightSection } from "../types/dashboard";
import "./dashboard-v3.css";

type V3TabId = "brief" | "scorecard" | "innovation" | "trade";

const TAB_OPTIONS: Array<{ id: V3TabId; label: string; line: string }> = [
  { id: "brief", label: "Brief", line: "what matters now" },
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
  return value === "brief" || value === "scorecard" || value === "innovation" || value === "trade";
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
