import { useState } from "react";
import clsx from "clsx";
import { CompetitionSourceList, Frame } from "./primitives";
import { resolveHref } from "./format";
import {
  describeReported,
  formatFacilityValue,
  formatReportedValue,
  formatStateValue,
  ordinal,
  reportedMarks,
  reportedNote,
  sortFacilityRows,
  sortReportedRows,
  stateBars,
} from "./state-investment";
import type { FacilityMetric, ReportedBasis, ReportedMetric, SortDirection } from "./state-investment";
import type { DashboardDataset, StateFacilityHistory, StateInvestmentMeasure, StateReportedCell, StateReportedHistory } from "../types/dashboard";

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

const REPORTED_METRICS = [
  ["capital", "Capital investment"],
  ["jobs", "Jobs"],
  ["count", "Projects"],
] as const;

function Segments<T extends string>({ legend, options, value, onChange }: { legend: string; options: ReadonlyArray<readonly [T, string]>; value: T; onChange: (value: T) => void }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="v3-capex-segments">
        {options.map(([option, label]) => (
          <button key={option} type="button" aria-pressed={value === option} className={clsx(value === option && "is-active")} onClick={() => onChange(option)}>
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// One state-published figure: its value links to the state's report; the line under it says what it measures.
function ReportedCellView({ dataset, state, basis, year, cell, metric }: { dataset: DashboardDataset; state: string; basis: ReportedBasis; year: number; cell: StateReportedCell | null; metric: ReportedMetric }) {
  const value = formatReportedValue(cell, metric);
  const source = cell ? dataset.competition.sources.find((item) => item.id === cell.sourceIds[0]) : undefined;
  if (!cell || value === null || !source) {
    return (
      <td className="v3-facility-missing">
        <span aria-hidden="true">{"\u2014"}</span>
        <span className="v3-visually-hidden">Not published</span>
      </td>
    );
  }
  const description = describeReported(state, basis, year, cell, metric, source.label);
  return (
    <td>
      <a href={source.url} target="_blank" rel="noreferrer" title={description} aria-label={description}>
        <strong>
          {value}
          {reportedMarks(cell)}
        </strong>
      </a>
      <small>{reportedNote(cell, metric)}</small>
    </td>
  );
}

// Year by year for all 50 states. Site Selection counts are comparable and ranked; each state's own reported totals are shown
// as published, never ranked, because states count different things. Sortable by year, Florida highlighted.
function FacilityHistoryTable({ dataset, history, reported, peers }: { dataset: DashboardDataset; history: StateFacilityHistory; reported?: StateReportedHistory; peers: string[] }) {
  const [view, setView] = useState<"facilities" | "reported">("facilities");
  const [metric, setMetric] = useState<FacilityMetric>("perMillion");
  const [reportedMetric, setReportedMetric] = useState<ReportedMetric>("capital");
  const [basis, setBasis] = useState<ReportedBasis>("calendar");
  const [scope, setScope] = useState<"all" | "peers">("all");
  const [sort, setSort] = useState<{ year: number; direction: SortDirection }>({ year: history.years.length - 1, direction: "desc" });
  const inScope = <T extends { state: string }>(rows: T[]) => (scope === "all" ? rows : rows.filter((row) => row.state === "Florida" || peers.includes(row.state)));
  const showReported = view === "reported" && reported !== undefined;
  const years = showReported ? reported.years : history.years;
  const facilityRows = sortFacilityRows(inScope(history.states), metric, sort.year, sort.direction);
  const reportedRows = showReported ? sortReportedRows(inScope(reported.states), reportedMetric, basis, sort.year, sort.direction) : [];
  const medians = metric === "perMillion" ? history.medianPerMillion : history.medianProjects;
  const facilityLabel = metric === "perMillion" ? "Qualifying facility projects per million residents" : "Qualifying facility projects";
  const reportedLabel = `${REPORTED_METRICS.find(([value]) => value === reportedMetric)?.[1]} as each state reported it, ${basis} years`;
  const head = showReported ? reported : history;
  const sortBy = (year: number) =>
    setSort((current) => (current.year === year ? { year, direction: current.direction === "desc" ? "asc" : "desc" } : { year, direction: "desc" }));

  return (
    <Frame label="Year by year">
      <div className="v3-panel-head">
        <div>
          <p className="v3-state-invest-question">{head.question}</p>
          <h2>{head.label}</h2>
          <p>{head.read}</p>
        </div>
      </div>

      <div className="v3-facility-controls">
        {reported ? (
          <Segments
            legend="Numbers"
            options={[
              ["facilities", "Site Selection count"],
              ["reported", "Each state's own report"],
            ] as const}
            value={view}
            onChange={setView}
          />
        ) : null}
        {showReported ? (
          <>
            <Segments legend="Measure" options={REPORTED_METRICS} value={reportedMetric} onChange={setReportedMetric} />
            <Segments
              legend="Year"
              options={[
                ["calendar", "Calendar"],
                ["fiscal", "Fiscal"],
              ] as const}
              value={basis}
              onChange={setBasis}
            />
          </>
        ) : (
          <Segments
            legend="Measure"
            options={[
              ["perMillion", "Per million residents"],
              ["projects", "Projects"],
            ] as const}
            value={metric}
            onChange={setMetric}
          />
        )}
        <Segments
          legend="States"
          options={[
            ["all", "All 50"],
            ["peers", `Florida and ${peers.length} competitors`],
          ] as const}
          value={scope}
          onChange={setScope}
        />
      </div>

      {showReported ? (
        <>
          <p className="v3-facility-note">
            {reportedLabel}. Not comparable across states, so there are no ranks; select a year to sort and a figure to open its source.
          </p>
          <p className="v3-facility-legend">
            <span>{"\u2020"} one program or agency only</span>
            <span>{"\u2021"} Site Selection count cited by the state</span>
            <span>&gt; more than</span>
            <span>{"\u2265"} at least</span>
            <span>~ about</span>
            <span>{"\u2264"} up to</span>
            <span>{"\u2014"} not published</span>
          </p>
        </>
      ) : (
        <p className="v3-facility-note">{facilityLabel}. Each state's rank of 50 is under its value; select a year to sort.</p>
      )}
      <div className="v3-state-invest-table v3-facility-table">
        <div className="v3-state-invest-scroll">
          <table>
            <caption className="v3-visually-hidden">
              {showReported
                ? `${reportedLabel}, ${years[0]} to ${years[years.length - 1]}; not comparable across states`
                : `${facilityLabel}, ${years[0]} to ${years[years.length - 1]}, with each state's rank of 50`}
            </caption>
            <thead>
              <tr>
                <th scope="col">State</th>
                {years.map((year, index) => (
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
              {showReported
                ? reportedRows.map((row) => (
                    <tr key={row.state} className={clsx(row.state === "Florida" && "is-florida")}>
                      <th scope="row">{row.state}</th>
                      {years.map((year, index) => (
                        <ReportedCellView key={year} dataset={dataset} state={row.state} basis={basis} year={year} cell={row[basis][index]} metric={reportedMetric} />
                      ))}
                    </tr>
                  ))
                : facilityRows.map((row) => {
                    const values = metric === "perMillion" ? row.perMillion : row.projects;
                    const ranks = metric === "perMillion" ? row.rankPerMillion : row.rankProjects;
                    return (
                      <tr key={row.state} className={clsx(row.state === "Florida" && "is-florida")}>
                        <th scope="row">{row.state}</th>
                        {years.map((year, index) => (
                          <td key={year}>
                            <strong>{formatFacilityValue(values[index], metric)}</strong>
                            <small>{ordinal(ranks[index])}</small>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
            </tbody>
            {showReported ? null : (
              <tfoot>
                <tr>
                  <th scope="row">50-state median</th>
                  {medians.map((value, index) => (
                    <td key={years[index]}>{formatFacilityValue(value, metric)}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="v3-state-invest-caveat">{head.caveat}</p>
      {showReported ? null : <CompetitionSourceList dataset={dataset} sourceIds={history.sourceIds} />}
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

      {invest.facilityHistory ? (
        <FacilityHistoryTable dataset={dataset} history={invest.facilityHistory} reported={invest.reportedHistory} peers={invest.peerStates} />
      ) : null}

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
