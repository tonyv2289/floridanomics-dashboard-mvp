import clsx from "clsx";
import {
  formatPeerLaborForceDelta,
  formatPeerPayrollDelta,
  formatPeerUnemploymentDelta,
  formatSignedCompact,
} from "./format";
import { Frame, InsightBlock, SourceAnchor, SourceList } from "./primitives";
import type { DashboardDataset } from "../types/dashboard";

function StrategyHero({ dataset }: { dataset: DashboardDataset }) {
  const peerStates = dataset.strategy.peerStates;
  const topPayroll = [...peerStates].sort(
    (a, b) => (b.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity) - (a.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity),
  )[0];
  const tightestLabor = [...peerStates].sort((a, b) => a.unemploymentRate.latest.value - b.unemploymentRate.latest.value)[0];
  const florida = peerStates.find((state) => state.id === "FL");

  return (
    <Frame label="Strategy cockpit">
      <div className="v3-strategy-hero">
        <div>
          <h2>{dataset.strategy.headline}</h2>
          <p>{dataset.strategy.summary}</p>
        </div>
        <div className="v3-strategy-hero-stats">
          <article>
            <span>Peer states</span>
            <strong>{peerStates.length}</strong>
            <p>FL, TX, GA, NC, TN, AZ, UT, CA</p>
          </article>
          <article>
            <span>Fastest payroll growth</span>
            <strong>{topPayroll?.shortName ?? "n/a"}</strong>
            <p>{topPayroll ? formatPeerPayrollDelta(topPayroll) : "n/a"}</p>
          </article>
          <article>
            <span>Tightest labor market</span>
            <strong>{tightestLabor?.shortName ?? "n/a"}</strong>
            <p>{tightestLabor ? `${tightestLabor.unemploymentRate.latest.value.toFixed(1)}% unemployment` : "n/a"}</p>
          </article>
          <article>
            <span>Florida read</span>
            <strong>{florida ? `${florida.unemploymentRate.latest.value.toFixed(1)}%` : "n/a"}</strong>
            <p>{florida ? `${formatPeerUnemploymentDelta(florida)} YoY` : "BLS peer benchmark"}</p>
          </article>
        </div>
      </div>
    </Frame>
  );
}

function PeerStateBenchmarks({ dataset }: { dataset: DashboardDataset }) {
  const rankedStates = [...dataset.strategy.peerStates].sort(
    (a, b) => (b.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity) - (a.nonfarmPayrolls.deltas.oneYear?.percent ?? -Infinity),
  );

  return (
    <Frame label="Peer-state mode">
      <div className="v3-panel-head">
        <div>
          <h2>Florida has to be read against the states eating at the same table.</h2>
          <p>
            This is the first live peer layer: BLS unemployment, labor force, and nonfarm payrolls across the states
            Florida should benchmark against before making a victory-lap claim.
          </p>
        </div>
      </div>

      <div className="v3-peer-table">
        {rankedStates.map((state) => {
          const payrollTone = (state.nonfarmPayrolls.deltas.oneYear?.absolute ?? 0) >= 0 ? "good" : "warn";
          const unemploymentTone = (state.unemploymentRate.deltas.oneYear?.absolute ?? 0) <= 0 ? "good" : "warn";

          return (
            <article key={state.id} className={clsx("v3-peer-row", state.id === "FL" && "is-florida")}>
              <div>
                <strong>{state.name}</strong>
                <span>{state.positioning}</span>
              </div>
              <div>
                <span>Unemployment</span>
                <strong>{state.unemploymentRate.latest.value.toFixed(1)}%</strong>
                <small className={clsx(`tone-${unemploymentTone}`)}>{formatPeerUnemploymentDelta(state)} YoY</small>
              </div>
              <div>
                <span>Payrolls 1Y</span>
                <strong className={clsx(`tone-${payrollTone}`)}>{formatPeerPayrollDelta(state)}</strong>
                <small>BLS CES</small>
              </div>
              <div>
                <span>Labor force 1Y</span>
                <strong>{formatPeerLaborForceDelta(state)}</strong>
                <small>BLS LAUS</small>
              </div>
              <p>{state.watch}</p>
            </article>
          );
        })}
      </div>
    </Frame>
  );
}

