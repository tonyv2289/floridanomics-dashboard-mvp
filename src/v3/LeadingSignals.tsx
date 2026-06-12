import clsx from "clsx";
import { formatDateLabel } from "../lib/dashboard";
import { Frame } from "./primitives";
import type { LeadingSignal, LeadingSignalChange } from "../types/dashboard";

function formatSignalValue(signal: LeadingSignal): string {
  if (signal.unit === "index") {
    return signal.latest.value.toFixed(1);
  }
  return Math.round(signal.latest.value).toLocaleString();
}

function formatChange(change: LeadingSignalChange): string {
  if (change.percent === null) {
    return `${change.absolute >= 0 ? "+" : "-"}${Math.abs(Math.round(change.absolute)).toLocaleString()} ${change.label}`;
  }
  const sign = change.percent >= 0 ? "+" : "-";
  return `${sign}${Math.abs(change.percent).toFixed(1)}% ${change.label}`;
}

function changeTone(signal: LeadingSignal, change: LeadingSignalChange): "good" | "warn" | "flat" {
  if (Math.abs(change.percent ?? change.absolute) < 1e-9) {
    return "flat";
  }
  const improved = (change.absolute > 0) === (signal.trendDirection === "up_good");
  return improved ? "good" : "warn";
}

function Sparkline({ signal }: { signal: LeadingSignal }) {
  const points = signal.series.slice(-40);
  if (points.length < 2) {
    return null;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 120;
  const height = 28;
  const coords = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - 3 - ((point.value - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="v3-signal-spark" width={width} height={height} aria-hidden="true">
      <polyline points={coords} fill="none" stroke="#ff8f3f" strokeWidth="1.5" />
    </svg>
  );
}

function cadenceLabel(signal: LeadingSignal): string {
  const date = formatDateLabel(signal.latest.date, { month: "short", day: "numeric" });
  if (signal.cadence === "daily") {
    return `daily, through ${date}`;
  }
  if (signal.cadence === "weekly") {
    return `weekly, week of ${date}`;
  }
  return `monthly, ${formatDateLabel(signal.latest.date, { month: "long", year: "numeric" })}`;
}

export function LeadingSignals({ signals, headline, summary }: { signals: LeadingSignal[]; headline: string; summary: string }) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <Frame label="Leading signals">
      <div className="v3-panel-head">
        <div>
          <h2>{headline}</h2>
          <p>{summary}</p>
        </div>
      </div>

      <div className="v3-signal-grid">
        {signals.map((signal) => (
          <article key={signal.id} className="v3-signal-card">
            <div className="v3-signal-head">
              <span>{signal.label}</span>
              <small>{cadenceLabel(signal)}</small>
            </div>
            <div className="v3-signal-reading">
              <strong>{formatSignalValue(signal)}</strong>
              <Sparkline signal={signal} />
            </div>
            <div className="v3-signal-changes">
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
            <p>{signal.leads}</p>
            <a className="v3-source-link" href={signal.source.url} target="_blank" rel="noreferrer">
              {signal.source.label}
            </a>
          </article>
        ))}
      </div>
    </Frame>
  );
}
