import clsx from "clsx";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type AnyMetric,
  chartSeries,
  deltaTone,
  formatDelta,
  formatMetricValue,
} from "../lib/dashboard";
import { formatDisplayedValue } from "./format";
import { TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./constants";
import { Frame } from "./primitives";

/**
 * The single Recharts consumer, isolated in its own module so that importing the
 * shared primitives (EvidenceGrid, TabNav, etc.) on the Brief landing does not pull
 * the chart library. Chart tabs lazy-load this; the landing never ships Recharts.
 */
export function ChartPanel({
  metric,
  title,
  note,
  accent = "sun",
}: {
  metric: AnyMetric;
  title: string;
  note: string;
  accent?: "sun" | "teal";
}) {
  const lineColor = accent === "sun" ? "#ff8f3f" : "#56c2ff";
  const series = chartSeries(metric);
  const ariaLabel = `${title}: ${metric.label}. Latest ${formatMetricValue(
    metric,
    metric.latest.value,
  )}, one year change ${formatDelta(metric, metric.deltas.oneYear)}.`;

  return (
    <Frame label="Trend">
      <div className="v3-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{metric.label}</p>
        </div>
        <div className="v3-panel-number">
          <strong>{formatMetricValue(metric, metric.latest.value)}</strong>
          <span className={clsx(`tone-${deltaTone(metric, metric.deltas.oneYear)}`)}>
            1Y {formatDelta(metric, metric.deltas.oneYear)}
          </span>
        </div>
      </div>

      <div className="v3-chart" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart accessibilityLayer data={series} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => formatDisplayedValue(metric, Number(value))} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ stroke: "rgba(255, 143, 63, 0.32)", strokeDasharray: "4 4" }}
              formatter={(value) => [formatDisplayedValue(metric, Number(value)), metric.label]}
            />
            <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Visually hidden data table: makes the trend readable by assistive tech. */}
      <table className="v3-visually-hidden">
        <caption>{title} trend data</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{metric.label}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{formatDisplayedValue(metric, Number(point.value))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="v3-note">{note}</p>
    </Frame>
  );
}
