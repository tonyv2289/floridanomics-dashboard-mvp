import { startTransition } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact } from "../lib/dashboard";
import {
  formatFdiStock,
  formatNullablePercent,
  formatNullableSignedPercent,
  formatNullableThousands,
  formatNullableUsdBillions,
  formatUsdValue,
  getDirectionArrow,
  getMomentumArrow,
} from "./format";
import {
  COMPETITION_VIEW_OPTIONS,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
  type CompetitionViewId,
} from "./constants";
import { CompetitionSourceList, Frame } from "./primitives";
import { StrategyTab } from "./StrategyTab";
import type { DashboardDataset } from "../types/dashboard";

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
        <strong>Pick the operating lens.</strong>
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
        </div>
        <div className="v3-panel-number">
          <strong>{comparison.regions.length}</strong>
          <span>metro engines</span>
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
        Data window: {comparison.asOf}. The strategic question is whether Miami and Florida can turn scale,
        migration, and gateway power into velocity, productivity, and institutional execution.
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
          <h2>The next layer is a live competitor ledger.</h2>
          <p>
            This view draws on the SelectFlorida archive. The next build replaces static archive reads with
            refreshed primary-source feeds and a deal-by-deal competitor ledger.
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
      {activeView === "strategy" ? <StrategyTab dataset={dataset} /> : null}
      {activeView === "fdi" ? (
        <>
          <FederalDataSpine dataset={dataset} />
          <FdiScoreboard dataset={dataset} />
          <PolicyToolkit dataset={dataset} />
          <CapacityAndMigration dataset={dataset} />
          <SemiconductorCommitments dataset={dataset} />
          <CompetitionNextMoves dataset={dataset} />
        </>
      ) : null}
    </>
  );
}
