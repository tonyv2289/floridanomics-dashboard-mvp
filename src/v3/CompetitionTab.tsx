import { startTransition } from "react";
import clsx from "clsx";
import {
  formatNullablePercent,
  formatNullableSignedPercent,
  formatNullableThousands,
  formatNullableUsdBillions,
  getDirectionArrow,
  getMomentumArrow,
} from "./format";
import {
  COMPETITION_VIEW_OPTIONS,
  type CompetitionViewId,
} from "./constants";
import { CompetitionSourceList, Frame } from "./primitives";
import { ProjectCapexLedger } from "./ProjectCapexLedger";
import { GovernmentGrantsLedger } from "./GovernmentGrantsLedger";
import type { DashboardDataset } from "../types/dashboard";

function CompetitionHero({ dataset }: { dataset: DashboardDataset }) {
  const competition = dataset.competition;
  const floridaFdi = competition.fdiScoreboard.observatory.deltas.find((state) => state.id === "FL");

  return (
    <Frame label="State competition terminal">
      <div className="v3-competition-hero">
        <div className="v3-competition-hero-main">
          <h2>{competition.headline}</h2>
          <p>{competition.summary}</p>
          <p className="v3-competition-caveat">{competition.publicationNote}</p>
        </div>

        <aside className="v3-competition-scorecard">
          <span>Florida new FDI, 2025</span>
          <strong>{formatNullableUsdBillions(floridaFdi?.latestExpendituresUsdBillions ?? null)}</strong>
          <p>{competition.fdiScoreboard.summary}</p>
          {floridaFdi ? <CompetitionSourceList dataset={dataset} sourceIds={floridaFdi.sourceIds} /> : null}
        </aside>
      </div>
    </Frame>
  );
}

function CompetitionViewMenu({
  activeView,
  onChange,
}: {
  activeView: CompetitionViewId;
  onChange: (view: CompetitionViewId) => void;
}) {
  return (
    <nav className="v3-competition-menu" aria-label="Competition views">
      <div>
        <span>Competition menu</span>
        <strong>Choose a Comparison</strong>
      </div>
      <div>
        {COMPETITION_VIEW_OPTIONS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={clsx("v3-competition-menu-button", activeView === view.id && "is-active")}
            onClick={() => startTransition(() => onChange(view.id))}
          >
            <span>{view.label}</span>
            <small>{view.line}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

function MetroCompetitionView({
  dataset,
  comparison,
  label,
}: {
  dataset: DashboardDataset;
  comparison:
    | DashboardDataset["competition"]["metroComparison"]
    | DashboardDataset["competition"]["internationalMetroComparison"];
  label: string;
}) {
  return (
    <Frame label={label}>
      <div className="v3-panel-head">
        <div>
          <h2>{comparison.headline}</h2>
          <p>{comparison.summary}</p>
          <p>{comparison.asOf}</p>
        </div>
        <div className="v3-panel-number">
          <strong>{comparison.regions.length}</strong>
          <span>regions compared</span>
        </div>
      </div>

      <div className="v3-metro-competition-grid">
        {comparison.regions.map((region) => (
          <article key={region.id} className={clsx("v3-metro-competition-card", `momentum-${region.momentum}`)}>
            <div className="v3-metro-competition-head">
              <span className="v3-fdi-momentum-label">
                <em aria-hidden="true">{getMomentumArrow(region.momentum)}</em>
                {region.momentum}
              </span>
              <b>{region.role}</b>
            </div>
            <h3>{region.name}</h3>
            <small>{region.federalName}</small>
            <p className="v3-metro-verdict">{region.verdict}</p>
            <p>{region.read}</p>

            <div className="v3-metro-signal-list">
              {region.signals.map((signal) => (
                <div key={signal.label} className={clsx("v3-metro-signal", `direction-${signal.direction}`)}>
                  <span aria-hidden="true">{getDirectionArrow(signal.direction)}</span>
                  <div>
                    <small>{signal.label}</small>
                    <strong>{signal.value}</strong>
                    <p>{signal.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <CompetitionSourceList dataset={dataset} sourceIds={region.sourceIds} />
          </article>
        ))}
      </div>

      <p className="v3-competition-read">
        Data window: {comparison.asOf}. These comparisons describe regional strengths and investment conditions.
        Definitions and geographic coverage differ across countries; they are not a standardized economic ranking.
      </p>
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
    <Frame label="Federal economic series">
      <div className="v3-federal-spine-head">
        <div>
          <h2>{federal.headline}</h2>
          <p>{federal.summary}</p>
        </div>
        <div className="v3-federal-spine-score">
          <strong>
            {liveSignals}/{federal.signals.length}
          </strong>
          <span>series retrieved in this refresh</span>
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

    </Frame>
  );
}

function FdiScoreboard({ dataset }: { dataset: DashboardDataset }) {
  const observatory = dataset.competition.fdiScoreboard.observatory;

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
          <strong>2025 preliminary estimates</strong>
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
                <span>2025 first-year expenditures</span>
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

    </Frame>
  );
}

export function CompetitionTab({
  dataset,
  activeView,
  onSelectView,
}: {
  dataset: DashboardDataset;
  activeView: CompetitionViewId;
  onSelectView: (view: CompetitionViewId) => void;
}) {
  return (
    <>
      <CompetitionHero dataset={dataset} />
      <CompetitionViewMenu activeView={activeView} onChange={onSelectView} />
      {activeView === "projects" ? <ProjectCapexLedger dataset={dataset} /> : null}
      {activeView === "grants" ? <GovernmentGrantsLedger dataset={dataset} /> : null}
      {activeView === "metro" ? (
        <MetroCompetitionView dataset={dataset} comparison={dataset.competition.metroComparison} label="US metros" />
      ) : null}
      {activeView === "international" ? (
        <MetroCompetitionView
          dataset={dataset}
          comparison={dataset.competition.internationalMetroComparison}
          label="International metros"
        />
      ) : null}
      {activeView === "fdi" ? (
        <>
          <FederalDataSpine dataset={dataset} />
          <FdiScoreboard dataset={dataset} />
        </>
      ) : null}
    </>
  );
}
