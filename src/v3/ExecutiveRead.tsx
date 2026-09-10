import { useState } from "react";
import clsx from "clsx";
import { formatDateLabel } from "../lib/dashboard";
import type { DashboardDataset } from "../types/dashboard";
import { firstSentence, formatSignedInteger, getMonthlyPayrollChange } from "./format";

type AudienceId = "operator" | "investor" | "policymaker" | "developer";

const AUDIENCES: Array<{ id: AudienceId; label: string }> = [
  { id: "operator", label: "CEO / operator" },
  { id: "investor", label: "Investor" },
  { id: "policymaker", label: "Policymaker" },
  { id: "developer", label: "Economic developer" },
];

export function ExecutiveRead({ dataset }: { dataset: DashboardDataset }) {
  const [audience, setAudience] = useState<AudienceId>("operator");
  const payrollChange = getMonthlyPayrollChange(dataset);
  const laborRelease = dataset.trust.releaseCalendar.find((release) => release.id === "florida-labor");
  const nextRelease = laborRelease?.nextExpectedRelease
    ? formatDateLabel(laborRelease.nextExpectedRelease, { month: "short", day: "numeric" })
    : "not yet scheduled";
  const implications: Record<AudienceId, { headline: string; action: string }> = {
    operator: {
      headline: "Statewide employment figures provide context, but hiring conditions vary by occupation and region.",
      action: "Compare local recruiting conditions and compensation before committing to an expansion.",
    },
    investor: {
      headline: "Population growth supports demand; productivity and export earnings determine the longer-term contribution.",
      action: "Distinguish businesses serving local demand from those developing technology, manufacturing and services for outside markets.",
    },
    policymaker: {
      headline: "An announced project becomes an economic contribution as investment, operations and employment materialize.",
      action: "Track construction, private spending, supplier relationships and wages against the original commitments.",
    },
    developer: {
      headline: "Investment decisions depend on available sites, reliable utilities and workers with the required skills.",
      action: "Use the project comparisons to identify the local infrastructure and workforce requirements for each prospect.",
    },
  };
  const implication = implications[audience];

  return (
    <section className="v3-executive-read" aria-label="Executive decision read">
      <div className="v3-now-grid">
        <article>
          <span>What changed</span>
          <strong>{formatSignedInteger(payrollChange)} jobs</strong>
          <p>{dataset.asOfLaborMarket} monthly payroll change</p>
        </article>
        <article>
          <span>Why it matters</span>
          <strong>{firstSentence(dataset.narrative.whyItMatters[0] ?? dataset.narrative.headline)}</strong>
        </article>
        <article>
          <span>Watch next</span>
          <strong>{nextRelease}</strong>
          <p>Expected Florida labor release</p>
        </article>
      </div>
      <div className="v3-implication-read">
        <div className="v3-audience-tabs" role="group" aria-label="Decision audience">
          {AUDIENCES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx(audience === item.id && "is-active")}
              aria-pressed={audience === item.id}
              onClick={() => setAudience(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div>
          <p className="v3-kicker">Economic Implications</p>
          <h2>{implication.headline}</h2>
          <p>{implication.action}</p>
        </div>
      </div>
    </section>
  );
}
