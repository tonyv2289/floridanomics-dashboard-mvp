import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DashboardDataset,
  Delta,
  IndustrySector,
  InnovationMetricId,
  InnovationResource,
  Metric,
  PopulationMetric,
  TimePoint,
} from "./types/dashboard";
import { FloridaMsaMap } from "./components/FloridaMsaMap";
import "./App.css";

type AnyMetric = Metric | PopulationMetric;
type MetricId = keyof DashboardDataset["metrics"];
type TabId = "scorecard" | "innovation";

const METRIC_IDS: MetricId[] = ["unemploymentRate", "laborForce", "employmentLevel", "nonfarmPayrolls", "population"];
const INNOVATION_METRIC_IDS: InnovationMetricId[] = [
  "informationEmployment",
  "professionalBusinessEmployment",
  "businessApplications",
  "realGsp",
  "constructionEmployment",
];

const METRO_COLORS = {
  miami: "#fb923c",
  tampa: "#60a5fa",
  orlando: "#34d399",
  jacksonville: "#f472b6",
} as const;

function displayValue(metric: AnyMetric, rawValue: number): number {
  if (metric.unit === "thousands_jobs") {
    return rawValue * 1000;
  }
  if (metric.unit === "usd_millions") {
    return rawValue * 1_000_000;
  }
  return rawValue;
}

