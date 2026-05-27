import { startTransition, useDeferredValue, useEffect, useState } from "react";
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
import { FloridaMsaMap } from "../components/FloridaMsaMap";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  CORE_METRIC_IDS,
  DASHBOARD_TABS,
  INNOVATION_METRIC_IDS,
  type AnyMetric,
  type CoreMetricId,
  type DashboardLead,
  type DashboardTabId,
  buildInnovationLead,
  buildMetroComparisonData,
  buildScorecardLead,
  buildTradeLead,
  chartSeries,
  daysSince,
  deltaTone,
  formatCompact,
  formatDateLabel,
  formatDelta,
  formatMetricValue,
  formatSignedPercent,
  formatSignedUsdBillions,
  formatTradeHero,
  formatUsdMillions,
  isCoreMetricId,
  isDashboardTabId,
  isInnovationMetricId,
  shortMonthLabel,
} from "../lib/dashboard";
import type { DashboardDataset, InnovationMetricId, InnovationResource } from "../types/dashboard";
import "./dashboard-v2.css";

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(7, 17, 28, 0.96)",
  border: "1px solid rgba(154, 177, 193, 0.24)",
  borderRadius: "16px",
  boxShadow: "0 18px 40px rgba(2, 8, 16, 0.36)",
  color: "#f6f0e6",
};

const TOOLTIP_LABEL_STYLE = {
  color: "#f6f0e6",
  fontWeight: 700,
};

const TOOLTIP_ITEM_STYLE = {
  color: "#d9d0c3",
};

const PERCENT_DOWN_GOOD = {
  unit: "percent",
  trendDirection: "down_good",
} as AnyMetric;

const PERSONS_UP_GOOD = {
  unit: "persons",
  trendDirection: "up_good",
} as AnyMetric;

const JOBS_UP_GOOD = {
  unit: "thousands_jobs",
  trendDirection: "up_good",
} as AnyMetric;

function readSearchParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

