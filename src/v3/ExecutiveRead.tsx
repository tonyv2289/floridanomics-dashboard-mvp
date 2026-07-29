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
      headline: "Hiring is still expanding, but the labor bench is not deepening at the same speed.",
      action: "Stress-test critical-role recruiting and wage assumptions before the next labor release.",
    },
    investor: {
      headline: "Florida demand remains large; durable upside depends on conversion into high-wage productive capacity.",
      action: "Separate migration-led consumption exposure from companies building exportable technology and infrastructure.",
    },
    policymaker: {
      headline: "A headline win is not the same as a production ecosystem.",
      action: "Track private capex, construction, supplier depth, wages, and operating milestones on one scoreboard.",
    },
    developer: {
      headline: "Competitor states are packaging sites, talent, power, financing, and executive access as one product.",
      action: "Advance named projects against readiness gaps instead of marketing broad statewide advantages alone.",
    },
  };
  const implication = implications[audience];

  return (
    <section className="v3-executive-read" aria-label="Executive decision read">
      <div className="v3-now-grid">
        <article>
          <span>What changed</span>
          <strong>{formatSignedInteger(payrollChange)} jobs</strong>
          <p>{dataset.asOfLaborMarket} payroll move</p>
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
          <p className="v3-kicker">Decision implication</p>
          <h2>{implication.headline}</h2>
          <p>{implication.action}</p>
        </div>
      </div>
    </section>
  );
}
