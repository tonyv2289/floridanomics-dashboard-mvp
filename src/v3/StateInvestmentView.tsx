import clsx from "clsx";
import { CompetitionSourceList, Frame } from "./primitives";
import { resolveHref } from "./format";
import { formatStateValue, ordinal, stateBars } from "./state-investment";
import type { DashboardDataset, StateInvestmentMeasure } from "../types/dashboard";

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
          <caption>Florida and nine competitor states. Periods differ by measure; see each card.</caption>
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