function BenchmarkModels({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Models to steal from">
      <div className="v3-benchmark-grid">
        {dataset.strategy.benchmarkExamples.map((example) => (
          <article key={example.id} className="v3-benchmark-card">
            <span>{example.model}</span>
            <h3>{example.name}</h3>
            <p>{example.takeaway}</p>
            <SourceAnchor source={example.source} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function ClusterStrategy({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Cluster strategy">
      <div className="v3-panel-head">
        <div>
          <h2>Do not benchmark Florida as one blob. Benchmark the clusters that can change the wage curve.</h2>
          <p>
            Pennsylvania's useful lesson is structure: sectors, supply chains, workforce gaps, and emerging industries
            should sit in one operating view.
          </p>
        </div>
      </div>

      <div className="v3-cluster-grid">
        {dataset.strategy.clusters.map((cluster) => (
          <article key={cluster.id} className="v3-cluster-card">
            <h3>{cluster.title}</h3>
            <p>{cluster.thesis}</p>
            <dl>
              <div>
                <dt>Bottleneck</dt>
                <dd>{cluster.bottleneck}</dd>
              </div>
              <div>
                <dt>Proof</dt>
                <dd>{cluster.proof}</dd>
              </div>
              <div>
                <dt>Track next</dt>
                <dd>{cluster.whatToTrack}</dd>
              </div>
            </dl>
            <SourceList sources={cluster.sources} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

function MetroMomentumLayer({ dataset }: { dataset: DashboardDataset }) {
  const sortedMetros = [...dataset.metros].sort(
    (a, b) => (b.laborForce.deltas.oneYear?.percent ?? -Infinity) - (a.laborForce.deltas.oneYear?.percent ?? -Infinity),
  );

  return (
    <Frame label="Metro momentum">
      <div className="v3-panel-head">
        <div>
          <h2>Borrow North Carolina's local-momentum logic for Florida metros.</h2>
          <p>
            The next version should expand this to all counties. For now, the major metros show whether local labor
            force momentum is broadening or narrowing.
          </p>
        </div>
      </div>

      <div className="v3-momentum-grid">
        {sortedMetros.map((metro) => (
          <article key={metro.id} className="v3-momentum-card">
            <span>{metro.name}</span>
            <strong>{metro.unemploymentRate.latest.value.toFixed(1)}%</strong>
            <p>Unemployment rate</p>
            <div>
              <small>Labor force 1Y</small>
              <b>{formatSignedCompact(metro.laborForce.deltas.oneYear?.absolute ?? 0, 1)}</b>
            </div>
            <div>
              <small>Employment 1Y</small>
              <b>{formatSignedCompact(metro.employmentLevel.deltas.oneYear?.absolute ?? 0, 1)}</b>
            </div>
          </article>
        ))}
      </div>
    </Frame>
  );
}

function ScenarioLayer({ dataset }: { dataset: DashboardDataset }) {
  return (
    <Frame label="Scenario layer">
      <div className="v3-scenario-grid">
        {dataset.strategy.scenarios.map((scenario) => (
          <article key={scenario.id} className={clsx("v3-scenario-card", `scenario-${scenario.id}`)}>
            <span>{scenario.status}</span>
            <h3>{scenario.label}</h3>
            <p>{scenario.summary}</p>
            <ul>
              {scenario.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
            <SourceList sources={scenario.sources} />
          </article>
        ))}
      </div>
    </Frame>
  );
}

export function StrategyTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <StrategyHero dataset={dataset} />
      <PeerStateBenchmarks dataset={dataset} />
      <ClusterStrategy dataset={dataset} />
      <div className="v3-two-up">
        <InsightBlock section={dataset.strategy.talentPipeline} />
        <BenchmarkModels dataset={dataset} />
      </div>
      <MetroMomentumLayer dataset={dataset} />
      <ScenarioLayer dataset={dataset} />
    </>
  );
}
