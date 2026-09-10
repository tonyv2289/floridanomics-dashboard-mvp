import clsx from "clsx";
import { deltaTone, formatDelta, formatMetricValue } from "../lib/dashboard";
import { Frame, TerminalSourceList } from "./primitives";
import { ProjectCapexLedger } from "./ProjectCapexLedger";
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
          <span>AI infrastructure</span>
          <strong>Research agenda</strong>
          <p>A comparable Florida project-capacity inventory is needed before an investment gap can be measured.</p>
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
    <Frame label="AI infrastructure investment">
      <div className="v3-panel-head">
        <div>
          <h2>Infrastructure investment and the evidence needed.</h2>
          <p>
            Comparable project data are needed to assess Florida's position. State labor statistics alone cannot identify an AI investment gap.
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
          <h3>Research priorities</h3>
          <div className="v3-terminal-factor-list">
            {index.factors.map((factor) => (
              <article key={factor.id}>
                <div>
                  <strong>{factor.label}</strong>

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
      note: "information-sector employment",
    },
    {
      label: "Construction jobs",
      metric: dataset.innovation.metrics.constructionEmployment,
      note: "construction-sector employment",
    },
    {
      label: "Professional services",
      metric: dataset.innovation.metrics.professionalBusinessEmployment,
      note: "professional and business services",
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

function ForecastBoard({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Scenario analysis">
      <div className="v3-forecast-grid">
        {dataset.terminal.forecasts.map((forecast) => (
          <article key={forecast.id} className="v3-forecast-card">
            <div className="v3-forecast-card-head">
              <span>{forecast.horizon}</span>
              <b>Editorial scenario</b>
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
    <Frame label="Policy memos">
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
      <ProjectCapexLedger dataset={dataset} compact />
      <ForecastBoard dataset={dataset} />
      <PolicyMemoBoard dataset={dataset} />
      <EvidenceExport dataset={dataset} />
    </>
  );
}
