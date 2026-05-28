import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deltaTone, formatDelta, formatMetricValue } from "../lib/dashboard";
import { TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./constants";
import { Frame, TerminalSourceList } from "./primitives";
import type { DashboardDataset } from "../types/dashboard";

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

export function TerminalTab({ dataset }: { dataset: DashboardDataset }) {
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