function formatCompact(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatMetricValue(metric: AnyMetric, rawValue: number): string {
  if (metric.unit === "percent") {
    return `${rawValue.toFixed(1)}%`;
  }

  if (metric.unit === "usd_millions") {
    return `$${formatCompact(displayValue(metric, rawValue), 1)}`;
  }

  if (metric.unit === "count") {
    return formatCompact(displayValue(metric, rawValue), 1);
  }

  return formatCompact(displayValue(metric, rawValue), 1);
}

function formatDelta(metric: AnyMetric, delta: Delta | null): string {
  if (!delta) {
    return "n/a";
  }

  const sign = delta.absolute >= 0 ? "+" : "-";

  if (metric.unit === "percent") {
    return `${sign}${Math.abs(delta.absolute).toFixed(1)} pp`;
  }

  const absolute = displayValue(metric, Math.abs(delta.absolute));
  const pct = delta.percent === null ? "n/a" : `${sign}${Math.abs(delta.percent).toFixed(1)}%`;
  if (metric.unit === "usd_millions") {
    return `${sign}$${formatCompact(absolute, 1)} (${pct})`;
  }
  return `${sign}${formatCompact(absolute, 1)} (${pct})`;
}

function deltaClass(metric: AnyMetric, delta: Delta | null): "delta-good" | "delta-bad" | "delta-flat" {
  if (!delta) {
    return "delta-flat";
  }

  if (Math.abs(delta.absolute) < 1e-9) {
    return "delta-flat";
  }

  const isPositive = delta.absolute > 0;
  const favorable = metric.trendDirection === "up_good" ? isPositive : !isPositive;

  return favorable ? "delta-good" : "delta-bad";
}

function chartData(points: TimePoint[]): Array<{ label: string; value: number }> {
  return points.map((point) => ({
    label: point.date,
    value: point.value,
  }));
}

function shortMonthLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function metricHeadline(metricId: keyof DashboardDataset["metrics"]): string {
  switch (metricId) {
    case "unemploymentRate":
      return "Labor slack";
    case "laborForce":
      return "Participation depth";
    case "employmentLevel":
      return "People employed";
    case "nonfarmPayrolls":
      return "Payroll engine";
    case "population":
      return "Demand base";
    default:
      return "Trend";
  }
}

function isMetricId(value: string | null): value is MetricId {
  return value !== null && METRIC_IDS.includes(value as MetricId);
}

function isTabId(value: string | null): value is TabId {
  return value === "scorecard" || value === "innovation";
}

function isInnovationMetricId(value: string | null): value is InnovationMetricId {
  return value !== null && INNOVATION_METRIC_IDS.includes(value as InnovationMetricId);
}

function daysSince(dateValue: string): number {
  const from = new Date(dateValue);
  const to = new Date();
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function TrendCard({ metric }: { metric: AnyMetric }) {
  return (
    <article className="panel trend-card">
      <header className="trend-card-header">
        <div>
          <p className="kicker">{metric.label}</p>
          <h3>{formatMetricValue(metric, metric.latest.value)}</h3>
        </div>
        <p className="muted">{shortMonthLabel(metric.latest.date)}</p>
      </header>
      <p className="trend-context">{metricHeadline(metric.id as keyof DashboardDataset["metrics"])}</p>

      <div className="delta-row">
        <span>1Y</span>
        <strong className={deltaClass(metric, metric.deltas.oneYear)}>{formatDelta(metric, metric.deltas.oneYear)}</strong>
      </div>
      <div className="delta-row">
        <span>3Y</span>
        <strong className={deltaClass(metric, metric.deltas.threeYear)}>{formatDelta(metric, metric.deltas.threeYear)}</strong>
      </div>
      <div className="delta-row">
        <span>5Y</span>
        <strong className={deltaClass(metric, metric.deltas.fiveYear)}>{formatDelta(metric, metric.deltas.fiveYear)}</strong>
      </div>

      <div className="spark-wrap">
        <ResponsiveContainer width="100%" height={70}>
          <AreaChart data={chartData(metric.sparkline)} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f97316"
              strokeWidth={2}
              fill={`url(#gradient-${metric.id})`}
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function metroMetricValue(value: number, unit: "percent" | "persons"): string {
  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  return formatCompact(value, 1);
}

function MetroCard({
  metro,
  selected,
  onSelect,
}: {
  metro: DashboardDataset["metros"][number];
  selected: boolean;
  onSelect: (metroId: string) => void;
}) {
  const unemploymentYoy = metro.unemploymentRate.deltas.oneYear;
  const laborForceYoy = metro.laborForce.deltas.oneYear;
  const employmentYoy = metro.employmentLevel.deltas.oneYear;

  return (
    <article
      id={`metro-card-${metro.id}`}
      className={clsx("panel", "metro-card", selected && "metro-card-selected")}
      onClick={() => onSelect(metro.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(metro.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Select ${metro.name}`}
    >
      <header className="metro-head">
        <h3>{metro.name}</h3>
        <span className="muted">As of {shortMonthLabel(metro.unemploymentRate.latest.date)}</span>
      </header>

      <div className="metro-grid">
        <div>
          <p className="kicker">Unemployment</p>
          <p className="metro-value">{metroMetricValue(metro.unemploymentRate.latest.value, "percent")}</p>
          <p className={deltaClass({ trendDirection: "down_good" } as AnyMetric, unemploymentYoy)}>
            {formatDelta({ unit: "percent" } as AnyMetric, unemploymentYoy)}
          </p>
        </div>
        <div>
          <p className="kicker">Labor force</p>
          <p className="metro-value">{metroMetricValue(metro.laborForce.latest.value, "persons")}</p>
          <p className={deltaClass({ trendDirection: "up_good" } as AnyMetric, laborForceYoy)}>
            {formatDelta({ unit: "persons" } as AnyMetric, laborForceYoy)}
          </p>
        </div>
        <div>
          <p className="kicker">Employment</p>
          <p className="metro-value">{metroMetricValue(metro.employmentLevel.latest.value, "persons")}</p>
          <p className={deltaClass({ trendDirection: "up_good" } as AnyMetric, employmentYoy)}>
            {formatDelta({ unit: "persons" } as AnyMetric, employmentYoy)}
          </p>
        </div>
      </div>

      <div className="spark-wrap">
        <ResponsiveContainer width="100%" height={70}>
          <AreaChart data={chartData(metro.unemploymentRate.sparkline)} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <Area type="monotone" dataKey="value" stroke="#6b8cff" strokeWidth={2} fill="rgba(107, 140, 255, 0.15)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function SectorList({ title, sectors, tone }: { title: string; sectors: IndustrySector[]; tone: "good" | "bad" }) {
  return (
    <section className="panel sector-list">
      <h3>{title}</h3>
      <ul>
        {sectors.map((sector) => {
          const yoy = sector.deltas.oneYear;
          return (
            <li key={sector.id}>
              <span>{sector.label}</span>
              <strong className={tone === "good" ? "delta-good" : "delta-bad"}>
                {yoy?.percent === null || yoy?.percent === undefined ? "n/a" : `${yoy.percent.toFixed(1)}% YoY`}
              </strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function App() {
  const [dataset, setDataset] = useState<DashboardDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("scorecard");
  const [selectedMetroId, setSelectedMetroId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<MetricId | null>(null);
  const [selectedInnovationMetricId, setSelectedInnovationMetricId] = useState<InnovationMetricId | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceRegion, setResourceRegion] = useState<InnovationResource["region"] | "All">("All");

  useEffect(() => {
    let canceled = false;

    async function load() {
      try {
        const dataUrl = `${import.meta.env.BASE_URL}data/florida-economy.json`;
        const response = await fetch(dataUrl, { cache: "no-cache" });
        if (!response.ok) {
          throw new Error(`Unable to load dataset (${response.status})`);
        }

        const payload = (await response.json()) as DashboardDataset;
        if (!canceled) {
          setDataset(payload);
        }
      } catch (loadError) {
        if (!canceled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error");
        }
      }
    }

    void load();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!dataset) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab");
    const metroFromUrl = params.get("metro");
    const metricFromUrl = params.get("metric");
    const innovationMetricFromUrl = params.get("innovationMetric");

    const validMetro = dataset.metros.some((metro) => metro.id === metroFromUrl) ? metroFromUrl : dataset.metros[0]?.id ?? null;
    const validMetric = isMetricId(metricFromUrl) ? metricFromUrl : dataset.heroMetrics[0];
    const validInnovationMetric = isInnovationMetricId(innovationMetricFromUrl)
      ? innovationMetricFromUrl
      : dataset.innovation.heroMetrics[0];
    const validTab = isTabId(tabFromUrl) ? tabFromUrl : "scorecard";

    setActiveTab(validTab);
    setSelectedMetroId((current) => current ?? validMetro);
    setSelectedMetricId((current) => current ?? validMetric);
    setSelectedInnovationMetricId((current) => current ?? validInnovationMetric);
  }, [dataset]);

  useEffect(() => {
    if (!selectedMetroId || !selectedMetricId || !selectedInnovationMetricId) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    params.set("metro", selectedMetroId);
    params.set("metric", selectedMetricId);
    params.set("innovationMetric", selectedInnovationMetricId);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  }, [activeTab, selectedInnovationMetricId, selectedMetroId, selectedMetricId]);

  const industryBarData = useMemo(() => {
    if (!dataset) {
      return [] as Array<{ sector: string; jobs: number }>;
    }

    return dataset.industry.sectors.map((sector) => ({
      sector: sector.label.replace(" & ", " / ").split(" ").slice(0, 3).join(" "),
      jobs: sector.latest.value * 1000,
    }));
  }, [dataset]);

  const metroComparisonData = useMemo(() => {
    if (!dataset) {
      return [] as Array<{ date: string; label: string; [key: string]: string | number }>;
    }

    const rows = new Map<string, { date: string; label: string; [key: string]: string | number }>();

    for (const metro of dataset.metros) {
      for (const point of metro.unemploymentRate.sparkline) {
        const row = rows.get(point.date) ?? { date: point.date, label: shortMonthLabel(point.date) };
        row[metro.id] = point.value;
        rows.set(point.date, row);
      }
    }

    return [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [dataset]);

  if (error) {
    return (
      <main className="app-shell">
        <div className="error-panel panel">
          <h1>Data load error</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!dataset) {
    return (
      <main className="app-shell">
        <div className="loading panel">
          <h1>Floridanomics Dashboard</h1>
          <p>Loading Florida economic intelligence...</p>
        </div>
      </main>
    );
  }

  const heroMetrics = dataset.heroMetrics.map((metricId) => dataset.metrics[metricId]);
  const selectedMetro = dataset.metros.find((metro) => metro.id === selectedMetroId) ?? dataset.metros[0];
  const selectedMetric = dataset.metrics[selectedMetricId ?? dataset.heroMetrics[0]];
  const innovationHeroMetrics = dataset.innovation.heroMetrics.map((metricId) => dataset.innovation.metrics[metricId]);
  const selectedInnovationMetric =
    dataset.innovation.metrics[selectedInnovationMetricId ?? dataset.innovation.heroMetrics[0]];

  const metricExplorerData = selectedMetric.series.map((point) => ({
    date: point.date,
    label: shortMonthLabel(point.date),
    value: selectedMetric.unit === "thousands_jobs" ? point.value * 1000 : point.value,
  }));

  const innovationExplorerData = selectedInnovationMetric.series.map((point) => ({
    date: point.date,
    label: shortMonthLabel(point.date),
    value:
      selectedInnovationMetric.unit === "thousands_jobs"
        ? point.value * 1000
        : selectedInnovationMetric.unit === "usd_millions"
          ? point.value * 1_000_000
          : point.value,
  }));

  const filteredResources = dataset.innovation.resources.filter((resource) => {
    const regionMatch = resourceRegion === "All" || resource.region === resourceRegion;
    const query = resourceQuery.trim().toLowerCase();
    const queryMatch =
      query.length === 0 ||
      resource.name.toLowerCase().includes(query) ||
      resource.summary.toLowerCase().includes(query) ||
      resource.category.toLowerCase().includes(query);
    return regionMatch && queryMatch;
  });

  const laborDaysOld = daysSince(dataset.metrics.unemploymentRate.latest.date);
  const freshnessClass = laborDaysOld > 120 ? "freshness-stale" : laborDaysOld > 75 ? "freshness-watch" : "freshness-good";
  const dataDownloadUrl = `${import.meta.env.BASE_URL}data/florida-economy.json`;

  function handleMetroSelect(metroId: string) {
    setSelectedMetroId(metroId);

    // Keep the selected metro card in view when selected from the map.
    window.requestAnimationFrame(() => {
      document.getElementById(`metro-card-${metroId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  async function handleShareView() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState("copied");
    } catch {
      setShareState("error");
    }

    window.setTimeout(() => {
      setShareState("idle");
    }, 2200);
  }

  return (
    <main className="app-shell">
      <div className="sun-layer" />
      <section className="hero panel">
        <div>
          <p className="eyebrow">Floridanomics Dashboard MVP</p>
          <h1>Florida&apos;s economy is not an accident. It is a model.</h1>
          <p className="lede">
            A focused read on labor momentum, sector depth, metro strength, and demographic scale across the Sunshine
            State.
          </p>
        </div>
        <div className="hero-meta">
          <p>
            <span>Labor as of</span>
            <strong>{dataset.asOfLaborMarket}</strong>
          </p>
          <p>
            <span>Population as of</span>
            <strong>{dataset.asOfPopulation}</strong>
          </p>
          <p>
            <span>Last refresh</span>
            <strong>{new Date(dataset.generatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</strong>
          </p>
          <div className="hero-actions">
            <button type="button" className="action-button" onClick={handleShareView}>
              {shareState === "copied" ? "Link copied" : shareState === "error" ? "Copy failed" : "Share view"}
            </button>
            <a className="action-button action-link" href={dataDownloadUrl} download>
              Download data
            </a>
          </div>
        </div>
      </section>

      <section className="tab-switch panel">
        <button
          type="button"
          className={clsx("tab-button", activeTab === "scorecard" && "tab-button-active")}
          onClick={() => setActiveTab("scorecard")}
        >
          Florida Scorecard
        </button>
        <button
          type="button"
          className={clsx("tab-button", activeTab === "innovation" && "tab-button-active")}
          onClick={() => setActiveTab("innovation")}
        >
          Innovation + Economic Development
        </button>
      </section>

      {activeTab === "scorecard" && (
        <>

      <section className="grid hero-grid">
        {heroMetrics.map((metric) => (
          <article className="panel hero-card" key={metric.id}>
            <p className="kicker">{metric.label}</p>
            <h2>{formatMetricValue(metric, metric.latest.value)}</h2>
            <p className={deltaClass(metric, metric.deltas.oneYear)}>1Y: {formatDelta(metric, metric.deltas.oneYear)}</p>
          </article>
        ))}
      </section>

      <section className={clsx("panel", "freshness-panel", freshnessClass)}>
        <div>
          <p className="kicker">Data freshness</p>
          <h3>{laborDaysOld} days since latest labor release</h3>
          <p className="muted">
            Latest labor reading: {dataset.asOfLaborMarket}. Population anchor: {dataset.asOfPopulation}.
          </p>
        </div>
        <p className="freshness-note">
          {laborDaysOld > 120
            ? "Release lag is elevated; confirm publication calendars before public briefing."
            : "Current release cadence is within expected public-data timing windows."}
        </p>
      </section>

      <section className="section-head">
        <h2>Trend Cards</h2>
        <p>Current signal plus 1Y, 3Y, and 5Y context for Florida&apos;s core economic stack.</p>
      </section>
      <section className="grid trend-grid">
        {heroMetrics.map((metric) => (
          <TrendCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="section-head">
        <h2>Statewide Trend Explorer</h2>
        <p>Switch core metrics and inspect full-history context behind the headline cards.</p>
      </section>
      <section className="panel explorer-panel">
        <div className="explorer-toolbar">
          {METRIC_IDS.map((metricId) => (
            <button
              type="button"
              key={metricId}
              className={clsx("metric-toggle", selectedMetric.id === metricId && "metric-toggle-active")}
              onClick={() => setSelectedMetricId(metricId)}
            >
              {dataset.metrics[metricId].label}
            </button>
          ))}
        </div>

        <div className="explorer-headline">
          <div>
            <p className="kicker">Selected metric</p>
            <h3>{selectedMetric.label}</h3>
            <p className="explorer-value">{formatMetricValue(selectedMetric, selectedMetric.latest.value)}</p>
          </div>
          <div className="explorer-deltas">
            <p className={deltaClass(selectedMetric, selectedMetric.deltas.oneYear)}>
              1Y: {formatDelta(selectedMetric, selectedMetric.deltas.oneYear)}
            </p>
            <p className={deltaClass(selectedMetric, selectedMetric.deltas.threeYear)}>
              3Y: {formatDelta(selectedMetric, selectedMetric.deltas.threeYear)}
            </p>
            <p className={deltaClass(selectedMetric, selectedMetric.deltas.fiveYear)}>
              5Y: {formatDelta(selectedMetric, selectedMetric.deltas.fiveYear)}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metricExplorerData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(149, 163, 191, 0.2)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#a9b9dd", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#a9b9dd", fontSize: 11 }}
              tickFormatter={(value) =>
                selectedMetric.unit === "percent" ? `${Number(value).toFixed(1)}%` : formatCompact(Number(value), 0)
              }
            />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#fb923c" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="section-head">
        <h2>Industry Employment</h2>
        <p>Major sectors by size and direction, highlighting where momentum is strongest and where it is softer.</p>
      </section>
      <section className="industry-layout">
        <article className="panel industry-chart">
          <h3>Florida Jobs by Major Sector</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={industryBarData} margin={{ top: 16, right: 8, left: 0, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(149, 163, 191, 0.2)" />
              <XAxis dataKey="sector" angle={-26} textAnchor="end" interval={0} tick={{ fill: "#a9b9dd", fontSize: 10 }} />
              <YAxis tickFormatter={(value) => formatCompact(Number(value), 0)} tick={{ fill: "#a9b9dd", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jobs" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <SectorList title="Strongest growers" sectors={dataset.industry.strongestGrowers} tone="good" />
        <SectorList title="Watch list" sectors={dataset.industry.laggards} tone="bad" />
      </section>

      <section className="industry-cards">
        {dataset.industry.sectors.map((sector) => (
          <article className="panel sector-card" key={sector.id}>
            <h3>{sector.label}</h3>
            <p className="sector-value">{formatCompact(sector.latest.value * 1000)} jobs</p>
            <p className={deltaClass({ trendDirection: "up_good" } as AnyMetric, sector.deltas.oneYear)}>
              1Y: {formatDelta({ unit: "thousands_jobs" } as AnyMetric, sector.deltas.oneYear)}
            </p>
            <div className="spark-wrap">
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={chartData(sector.sparkline)}>
                  <Area type="monotone" dataKey="value" stroke="#a5b4fc" fill="rgba(165, 180, 252, 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        ))}
      </section>

      <section className="section-head">
        <h2>MSA Map Navigator</h2>
        <p>Click a metro on the map to focus and highlight its snapshot card.</p>
      </section>
      <section className="map-layout">
        <FloridaMsaMap
          metros={dataset.metros.map((metro) => ({ id: metro.id, name: metro.name }))}
          selectedMetroId={selectedMetro.id}
          onSelectMetro={handleMetroSelect}
        />
        <article className="panel map-focus-panel">
          <p className="kicker">Selected metro</p>
          <h3>{selectedMetro.name}</h3>
          <div className="map-focus-grid">
            <div>
              <p className="kicker">Unemployment</p>
              <p className="metro-value">{metroMetricValue(selectedMetro.unemploymentRate.latest.value, "percent")}</p>
              <p className={deltaClass({ trendDirection: "down_good" } as AnyMetric, selectedMetro.unemploymentRate.deltas.oneYear)}>
                1Y: {formatDelta({ unit: "percent" } as AnyMetric, selectedMetro.unemploymentRate.deltas.oneYear)}
              </p>
            </div>
            <div>
              <p className="kicker">Labor force</p>
              <p className="metro-value">{metroMetricValue(selectedMetro.laborForce.latest.value, "persons")}</p>
              <p className={deltaClass({ trendDirection: "up_good" } as AnyMetric, selectedMetro.laborForce.deltas.oneYear)}>
                1Y: {formatDelta({ unit: "persons" } as AnyMetric, selectedMetro.laborForce.deltas.oneYear)}
              </p>
            </div>
            <div>
              <p className="kicker">Employment</p>
              <p className="metro-value">{metroMetricValue(selectedMetro.employmentLevel.latest.value, "persons")}</p>
              <p className={deltaClass({ trendDirection: "up_good" } as AnyMetric, selectedMetro.employmentLevel.deltas.oneYear)}>
                1Y: {formatDelta({ unit: "persons" } as AnyMetric, selectedMetro.employmentLevel.deltas.oneYear)}
              </p>
            </div>
          </div>
          <p className="map-focus-note">Tip: click any metro card below or map marker to switch focus.</p>
        </article>
      </section>

      <section className="panel metro-compare-panel">
        <div className="metro-compare-head">
          <div>
            <p className="kicker">Metro comparison</p>
            <h3>Unemployment trend by major Florida MSA</h3>
          </div>
          <p className="muted">Click map markers or cards to highlight one metro line.</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={metroComparisonData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(149, 163, 191, 0.2)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#a9b9dd", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a9b9dd", fontSize: 11 }} tickFormatter={(value) => `${Number(value).toFixed(1)}%`} />
            <Tooltip />
            <Legend />
            {dataset.metros.map((metro) => (
              <Line
                key={metro.id}
                type="monotone"
                dataKey={metro.id}
                name={metro.name.replace(" MSA", "")}
                stroke={METRO_COLORS[metro.id as keyof typeof METRO_COLORS] ?? "#cbd5e1"}
                strokeWidth={metro.id === selectedMetro.id ? 3.2 : 1.8}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="section-head">
        <h2>Metro Snapshots</h2>
        <p>Miami, Tampa, Orlando, and Jacksonville labor reads with compact trend context.</p>
      </section>
      <section className="grid metro-grid-wrap">
        {dataset.metros.map((metro) => (
          <MetroCard key={metro.id} metro={metro} selected={metro.id === selectedMetro.id} onSelect={handleMetroSelect} />
        ))}
      </section>

      <section className="section-head">
        <h2>Narrative</h2>
        <p>Rules-based translation of the data into plain-English briefings.</p>
      </section>
      <section className="panel narrative">
        <h3>{dataset.narrative.headline}</h3>
        <div className="narrative-grid">
          <div>
            <h4>What stands out</h4>
            <ul>
              {dataset.narrative.whatStandsOut.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Improving</h4>
            <ul>
              {dataset.narrative.improving.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Softening</h4>
            <ul>
              {dataset.narrative.softening.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Why it matters</h4>
            <ul>
              {dataset.narrative.whyItMatters.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
        </>
      )}

      {activeTab === "innovation" && (
        <>
          <section className="grid hero-grid">
            {innovationHeroMetrics.map((metric) => (
              <article className="panel hero-card" key={metric.id}>
                <p className="kicker">{metric.label}</p>
                <h2>{formatMetricValue(metric, metric.latest.value)}</h2>
                <p className={deltaClass(metric, metric.deltas.oneYear)}>
                  1Y: {formatDelta(metric, metric.deltas.oneYear)}
                </p>
              </article>
            ))}
          </section>

          <section className="section-head">
            <h2>Innovation Signal Explorer</h2>
            <p>Track business formation, advanced-industry jobs, and output momentum across Florida.</p>
          </section>
          <section className="panel explorer-panel">
            <div className="explorer-toolbar">
              {INNOVATION_METRIC_IDS.map((metricId) => (
                <button
                  type="button"
                  key={metricId}
                  className={clsx("metric-toggle", selectedInnovationMetric.id === metricId && "metric-toggle-active")}
                  onClick={() => setSelectedInnovationMetricId(metricId)}
                >
                  {dataset.innovation.metrics[metricId].label}
                </button>
              ))}
            </div>

            <div className="explorer-headline">
              <div>
                <p className="kicker">Selected innovation metric</p>
                <h3>{selectedInnovationMetric.label}</h3>
                <p className="explorer-value">{formatMetricValue(selectedInnovationMetric, selectedInnovationMetric.latest.value)}</p>
              </div>
              <div className="explorer-deltas">
                <p className={deltaClass(selectedInnovationMetric, selectedInnovationMetric.deltas.oneYear)}>
                  1Y: {formatDelta(selectedInnovationMetric, selectedInnovationMetric.deltas.oneYear)}
                </p>
                <p className={deltaClass(selectedInnovationMetric, selectedInnovationMetric.deltas.threeYear)}>
                  3Y: {formatDelta(selectedInnovationMetric, selectedInnovationMetric.deltas.threeYear)}
                </p>
                <p className={deltaClass(selectedInnovationMetric, selectedInnovationMetric.deltas.fiveYear)}>
                  5Y: {formatDelta(selectedInnovationMetric, selectedInnovationMetric.deltas.fiveYear)}
                </p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={innovationExplorerData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(149, 163, 191, 0.2)" />
                <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#a9b9dd", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "#a9b9dd", fontSize: 11 }}
                  tickFormatter={(value) =>
                    selectedInnovationMetric.unit === "percent"
                      ? `${Number(value).toFixed(1)}%`
                      : selectedInnovationMetric.unit === "usd_millions"
                        ? `$${formatCompact(Number(value), 0)}`
                        : formatCompact(Number(value), 0)
                  }
                />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#fb923c" strokeWidth={2.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="panel innovation-narrative">
            <h3>{dataset.innovation.narrative.headline}</h3>
            <div className="narrative-grid">
              <div>
                <h4>Signals</h4>
                <ul>
                  {dataset.innovation.narrative.signals.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Development Engine</h4>
                <ul>
                  {dataset.innovation.narrative.development.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Momentum</h4>
                <ul>
                  {dataset.innovation.narrative.momentum.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="section-head">
            <h2>Florida Innovation Resource Atlas</h2>
            <p>Statewide and metro innovation/economic-development resources inspired by your Miami model.</p>
          </section>
          <section className="panel resource-controls">
            <input
              className="resource-input"
              type="search"
              placeholder="Search resources (capital, programs, ecosystem...)"
              value={resourceQuery}
              onChange={(event) => setResourceQuery(event.target.value)}
            />
            <div className="resource-region-row">
              {(["All", "Statewide", "Miami", "Tampa Bay", "Orlando", "Jacksonville"] as const).map((region) => (
                <button
                  key={region}
                  type="button"
                  className={clsx("metric-toggle", resourceRegion === region && "metric-toggle-active")}
                  onClick={() => setResourceRegion(region)}
                >
                  {region}
                </button>
              ))}
            </div>
          </section>

          <section className="resource-grid">
            {filteredResources.length === 0 && (
              <article className="panel resource-card">
                <h3>No resources matched this filter.</h3>
                <p className="resource-summary">Try clearing the search text or selecting a broader region.</p>
              </article>
            )}
            {filteredResources.map((resource) => (
              <article key={resource.id} className="panel resource-card">
                <p className="kicker">{resource.region}</p>
                <h3>{resource.name}</h3>
                <p className="resource-category">{resource.category}</p>
                <p className="resource-summary">{resource.summary}</p>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  Open resource
                </a>
              </article>
            ))}
          </section>
        </>
      )}

      <footer className="panel sources">
        <h3>Sources</h3>
        <ul>
          {dataset.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
              <span>{source.notes}</span>
            </li>
          ))}
        </ul>
      </footer>
    </main>
  );
}

export default App;
