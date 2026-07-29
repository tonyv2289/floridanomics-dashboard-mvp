import type { DashboardDataset } from "../types/dashboard";
import { PolicyMemo } from "./PolicyMemo";
import { Frame, TerminalSourceList } from "./primitives";

export function PolicyTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <header className="v3-section-hero v3-policy-hero">
        <div>
          <p className="v3-kicker">Policy</p>
          <h1>Judge policy by the capacity and wages it creates.</h1>
          <p>{dataset.terminal.operatingQuestion}</p>
        </div>
        <dl>
          <div>
            <dt>Active memos</dt>
            <dd>{dataset.terminal.policyMemos.length}</dd>
          </div>
          <div>
            <dt>Tracked awards</dt>
            <dd>{dataset.terminal.governmentGrantsLedger.awards.length}</dd>
          </div>
          <div>
            <dt>Policy standard</dt>
            <dd>Jobs + capacity</dd>
          </div>
        </dl>
      </header>

      <PolicyMemo />

      <Frame label="Decision memos">
        <div className="v3-policy-decision-grid">
          {dataset.terminal.policyMemos.map((memo) => (
            <article key={memo.id}>
              <p className="v3-kicker">Floridanomics analysis</p>
              <h2>{memo.title}</h2>
              <p className="v3-policy-stance">{memo.stance}</p>
              <dl>
                <div>
                  <dt>Mechanism</dt>
                  <dd>{memo.mechanism}</dd>
                </div>
                <div>
                  <dt>Recommendation</dt>
                  <dd>{memo.recommendation}</dd>
                </div>
                <div>
                  <dt>Guardrail</dt>
                  <dd>{memo.whatNotToDo}</dd>
                </div>
              </dl>
              <TerminalSourceList dataset={dataset} sourceIds={memo.sourceIds} />
            </article>
          ))}
        </div>
      </Frame>
    </>
  );
}
