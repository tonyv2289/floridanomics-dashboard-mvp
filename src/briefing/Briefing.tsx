import { useEffect, useState } from "react";
import clsx from "clsx";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  daysSince,
  deltaTone,
  formatDateLabel,
  formatDelta,
  formatMetricValue,
  formatTradeHero,
} from "../lib/dashboard";
import { formatSignedInteger, getMonthlyPayrollChange } from "../v3/format";
import { changeTone, formatChange, formatSignalValue } from "../v3/signal-format";
import { BrandMark } from "../v3/BrandMark";
import { SignupForm } from "../components/SignupForm";
import "./briefing.css";

type WhatChangedPayload = {
  generatedAt: string;
  items: Array<{ id: string; tone: "good" | "warn" | "flat"; headline: string }>;
};

function useWhatChanged(): WhatChangedPayload | null {
  const [payload, setPayload] = useState<WhatChangedPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/what-changed.json`, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: WhatChangedPayload | null) => {
        if (!cancelled && data && Array.isArray(data.items) && data.items.length > 0) {
          setPayload(data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return payload;
}

function Briefing() {
  const { data, error, status } = useDashboardData();
  const whatChanged = useWhatChanged();

  if (status === "error") {
    return <main className="briefing-root" id="briefing-main"><p className="briefing-state">The briefing could not load the dataset. {error}</p></main>;
  }

  if (!data || status === "loading") {
    return <main className="briefing-root" id="briefing-main"><p className="briefing-state">Preparing the briefing.</p></main>;
  }

  const payrollChange = getMonthlyPayrollChange(data);
  const unemployment = data.metrics.unemploymentRate;
  const laborForce = data.metrics.laborForce;
  const exportMetric = data.trade.heroMetrics[0];
  const payrollDate = data.metrics.nonfarmPayrolls.latest.date;

  const isSnapshot =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("snapshot") === "1";

  return (
    <main className="briefing-root" id="briefing-main">
      {isSnapshot ? null : (
        <div className="briefing-actions">
          <a href="?view=dashboard">Explore the full dashboard</a>
          <button type="button" onClick={() => window.print()}>
            Download as PDF
          </button>
        </div>
      )}

      <article className="briefing">
        <header className="briefing-masthead">
          <div className="briefing-brand">
            <BrandMark metric={data.metrics.nonfarmPayrolls} />
            <div>
              <p className="briefing-wordmark">
                FLORIDA<span>NOMICS</span>
              </p>
              <p className="briefing-doc-title">Florida economic briefing</p>
            </div>
          </div>
          <div className="briefing-stamp">
            <strong>{formatDateLabel(data.generatedAt)}</strong>
            <span>Labor data: {data.asOfLaborMarket}</span>
            <span>{daysSince(payrollDate)} days since latest payroll observation</span>
          </div>
        </header>

        <section className="briefing-hero">
          <div className="briefing-hero-main">
            <p className="briefing-kicker">Florida today</p>
            <strong className={clsx(payrollChange >= 0 ? "tone-good" : "tone-warn")}>
              {formatSignedInteger(payrollChange)}
            </strong>
            <p>
              nonfarm jobs {payrollChange >= 0 ? "added" : "lost"} in{" "}
              {formatDateLabel(payrollDate, { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="briefing-hero-stats">
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
          </div>
        </section>

        {data.leading ? (
          <section className="briefing-section">
            <h2>Ahead of the print</h2>
            <p className="briefing-note">{data.leading.summary}</p>
            <div className="briefing-signals">
              {data.leading.signals.map((signal) => (
                <div key={signal.id} className="briefing-signal">
                  <span>{signal.label}</span>
                  <strong>{formatSignalValue(signal)}</strong>
                  <div>
                    {signal.changes.recent ? (
                      <small className={clsx(`tone-${changeTone(signal, signal.changes.recent)}`)}>
                        {formatChange(signal.changes.recent)}
                      </small>
                    ) : null}
                    {signal.changes.yearOver ? (
                      <small className={clsx(`tone-${changeTone(signal, signal.changes.yearOver)}`)}>
                        {formatChange(signal.changes.yearOver)}
                      </small>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {whatChanged ? (
          <section className="briefing-section">
            <h2>What changed in the latest refresh</h2>
            <ul className="briefing-changes">
              {whatChanged.items.map((item) => (
                <li key={item.id}>
                  <span className={clsx("briefing-dot", `tone-${item.tone}`)} aria-hidden="true" />
                  {item.headline}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isSnapshot ? null : <SignupForm source="briefing" variant="briefing" />}

        <footer className="briefing-footer">
          <p>
            Sources: BLS CES and LAUS, FRED, US Census Bureau, US DOL, Indeed Hiring Lab, US Census USA Trade,
            SelectFlorida, Florida Chamber Foundation. Full charts and source links:
            tonyv2289.github.io/floridanomics-dashboard-mvp/?view=dashboard
          </p>
          <p>Generated automatically by the Floridanomics data pipeline. One month is a single data point; read trends, not prints.</p>
        </footer>
      </article>
    </main>
  );
}

export default Briefing;