function formatAxisValue(metric: AnyMetric, value: number): string {
  if (metric.unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  if (metric.unit === "usd_millions") {
    return `$${formatCompact(value, 1)}`;
  }

  return formatCompact(value, 1);
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="v2-section-head">
      <p className="v2-section-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

function LeadStory({ lead }: { lead: DashboardLead }) {
  return (
    <section className="v2-lead-layout">
      <article className="v2-panel v2-lead-card">
        <p className="v2-section-kicker">{lead.eyebrow}</p>
        <div className={clsx("v2-lead-value", `tone-${lead.tone}`)}>{lead.value}</div>
        <h2 className="v2-lead-title">{lead.title}</h2>
        <p className="v2-copy">{lead.summary}</p>
        <div className="v2-inline-meta">
          <span>{lead.source}</span>
          {lead.nextRelease ? (
            <>
              <span className="v2-dot">·</span>
              <span>{lead.nextRelease}</span>
            </>
          ) : null}
        </div>
      </article>

      <article className="v2-panel v2-chip-card">
        <p className="v2-section-kicker">Supporting context</p>
        <div className="v2-chip-grid">
          {lead.chips.map((chip) => (
            <div key={chip.label} className="v2-chip">
              <span>{chip.label}</span>
              <strong className={clsx(chip.tone && `tone-${chip.tone}`)}>{chip.value}</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function SignalCard({
  label,
  value,
  context,
  tone = "neutral",
}: {
  label: string;
  value: string;
  context: string;
  tone?: "good" | "warn" | "neutral";
}) {
  return (
    <article className={clsx("v2-panel", "v2-signal-card", `tone-${tone}`)}>
      <p className="v2-card-label">{label}</p>
      <h3>{value}</h3>
      <p className="v2-card-context">{context}</p>
    </article>
  );
}

function NarrativePanel({
  eyebrow,
  headline,
  sections,
}: {
  eyebrow: string;
  headline: string;
  sections: Array<{ label: string; items: string[] }>;
}) {
  return (
    <section className="v2-panel v2-narrative-panel">
      <p className="v2-section-kicker">{eyebrow}</p>
      <h2 className="v2-panel-title">{headline}</h2>
      <div className="v2-narrative-grid">
        {sections.map((section) => (
          <div key={section.label} className="v2-narrative-block">
            <h3>{section.label}</h3>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
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
  return (
    <article
      className={clsx("v2-panel", "v2-metro-card", selected && "is-selected")}
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
      <header className="v2-metro-head">
        <h3>{metro.name}</h3>
        <span>{shortMonthLabel(metro.unemploymentRate.latest.date)}</span>
      </header>

      <div className="v2-metro-stats">
        <div>
          <p className="v2-card-label">Unemployment</p>
          <strong>{metro.unemploymentRate.latest.value.toFixed(1)}%</strong>
          <span className={clsx("v2-card-context", `tone-${deltaTone(PERCENT_DOWN_GOOD, metro.unemploymentRate.deltas.oneYear)}`)}>
            {formatDelta(PERCENT_DOWN_GOOD, metro.unemploymentRate.deltas.oneYear)}
          </span>
        </div>
        <div>
          <p className="v2-card-label">Labor force</p>
          <strong>{formatCompact(metro.laborForce.latest.value, 1)}</strong>
          <span className={clsx("v2-card-context", `tone-${deltaTone(PERSONS_UP_GOOD, metro.laborForce.deltas.oneYear)}`)}>
            {formatDelta(PERSONS_UP_GOOD, metro.laborForce.deltas.oneYear)}
          </span>
        </div>
        <div>
          <p className="v2-card-label">Employment</p>
          <strong>{formatCompact(metro.employmentLevel.latest.value, 1)}</strong>
          <span className={clsx("v2-card-context", `tone-${deltaTone(PERSONS_UP_GOOD, metro.employmentLevel.deltas.oneYear)}`)}>
            {formatDelta(PERSONS_UP_GOOD, metro.employmentLevel.deltas.oneYear)}
          </span>
        </div>
      </div>
    </article>
  );
}

function ScorecardTab({
  dataset,
  selectedMetricId,
  onMetricChange,
  selectedMetroId,
  onMetroChange,
}: {
  dataset: DashboardDataset;
  selectedMetricId: CoreMetricId;
  onMetricChange: (metricId: CoreMetricId) => void;
  selectedMetroId: string;
  onMetroChange: (metroId: string) => void;
}) {
  const lead = buildScorecardLead(dataset);
  const selectedMetric = dataset.metrics[selectedMetricId];
  const selectedMetro = dataset.metros.find((metro) => metro.id === selectedMetroId) ?? dataset.metros[0];
  const metroComparisonData = buildMetroComparisonData(dataset);
  const laborDataAge = daysSince(dataset.metrics.unemploymentRate.latest.date);

  return (
    <>
      <LeadStory lead={lead} />

      <section className="v2-signal-rail">
        {dataset.heroMetrics.map((metricId) => {
          const metric = dataset.metrics[metricId];
          return (
            <SignalCard
              key={metric.id}
              label={metric.label}
              value={formatMetricValue(metric, metric.latest.value)}
              context={`1Y ${formatDelta(metric, metric.deltas.oneYear)}`}
              tone={deltaTone(metric, metric.deltas.oneYear)}
            />
          );
        })}
      </section>

      <div className="v2-grid-two">
        <section className="v2-panel">
          <SectionIntro
            eyebrow="Statewide trend"
            title="Follow the metric before you over-interpret the story."
            description="The point of the scorecard is to let one metric take the lead, then read the deltas in context."
          />

          <div className="v2-toggle-row">
            {CORE_METRIC_IDS.map((metricId) => (
              <button
                key={metricId}
                type="button"
                className={clsx("v2-toggle", selectedMetricId === metricId && "is-active")}
                onClick={() => startTransition(() => onMetricChange(metricId))}
              >
                {dataset.metrics[metricId].label}
              </button>
            ))}
          </div>

          <div className="v2-chart-head">
            <div>
              <p className="v2-card-label">Selected metric</p>
              <h3>{selectedMetric.label}</h3>
              <p className="v2-chart-value">{formatMetricValue(selectedMetric, selectedMetric.latest.value)}</p>
            </div>
            <div className="v2-delta-stack">
              <span className={clsx(`tone-${deltaTone(selectedMetric, selectedMetric.deltas.oneYear)}`)}>
                1Y {formatDelta(selectedMetric, selectedMetric.deltas.oneYear)}
              </span>
              <span className={clsx(`tone-${deltaTone(selectedMetric, selectedMetric.deltas.threeYear)}`)}>
                3Y {formatDelta(selectedMetric, selectedMetric.deltas.threeYear)}
              </span>
              <span className={clsx(`tone-${deltaTone(selectedMetric, selectedMetric.deltas.fiveYear)}`)}>
                5Y {formatDelta(selectedMetric, selectedMetric.deltas.fiveYear)}
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartSeries(selectedMetric)} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(154, 177, 193, 0.14)" />
              <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#93a8b6", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "#93a8b6", fontSize: 11 }}
                tickFormatter={(value) => formatAxisValue(selectedMetric, Number(value))}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ stroke: "rgba(255, 154, 61, 0.32)", strokeDasharray: "4 4" }}
                formatter={(value) => [formatMetricValue(selectedMetric, Number(value)), selectedMetric.label]}
              />
              <Line type="monotone" dataKey="value" stroke="#ff9a3d" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <NarrativePanel
          eyebrow="Editorial read"
          headline={dataset.narrative.headline}
          sections={[
            { label: "What stands out", items: dataset.narrative.whatStandsOut },
            { label: "What's improving", items: dataset.narrative.improving },
            { label: "What's softening", items: dataset.narrative.softening },
            { label: "Why it matters", items: dataset.narrative.whyItMatters },
          ]}
        />
      </div>

      <div className="v2-grid-two">
        <section className="v2-panel">
          <SectionIntro
            eyebrow="Industry mix"
            title="The composition of growth matters as much as the size of growth."
            description="A first-principles dashboard should show who is driving the labor market, not just whether the state is up or down."
          />

          <div className="v2-industry-table">
            {dataset.industry.sectors.map((sector) => (
              <div key={sector.id} className="v2-table-row">
                <div>
                  <p className="v2-card-label">{sector.label}</p>
                  <strong>{formatCompact(sector.latest.value * 1000, 1)} jobs</strong>
                </div>
                <span className={clsx(`tone-${deltaTone(JOBS_UP_GOOD, sector.deltas.oneYear)}`)}>
                  {formatDelta(JOBS_UP_GOOD, sector.deltas.oneYear)}
                </span>
              </div>
            ))}
          </div>

          <div className="v2-mini-grid">
            <div className="v2-mini-list">
              <h3>Strongest growers</h3>
              <ul>
                {dataset.industry.strongestGrowers.map((sector) => (
                  <li key={sector.id}>
                    <span>{sector.label}</span>
                    <strong>{sector.deltas.oneYear?.percent?.toFixed(1) ?? "n/a"}% YoY</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="v2-mini-list">
              <h3>Watch list</h3>
              <ul>
                {dataset.industry.laggards.map((sector) => (
                  <li key={sector.id}>
                    <span>{sector.label}</span>
                    <strong>{sector.deltas.oneYear?.percent?.toFixed(1) ?? "n/a"}% YoY</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="v2-map-stack">
          <FloridaMsaMap
            metros={dataset.metros.map((metro) => ({ id: metro.id, name: metro.name }))}
            selectedMetroId={selectedMetro.id}
            onSelectMetro={onMetroChange}
          />

          <article className="v2-panel">
            <SectionIntro
              eyebrow="Metro pulse"
              title={`${selectedMetro.name} is the selected local read.`}
              description="The statewide story is real, but operators act inside metro labor markets."
            />

            <div className="v2-selected-metro-grid">
              <div>
                <p className="v2-card-label">Unemployment</p>
                <strong>{selectedMetro.unemploymentRate.latest.value.toFixed(1)}%</strong>
                <span className={clsx(`tone-${deltaTone(PERCENT_DOWN_GOOD, selectedMetro.unemploymentRate.deltas.oneYear)}`)}>
                  {formatDelta(PERCENT_DOWN_GOOD, selectedMetro.unemploymentRate.deltas.oneYear)}
                </span>
              </div>
              <div>
                <p className="v2-card-label">Labor force</p>
                <strong>{formatCompact(selectedMetro.laborForce.latest.value, 1)}</strong>
                <span className={clsx(`tone-${deltaTone(PERSONS_UP_GOOD, selectedMetro.laborForce.deltas.oneYear)}`)}>
                  {formatDelta(PERSONS_UP_GOOD, selectedMetro.laborForce.deltas.oneYear)}
                </span>
              </div>
              <div>
                <p className="v2-card-label">Employment</p>
                <strong>{formatCompact(selectedMetro.employmentLevel.latest.value, 1)}</strong>
                <span className={clsx(`tone-${deltaTone(PERSONS_UP_GOOD, selectedMetro.employmentLevel.deltas.oneYear)}`)}>
                  {formatDelta(PERSONS_UP_GOOD, selectedMetro.employmentLevel.deltas.oneYear)}
                </span>
              </div>
            </div>

            <p className="v2-note">
              Labor-market freshness: {laborDataAge} days since the latest statewide unemployment observation.
            </p>
          </article>
        </section>
      </div>

      <section className="v2-panel">
        <SectionIntro
          eyebrow="Metro comparison"
          title="Major metros are telling slightly different labor stories."
          description="Jacksonville and Tampa are weaker than Miami right now, which matters if your Florida thesis depends on one geography."
        />

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={metroComparisonData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(154, 177, 193, 0.14)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#93a8b6", fontSize: 11 }} />
            <YAxis tick={{ fill: "#93a8b6", fontSize: 11 }} tickFormatter={(value) => `${Number(value).toFixed(1)}%`} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ stroke: "rgba(255, 154, 61, 0.32)", strokeDasharray: "4 4" }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "Unemployment"]}
            />
            {dataset.metros.map((metro) => (
              <Line
                key={metro.id}
                type="monotone"
                dataKey={metro.id}
                name={metro.name}
                stroke={metro.id === selectedMetro.id ? "#ff9a3d" : "rgba(154, 177, 193, 0.38)"}
                strokeWidth={metro.id === selectedMetro.id ? 3 : 1.6}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="v2-card-grid">
        {dataset.metros.map((metro) => (
          <MetroCard key={metro.id} metro={metro} selected={metro.id === selectedMetro.id} onSelect={onMetroChange} />
        ))}
      </section>
    </>
  );
}

function InnovationTab({
  dataset,
  selectedMetricId,
  onMetricChange,
  resourceQuery,
  onResourceQueryChange,
  resourceRegion,
  onResourceRegionChange,
}: {
  dataset: DashboardDataset;
  selectedMetricId: InnovationMetricId;
  onMetricChange: (metricId: InnovationMetricId) => void;
  resourceQuery: string;
  onResourceQueryChange: (value: string) => void;
  resourceRegion: InnovationResource["region"] | "All";
  onResourceRegionChange: (region: InnovationResource["region"] | "All") => void;
}) {
  const lead = buildInnovationLead(dataset);
  const selectedMetric = dataset.innovation.metrics[selectedMetricId];
  const deferredQuery = useDeferredValue(resourceQuery);
  const filteredResources = dataset.innovation.resources.filter((resource) => {
    const query = deferredQuery.trim().toLowerCase();
    const matchesRegion = resourceRegion === "All" || resource.region === resourceRegion;
    const matchesQuery =
      query.length === 0 ||
      resource.name.toLowerCase().includes(query) ||
      resource.summary.toLowerCase().includes(query) ||
      resource.category.toLowerCase().includes(query);

    return matchesRegion && matchesQuery;
  });

  return (
    <>
      <LeadStory lead={lead} />

      <section className="v2-signal-rail">
        {dataset.innovation.heroMetrics.map((metricId) => {
          const metric = dataset.innovation.metrics[metricId];
          return (
            <SignalCard
              key={metric.id}
              label={metric.label}
              value={formatMetricValue(metric, metric.latest.value)}
              context={`1Y ${formatDelta(metric, metric.deltas.oneYear)}`}
              tone={deltaTone(metric, metric.deltas.oneYear)}
            />
          );
        })}
      </section>

      <div className="v2-grid-two">
        <section className="v2-panel">
          <SectionIntro
            eyebrow="Signal explorer"
            title="Innovation needs a focal metric, not five equal-weight cards."
            description="Switch the lead metric to see whether formation, employment, or output is actually carrying the thesis."
          />

          <div className="v2-toggle-row">
            {INNOVATION_METRIC_IDS.map((metricId) => (
              <button
                key={metricId}
                type="button"
                className={clsx("v2-toggle", selectedMetricId === metricId && "is-active")}
                onClick={() => startTransition(() => onMetricChange(metricId))}
              >
                {dataset.innovation.metrics[metricId].label}
              </button>
            ))}
          </div>

          <div className="v2-chart-head">
            <div>
              <p className="v2-card-label">Selected signal</p>
              <h3>{selectedMetric.label}</h3>
              <p className="v2-chart-value">{formatMetricValue(selectedMetric, selectedMetric.latest.value)}</p>
            </div>
            <div className="v2-delta-stack">
              <span className={clsx(`tone-${deltaTone(selectedMetric, selectedMetric.deltas.oneYear)}`)}>
                1Y {formatDelta(selectedMetric, selectedMetric.deltas.oneYear)}
              </span>
              <span className={clsx(`tone-${deltaTone(selectedMetric, selectedMetric.deltas.threeYear)}`)}>
                3Y {formatDelta(selectedMetric, selectedMetric.deltas.threeYear)}
              </span>
              <span className={clsx(`tone-${deltaTone(selectedMetric, selectedMetric.deltas.fiveYear)}`)}>
                5Y {formatDelta(selectedMetric, selectedMetric.deltas.fiveYear)}
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartSeries(selectedMetric)} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(154, 177, 193, 0.14)" />
              <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#93a8b6", fontSize: 11 }} />
              <YAxis tick={{ fill: "#93a8b6", fontSize: 11 }} tickFormatter={(value) => formatAxisValue(selectedMetric, Number(value))} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ stroke: "rgba(91, 198, 255, 0.32)", strokeDasharray: "4 4" }}
                formatter={(value) => [formatMetricValue(selectedMetric, Number(value)), selectedMetric.label]}
              />
              <Line type="monotone" dataKey="value" stroke="#5bc6ff" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <NarrativePanel
          eyebrow="Innovation memo"
          headline={dataset.innovation.narrative.headline}
          sections={[
            { label: "Signals", items: dataset.innovation.narrative.signals },
            { label: "Development engine", items: dataset.innovation.narrative.development },
            { label: "Momentum", items: dataset.innovation.narrative.momentum },
          ]}
        />
      </div>

      <section className="v2-panel">
        <SectionIntro
          eyebrow="Resource atlas"
          title="If the thesis is real, the support stack should be easy to inspect."
          description="This rewrite keeps the directory, but treats it like a searchable operating system instead of a pile of equal cards."
        />

        <div className="v2-resource-toolbar">
          <input
            className="v2-resource-input"
            type="search"
            placeholder="Search capital, programs, ecosystem, infrastructure..."
            value={resourceQuery}
            onChange={(event) => onResourceQueryChange(event.target.value)}
          />

          <div className="v2-toggle-row">
            {(["All", "Statewide", "Miami", "Tampa Bay", "Orlando", "Jacksonville"] as const).map((region) => (
              <button
                key={region}
                type="button"
                className={clsx("v2-toggle", resourceRegion === region && "is-active")}
                onClick={() => startTransition(() => onResourceRegionChange(region))}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div className="v2-resource-grid">
          {filteredResources.length === 0 ? (
            <article className="v2-resource-card v2-panel">
              <h3>No resources matched that filter.</h3>
              <p className="v2-card-context">Try broadening the region or clearing the search term.</p>
            </article>
          ) : null}

          {filteredResources.map((resource) => (
            <article key={resource.id} className="v2-resource-card v2-panel">
              <p className="v2-card-label">{resource.region}</p>
              <h3>{resource.name}</h3>
              <p className="v2-resource-category">{resource.category}</p>
              <p className="v2-copy">{resource.summary}</p>
              <a href={resource.url} target="_blank" rel="noreferrer">
                Open resource
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function TradeTab({ dataset }: { dataset: DashboardDataset }) {
  const lead = buildTradeLead(dataset);

  return (
    <>
      <LeadStory lead={lead} />

      <section className="v2-signal-rail">
        {dataset.trade.heroMetrics.map((metric) => (
          <SignalCard
            key={metric.id}
            label={metric.label}
            value={formatTradeHero(metric.value, metric.unit)}
            context={metric.helper}
            tone="neutral"
          />
        ))}
      </section>

      <section className="v2-card-grid">
        {dataset.trade.deltas.map((delta) => (
          <article key={delta.id} className="v2-panel v2-signal-card">
            <p className="v2-card-label">{delta.label}</p>
            <h3 className={clsx(delta.percent !== null && delta.percent >= 0 ? "tone-good" : "tone-warn")}>
              {delta.absolute !== null ? formatSignedUsdBillions(delta.absolute) : formatSignedPercent(delta.percent)}
            </h3>
            <p className="v2-card-context">{delta.baseLabel}</p>
          </article>
        ))}
      </section>

      <div className="v2-grid-two">
        <section className="v2-panel">
          <SectionIntro
            eyebrow="Gateway markets"
            title="Florida wins because its trade map points south as much as it points north."
            description="The market list matters because the state's gateway thesis is geographic, not rhetorical."
          />

          <div className="v2-ranked-list">
            {dataset.trade.topMarkets.map((market) => (
              <div key={market.country} className="v2-ranked-row">
                <span className="v2-ranked-index">{market.rank}</span>
                <div>
                  <strong>{market.country}</strong>
                  <p>{market.region}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="v2-panel">
          <SectionIntro
            eyebrow="Category stack"
            title="Aerospace and advanced manufacturing carry the export machine."
            description="The category mix is what makes Florida's export strength feel structural rather than cyclical."
          />

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={dataset.trade.topCategories.map((category) => ({
                label: category.label,
                value: category.valueUsdBillions,
              }))}
              margin={{ top: 16, right: 8, left: 0, bottom: 56 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(154, 177, 193, 0.14)" />
              <XAxis
                dataKey="label"
                angle={-18}
                textAnchor="end"
                interval={0}
                height={74}
                tick={{ fill: "#93a8b6", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "#93a8b6", fontSize: 11 }} tickFormatter={(value) => `$${Number(value).toFixed(0)}B`} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value) => [`$${Number(value).toFixed(1)}B`, "Export value"]}
              />
              <Bar dataKey="value" fill="#ff9a3d" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="v2-panel">
        <SectionIntro
          eyebrow="Execution"
          title={dataset.trade.selectFlorida.headline}
          description="A serious Florida dashboard should keep one eye on execution, not just macro storytelling."
        />

        <div className="v2-card-grid">
          <SignalCard
            label="FL businesses served"
            value={dataset.trade.selectFlorida.businessesServed.toLocaleString()}
            context={dataset.trade.selectFlorida.businessesWindow}
          />
          <SignalCard
            label="Sales generated"
            value={`${formatUsdMillions(dataset.trade.selectFlorida.salesGeneratedUsdMillions)}+`}
            context="Since July 2025"
          />
          {dataset.trade.selectFlorida.showResults.map((show) => (
            <SignalCard
              key={show.id}
              label={show.show}
              value={`${formatUsdMillions(show.reportedSalesUsdMillions)}+`}
              context={show.window}
            />
          ))}
        </div>
      </section>

      <NarrativePanel
        eyebrow="Trade memo"
        headline={dataset.trade.narrative.headline}
        sections={[
          { label: "What stands out", items: dataset.trade.narrative.whatStandsOut },
          { label: "Watch-outs", items: dataset.trade.narrative.watchOuts },
          { label: "Why it matters", items: dataset.trade.narrative.whyItMatters },
        ]}
      />
    </>
  );
}

function DashboardV2() {
  const { data, error, status } = useDashboardData();
  const [activeTab, setActiveTab] = useState<DashboardTabId>(() => {
    const param = readSearchParam("tab");
    return isDashboardTabId(param) ? param : "scorecard";
  });
  const [selectedMetricId, setSelectedMetricId] = useState<CoreMetricId | null>(() => {
    const param = readSearchParam("metric");
    return isCoreMetricId(param) ? param : null;
  });
  const [selectedInnovationMetricId, setSelectedInnovationMetricId] = useState<InnovationMetricId | null>(() => {
    const param = readSearchParam("innovationMetric");
    return isInnovationMetricId(param) ? param : null;
  });
  const [selectedMetroId, setSelectedMetroId] = useState<string | null>(() => readSearchParam("metro"));
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceRegion, setResourceRegion] = useState<InnovationResource["region"] | "All">("All");

  useEffect(() => {
    if (!data) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    params.set(
      "metric",
      selectedMetricId && data.metrics[selectedMetricId] ? selectedMetricId : data.heroMetrics[0],
    );
    params.set(
      "innovationMetric",
      selectedInnovationMetricId && data.innovation.metrics[selectedInnovationMetricId]
        ? selectedInnovationMetricId
        : data.innovation.heroMetrics[0],
    );
    params.set(
      "metro",
      selectedMetroId && data.metros.some((metro) => metro.id === selectedMetroId)
        ? selectedMetroId
        : (data.metros[0]?.id ?? ""),
    );
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab, data, selectedInnovationMetricId, selectedMetricId, selectedMetroId]);

  if (status === "error") {
    return (
      <main className="v2-root">
        <div className="v2-shell">
          <section className="v2-panel v2-state-card">
            <p className="v2-section-kicker">Data load error</p>
            <h2>V2 couldn't load the Florida dataset.</h2>
            <p className="v2-copy">{error}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!data || status === "loading") {
    return (
      <main className="v2-root">
        <div className="v2-shell">
          <section className="v2-panel v2-state-card">
            <p className="v2-section-kicker">Floridanomics v2</p>
            <h2>Rebuilding the dashboard around the question, not the widget wall.</h2>
            <p className="v2-copy">Loading Florida economic intelligence...</p>
          </section>
        </div>
      </main>
    );
  }

  const activeCoreMetricId =
    selectedMetricId && data.metrics[selectedMetricId] ? selectedMetricId : data.heroMetrics[0];
  const activeInnovationMetricId =
    selectedInnovationMetricId && data.innovation.metrics[selectedInnovationMetricId]
      ? selectedInnovationMetricId
      : data.innovation.heroMetrics[0];
  const activeMetroId =
    selectedMetroId && data.metros.some((metro) => metro.id === selectedMetroId)
      ? selectedMetroId
      : (data.metros[0]?.id ?? "");
  const laborFreshnessDays = daysSince(data.metrics.unemploymentRate.latest.date);

  return (
    <main className="v2-root">
      <div className="v2-shell">
        <header className="v2-masthead">
          <div>
            <p className="v2-section-kicker">Floridanomics v2 · First-principles rewrite</p>
            <h1>Florida intelligence should read like a briefing, not a casino of equal-weight cards.</h1>
            <p className="v2-copy">
              This version starts with the editorial question first, then lets the data support it. It preserves the same
              underlying dataset while changing the architecture, pacing, and emphasis of the app.
            </p>
          </div>

          <aside className="v2-panel v2-masthead-note">
            <p className="v2-card-label">Current dataset</p>
            <h2>{formatDateLabel(data.generatedAt)}</h2>
            <p className="v2-copy">
              Labor observation: {data.asOfLaborMarket}. Population observation: {data.asOfPopulation}. Freshness matters, so
              this version keeps the timing visible.
            </p>
            <div className="v2-chip-grid">
              <div className="v2-chip">
                <span>Labor lag</span>
                <strong>{laborFreshnessDays} days</strong>
              </div>
              <div className="v2-chip">
                <span>Metros</span>
                <strong>{data.metros.length}</strong>
              </div>
              <div className="v2-chip">
                <span>Sources</span>
                <strong>{data.sources.length}</strong>
              </div>
            </div>
          </aside>
        </header>

        <nav className="v2-tabs" aria-label="V2 dashboard tabs">
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={clsx("v2-tab", activeTab === tab.id && "is-active")}
              onClick={() => startTransition(() => setActiveTab(tab.id))}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>

        {activeTab === "scorecard" ? (
          <ScorecardTab
            dataset={data}
            selectedMetricId={activeCoreMetricId}
            onMetricChange={setSelectedMetricId}
            selectedMetroId={activeMetroId}
            onMetroChange={setSelectedMetroId}
          />
        ) : null}

        {activeTab === "innovation" ? (
          <InnovationTab
            dataset={data}
            selectedMetricId={activeInnovationMetricId}
            onMetricChange={setSelectedInnovationMetricId}
            resourceQuery={resourceQuery}
            onResourceQueryChange={setResourceQuery}
            resourceRegion={resourceRegion}
            onResourceRegionChange={setResourceRegion}
          />
        ) : null}

        {activeTab === "trade" ? <TradeTab dataset={data} /> : null}

        <footer className="v2-panel v2-sources">
          <SectionIntro
            eyebrow="Source stack"
            title="The rewrite keeps the sourcing visible and easy to audit."
            description="A Florida thesis is only as good as its citations and release timing."
          />

          <ul className="v2-source-list">
            {data.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.name}
                </a>
                <span>{source.notes}</span>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </main>
  );
}

export default DashboardV2;
