import { formatDateLabel, type AnyMetric } from "../lib/dashboard";

const BAR_COLORS = ["#ffe1bd", "#ffc183", "#ff9f4f", "#ff8f3f", "#e85d2f"];
const BAR_WIDTH = 9;
const BAR_GAP = 4;
const MIN_HEIGHT = 7;
const MAX_HEIGHT = 26;
const BASELINE = 28;

export function BrandMark({ metric }: { metric: AnyMetric }) {
  const points = metric.series.slice(-BAR_COLORS.length);
  if (points.length < 2) {
    return null;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const heights = values.map((value) =>
    range === 0
      ? (MIN_HEIGHT + MAX_HEIGHT) / 2
      : MIN_HEIGHT + ((value - min) / range) * (MAX_HEIGHT - MIN_HEIGHT),
  );

  const windowLabel = `${formatDateLabel(points[0].date, { month: "short", year: "numeric" })} to ${formatDateLabel(
    points[points.length - 1].date,
    { month: "short", year: "numeric" },
  )}`;
  const title = `Live mark: ${metric.label}, ${windowLabel}`;

  return (
    <svg
      className="v3-brand-bars"
      width={points.length * BAR_WIDTH + (points.length - 1) * BAR_GAP}
      height={BASELINE}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {heights.map((height, index) => (
        <rect
          key={points[index].date}
          x={index * (BAR_WIDTH + BAR_GAP)}
          y={BASELINE - height}
          width={BAR_WIDTH}
          height={height}
          rx={1.5}
          fill={BAR_COLORS[index]}
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </svg>
  );
}
