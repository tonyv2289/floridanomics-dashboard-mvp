import { useState } from "react";
import clsx from "clsx";
import { CompetitionSourceList, Frame } from "./primitives";
import { resolveHref } from "./format";
import { formatFacilityValue, formatStateValue, ordinal, sortFacilityRows, stateBars } from "./state-investment";
import type { FacilityMetric, SortDirection } from "./state-investment";
import type { DashboardDataset, StateFacilityHistory, StateInvestmentMeasure } from "../types/dashboard";

const CSV_PATH = "data/megaprojects-1b-2022-2026.csv";

function formatCutoff(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function MeasureCard({ dataset, measure }: { dataset: DashboardDataset; measure: StateInvestmentMeasure }) {
  const { bars, zeroPercent } = stateBars(measure);
  const florida = measure.florida;

  return (
    <article className="v3-state-invest-card">
      <p className="v3-state-invest-question">{measure.question}</p>
      <h3>{measure.label}</h3>
      <small className="v3-state-invest-period">{measure.period}</small>

      <div className="v3-state-invest-lead">
        <strong>{formatStateValue(florida.value, measure.format)}</strong>
        <span>
          Florida: {ordinal(florida.rank)} of {florida.rankOf}
          <em>{florida.rankScope}</em>
        </span>
        {measure.reference ? (
          <span className="v3-state-invest-reference">
            {measure.reference.label}: {formatStateValue(measure.reference.value, measure.format)}
          </span>
        ) : null}
      </div>

      <ol className="v3-state-invest-bars" aria-label={`${measure.label}, ${measure.period}, by state`}>
        {bars.map((bar) => (
          <li key={bar.state} className={clsx(bar.isFlorida && "is-florida")}>
            <span className="v3-state-invest-state">{bar.state}</span>
            <span className="v3-state-invest-track" aria-hidden="true">
              <i className="v3-state-invest-zero" style={{ left: `${zeroPercent}%` }} />
              <b style={{ left: `${bar.offsetPercent}%`, width: `${Math.max(bar.widthPercent, 0.6)}%` }} />
            </span>
            <span className="v3-state-invest-value">{bar.label}</span>
          </li>
        ))}
      </ol>

      <p>{measure.read}</p>
      <p className="v3-state-invest-caveat">{measure.caveat}</p>
      <CompetitionSourceList dataset={dataset} sourceIds={measure.sourceIds} />
    </article>
  );
}

function ValuesTable({ measures }: { measures: StateInvestmentMeasure[] }) {
  const states = measures[0]?.states.map((row) => row.state).sort((a, b) => (a === "Florida" ? -1 : b === "Florida" ? 1 : a.localeCompare(b))) ?? [];
  const valueFor = (measure: StateInvestmentMeasure, state: string) => {
    const row = measure.states.find((item) => item.state === state);
    return row ? formatStateValue(row.value, measure.format) : "n/a";
  };

  return (
    <details className="v3-state-invest-table">
      <summary>All values by state (table)</summary>
      <div className="v3-state-invest-scroll">
        <table>
          <caption>Florida and {states.length - 1} competitor states. Periods differ by measure; see each card.</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              {measures.map((measure) => (
                <th key={measure.id} scope="col">
                  {measure.label} <small>({measure.period})</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr key={state} className={clsx(state === "Florida" && "is-florida")}>
                <th scope="row">{state}</th>
                {measures.map((measure) => (
                  <td key={measure.id}>{valueFor(measure, state)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Year-by-year facility counts for all 50 states: sortable by year, per resident or in total, Florida highlighted.
function FacilityHistoryTable({ dataset, history, peers }: { dataset: DashboardDataset; history: StateFacilityHistory; peers: string[] }) {
  const [metric, setMetric] = useState<FacilityMetric>("perMillion");
  const [scope, setScope] = useState<"all" | "peers">("all");
  const [sort, setSort] = useState<{ year: number; direction: SortDirection }>({ year: history.years.length - 1, direction: "desc" });
  const inScope = scope === "all" ? history.states : history.states.filter((row) => row.state === "Florida" || peers.includes(row.state));
  const rows = sortFacilityRows(inScope, metric, sort.year, sort.direction);
  const medians = metric === "perMillion" ? history.medianPerMillion : history.medianProjects;
  const sortBy = (year: number) =>
    setSort((current) => (current.year === year ? { year, direction: current.direction === "desc" ? "asc" : "desc" } : { year, direction: "desc" }));

  return (
    <Frame label="Year by year">
      <div className="v3-panel-head">
        <div>
          <p className="v3-state-invest-question">{history.question}</p>
          <h2>{history.label}</h2>
          <p>{history.read}</p>
        </div>
      </div>

      <div className="v3-facility-controls">
        <fieldset>
          <legend>Measure</legend>
          <div className="v3-capex-segments">
            {([
              ["perMillion", "Per million residents"],
              ["projects", "Projects"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={metric === value} className={clsx(metric === value && "is-active")} onClick={() => setMetric(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>States</legend>
          <div className="v3-capex-segments">
            {([
              ["all", "All 50"],
              ["peers", `Florida and ${peers.length} competitors`],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={scope === value} className={clsx(scope === value && "is-active")} onClick={() => setScope(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p className="v3-facility-note">
        {metric === "perMillion" ? "Qualifying facility projects per million residents" : "Qualifying facility projects"}. Each state's rank of 50 is under its value;
        select a year to sort.
      </p>
      <div className="v3-state-invest-table v3-facility-table">
        <div className="v3-state-invest-scroll">
          <table>
            <caption className="v3-visually-hidden">
              {metric === "perMillion" ? "Qualifying facility projects per million residents" : "Qualifying facility projects"}, {history.years[0]} to{" "}
              {history.years[history.years.length - 1]}, with each state's rank of 50
            </caption>
            <thead>
              <tr>
                <th scope="col">State</th>
                {history.years.map((year, index) => (
                  <th key={year} scope="col" aria-sort={sort.year === index ? (sort.direction === "desc" ? "descending" : "ascending") : "none"}>
                    <button type="button" onClick={() => sortBy(index)}>
                      {year}
                      <span aria-hidden="true">{sort.year === index ? (sort.direction === "desc" ? " \u2193" : " \u2191") : ""}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = metric === "perMillion" ? row.perMillion : row.projects;
                const ranks = metric === "perMillion" ? row.rankPerMillion : row.rankProjects;
                return (
                  <tr key={row.state} className={clsx(row.state === "Florida" && "is-florida")}>
                    <th scope="row">{row.state}</th>
                    {history.years.map((year, index) => (
                      <td key={year}>
                        <strong>{formatFacilityValue(values[index], metric)}</strong>
                        <small>{ordinal(ranks[index])}</small>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">50-state median</th>
                {medians.map((value, index) => (
                  <td key={history.years[index]}>{formatFacilityValue(value, metric)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="v3-state-invest-caveat">{history.caveat}</p>
      <CompetitionSourceList dataset={dataset} sourceIds={history.sourceIds} />
    </Frame>
  );
}

export function StateInvestmentView({ dataset }: { dataset: DashboardDataset }) {
  const invest = dataset.competition.stateInvestment;

  if (!invest) {
    return (
      <Frame label="State comparison">
        <p className="v3-competition-read">The state investment comparison is not available in this dataset.</p>
      </Frame>
    );
  }

  return (
    <>
      <Frame label="State comparison">
        <div className="v3-panel-head">
          <div>
            <h2>{invest.headline}</h2>
            <p>{invest.summary}</p>
            <p className="v3-state-invest-meta">
              Florida compared with {invest.peerStates.join(", ")}. Evidence cutoff {formatCutoff(invest.evidenceCutoff)}.
            </p>
          </div>
          <div className="v3-panel-number">
            <strong>{invest.peerStates.length + 1}</strong>
            <span>states compared</span>
          </div>
        </div>

        <div className="v3-state-invest-grid">
          {invest.measures.map((measure) => (
            <MeasureCard key={measure.id} dataset={dataset} measure={measure} />
          ))}
        </div>

        <ValuesTable measures={invest.measures} />
      </Frame>

      {invest.facilityHistory ? <FacilityHistoryTable dataset={dataset} history={invest.facilityHistory} peers={invest.peerStates} /> : null}

      <Frame label="Data centers and AI infrastructure">
        <div className="v3-panel-head">
          <div>
            <h2>{invest.dataCenters.headline}</h2>
          </div>
        </div>
        <div className="v3-state-invest-facts">
          {invest.dataCenters.facts.map((fact) => (
            <article key={fact.id} className="v3-state-invest-fact">
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
              <p>{fact.read}</p>
              <CompetitionSourceList dataset={dataset} sourceIds={fact.sourceIds} />
            </article>
          ))}
        </div>
        <p className="v3-state-invest-caveat">{invest.dataCenters.caveat}</p>
      </Frame>

      <Frame label="Site-selection finalists">
        <div className="v3-panel-head">
          <div>
            <h2>{invest.finalists.headline}</h2>
            <p>{invest.finalists.read}</p>
            <p className="v3-state-invest-caveat">{invest.finalists.caveat}</p>
          </div>
        </div>
        <CompetitionSourceList dataset={dataset} sourceIds={invest.finalists.sourceIds} />
      </Frame>

      <Frame label="How to read these comparisons">
        <ul className="v3-state-invest-method">
          {invest.method.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="v3-competition-read">
          <a href={resolveHref(CSV_PATH)} download>
            Download the $1B+ project inventory (CSV, one row per project with its sources)
          </a>
        </p>
      </Frame>
    </>
  );
}
