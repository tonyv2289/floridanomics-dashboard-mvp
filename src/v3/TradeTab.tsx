import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTradeHero, formatUsdMillions } from "../lib/dashboard";
import { TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./constants";
import { Frame, InsightBlock } from "./primitives";
import type { DashboardDataset } from "../types/dashboard";

export function TradeTab({ dataset }: { dataset: DashboardDataset }) {
  return (
    <>
      <Frame label="Trade read">
        <div className="v3-panel-head">
          <div>
            <h2>{dataset.trade.headline}</h2>
            <p>{dataset.trade.narrative.headline}</p>
          </div>
        </div>

        <div className="v3-stat-grid">
          {dataset.trade.heroMetrics.map((metric) => (
            <article key={metric.id} className="v3-stat-card">
              <span>{metric.label}</span>
              <strong>{formatTradeHero(metric.value, metric.unit)}</strong>
              <p>{metric.helper}</p>
            </article>
          ))}
        </div>
      </Frame>

      <InsightBlock section={dataset.distinctives.latamGateway} />

      <div className="v3-two-up">
        <Frame label="Top markets">
          <div className="v3-table">
            {dataset.trade.topMarkets.map((market) => (
              <div key={market.country} className="v3-table-row is-static">
                <span>{market.rank}. {market.country}</span>
                <strong>{market.region}</strong>
                <small>gateway market</small>
              </div>
            ))}
          </div>
        </Frame>

        <Frame label="Export categories">
          <div className="v3-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={dataset.trade.topCategories.map((category) => ({
                  label: category.label,
                  value: category.valueUsdBillions,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 62 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />
                <XAxis
                  dataKey="label"
                  angle={-18}
                  textAnchor="end"
                  interval={0}
                  height={82}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => `$${Number(value).toFixed(0)}B`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(value) => [`$${Number(value).toFixed(1)}B`, "Export value"]}
                />
                <Bar dataKey="value" fill="#ff8f3f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Frame>
      </div>

      <Frame label="Execution">
        <div className="v3-stat-grid">
          <article className="v3-stat-card">
            <span>Businesses served</span>
            <strong>{dataset.trade.selectFlorida.businessesServed.toLocaleString()}</strong>
            <p>{dataset.trade.selectFlorida.businessesWindow}</p>
          </article>
          <article className="v3-stat-card">
            <span>Sales generated</span>
            <strong>{formatUsdMillions(dataset.trade.selectFlorida.salesGeneratedUsdMillions)}+</strong>
            <p>SelectFlorida measured outcome</p>
          </article>
          {dataset.trade.selectFlorida.showResults.map((show) => (
            <article key={show.id} className="v3-stat-card">
              <span>{show.show}</span>
              <strong>{formatUsdMillions(show.reportedSalesUsdMillions)}+</strong>
              <p>{show.window}</p>
            </article>
          ))}
        </div>
      </Frame>
    </>
  );
}
