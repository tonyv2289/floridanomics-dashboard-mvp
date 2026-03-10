import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardDataset, Delta, IndustrySector, Metric, PopulationMetric, TimePoint } from "./types/dashboard";
import "./App.css";

type AnyMetric = Metric | PopulationMetric;

function displayValue(metric: AnyMetric, rawValue: number): number {
  if (metric.unit === "thousands_jobs") {
    return rawValue * 1000;
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

function MetroCard({ metro }: { metro: DashboardDataset["metros"][number] }) {
  const unemploymentYoy = metro.unemploymentRate.deltas.oneYear;
  const laborForceYoy = metro.laborForce.deltas.oneYear;
  const employmentYoy = metro.employmentLevel.deltas.oneYear;

  return (
    <article className="panel metro-card">
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

  const industryBarData = useMemo(() => {
    if (!dataset) {
      return [] as Array<{ sector: string; jobs: number }>;
    }

    return dataset.industry.sectors.map((sector) => ({
      sector: sector.label.replace(" & ", " / ").split(" ").slice(0, 3).join(" "),
      jobs: sector.latest.value * 1000,
    }));
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
        </div>
      </section>

      <section className="grid hero-grid">
        {heroMetrics.map((metric) => (
          <article className="panel hero-card" key={metric.id}>
            <p className="kicker">{metric.label}</p>
            <h2>{formatMetricValue(metric, metric.latest.value)}</h2>
            <p className={deltaClass(metric, metric.deltas.oneYear)}>1Y: {formatDelta(metric, metric.deltas.oneYear)}</p>
          </article>
        ))}
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
        <h2>Metro Snapshots</h2>
        <p>Miami, Tampa, Orlando, and Jacksonville labor reads with compact trend context.</p>
      </section>
      <section className="grid metro-grid-wrap">
        {dataset.metros.map((metro) => (
          <MetroCard key={metro.id} metro={metro} />
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
