import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  daysSince,
  deltaTone,
  formatDateLabel,
  formatDelta,
  formatMetricValue,
  formatTradeHero,
} from "../lib/dashboard";
import { firstSentence, formatSignedInteger, getMonthlyPayrollChange, resolveHref } from "./format";
import { EvidenceGrid } from "./primitives";
import type { DashboardDataset } from "../types/dashboard";

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = reduceMotion ? 1 : Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function ReadHero({ dataset }: { dataset: DashboardDataset }) {
  const payrollChange = getMonthlyPayrollChange(dataset);
  const animatedChange = useCountUp(payrollChange);
  const payrollTone = payrollChange >= 0 ? "good" : "warn";
  const latestPayrollDate = dataset.metrics.nonfarmPayrolls.latest.date;
  const monthName = formatDateLabel(latestPayrollDate, { month: "long", year: "numeric" });
  const unemployment = dataset.metrics.unemploymentRate;
  const laborForce = dataset.metrics.laborForce;
  const exportMetric = dataset.trade.heroMetrics[0];
  const incomeMigration = dataset.scorecard2030.stats.find((stat) => stat.label === "Income migration");

  return (
    <header className="v3-hero">
      <div className="v3-hero-main">
        <p className="v3-kicker">Florida Today | {dataset.asOfLaborMarket}</p>
        <h1 className={clsx(`tone-${payrollTone}`)}>{formatSignedInteger(animatedChange)}</h1>
        <p className="v3-hero-line">
          Florida {payrollChange >= 0 ? "added" : "lost"} {Math.abs(payrollChange).toLocaleString()} nonfarm jobs in{" "}
          {monthName}. One month is a single data point. The more durable signal is whether hiring, business
          formation, migration, and trade are still moving in the same direction.
        </p>
        <div className="v3-hero-meta">
          <span>BLS CES / LAUS</span>
          <span>{daysSince(latestPayrollDate)} days since latest payroll observation</span>
        </div>
      </div>

      <aside className="v3-hero-side">
        <div>
          <span>Unemployment</span>
          <strong>{formatMetricValue(unemployment, unemployment.latest.value)}</strong>
          <small className={clsx(`tone-${deltaTone(unemployment, unemployment.deltas.oneYear)}`)}>
            1Y {formatDelta(unemployment, unemployment.deltas.oneYear)}
          </small>
        </div>
        <div>
          <span>Labor force</span>
          <strong>{formatMetricValue(laborForce, laborForce.latest.value)}</strong>
          <small className={clsx(`tone-${deltaTone(laborForce, laborForce.deltas.oneYear)}`)}>
            1Y {formatDelta(laborForce, laborForce.deltas.oneYear)}
          </small>
        </div>
        <div>
          <span>{exportMetric.label}</span>
          <strong>{formatTradeHero(exportMetric.value, exportMetric.unit)}</strong>
          <small>{exportMetric.helper}</small>
        </div>
        <div>
          <span>Income migration</span>
          <strong>{incomeMigration?.value ?? "n/a"}</strong>
          <small>{incomeMigration?.context ?? "Florida Chamber frame"}</small>
        </div>
      </aside>
    </header>
  );
}

function OperatingRead({ dataset }: { dataset: DashboardDataset }) {
  const payrollChange = getMonthlyPayrollChange(dataset);
  const businessApplications = dataset.innovation.metrics.businessApplications;
  const informationJobs = dataset.innovation.metrics.informationEmployment;
  const tradeDelta = dataset.trade.deltas.find((delta) => delta.id === "oneYear");

  const reads = [
    {
      label: "Hiring pulse",
      value: formatSignedInteger(payrollChange),
      note: "latest monthly payroll move",
      tone: payrollChange >= 0 ? "good" : "warn",
    },
    {
      label: "Formation",
      value: formatMetricValue(businessApplications, businessApplications.latest.value),
      note: `1Y ${formatDelta(businessApplications, businessApplications.deltas.oneYear)}`,
      tone: deltaTone(businessApplications, businessApplications.deltas.oneYear),
    },
    {
      label: "Knowledge-work bench",
      value: formatMetricValue(informationJobs, informationJobs.latest.value),
      note: `1Y ${formatDelta(informationJobs, informationJobs.deltas.oneYear)}`,
      tone: deltaTone(informationJobs, informationJobs.deltas.oneYear),
    },
    {
      label: "Export growth",
      value: tradeDelta?.absolute === null || tradeDelta?.absolute === undefined ? "n/a" : `+$${tradeDelta.absolute.toFixed(1)}B`,
      note: tradeDelta?.baseLabel ?? "latest annual export read",
      tone: "good",
    },
  ] as const;

  return (
    <section className="v3-operating-read" aria-label="Operating read">
      {reads.map((read) => (
        <article key={read.label} className="v3-read-cell">
          <p>{read.label}</p>
          <strong className={clsx(`tone-${read.tone}`)}>{read.value}</strong>
          <span>{read.note}</span>
        </article>
      ))}
    </section>
  );
}

function FloridaBrainNotes({ dataset }: { dataset: DashboardDataset }) {
  return (
    <section className="v3-brain-notes" aria-label="Florida Brain notes">
      <div className="v3-brain-notes-head">
        <p className="v3-kicker">Florida Brain notes</p>
        <h2>Where the data becomes published analysis.</h2>
        <p>
          These are the active editorial reads coming out of Floridanomics. Each note stays source-linked so the
          analysis keeps its audit trail as the narrative develops.
        </p>
      </div>

      <div className="v3-brain-note-grid">
        {dataset.brainNotes.map((note) => (
          <article key={note.id} className="v3-brain-note">
            <div>
              <p className="v3-kicker">{note.kicker}</p>
              <span>{note.status}</span>
            </div>
            <h3>{note.title}</h3>
            <p>{note.summary}</p>
            <div className="v3-note-source-list">
              {note.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
            {note.href && note.ctaLabel ? (
              <a className="v3-note-cta" href={resolveHref(note.href)}>
                {note.ctaLabel}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function BriefTab({ dataset }: { dataset: DashboardDataset }) {
  const watchItems = [
    firstSentence(dataset.narrative.softening[0] ?? "No major supersector is contracting year over year."),
    firstSentence(dataset.innovation.narrative.signals[0] ?? "Business formation is the live innovation signal."),
    firstSentence(dataset.trade.narrative.watchOuts[0] ?? "Watch the trade mix as the export base expands."),
  ];

  return (
    <>
      <ReadHero dataset={dataset} />
      <OperatingRead dataset={dataset} />
      <EvidenceGrid dataset={dataset} />
      <FloridaBrainNotes dataset={dataset} />

      <section className="v3-watch">
        <div>
          <p className="v3-kicker">What to watch</p>
          <h2>Three open questions that will shape the next read.</h2>
        </div>
        <ol>
          {watchItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
