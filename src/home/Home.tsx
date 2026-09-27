import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import { useDashboardData } from "../hooks/useDashboardData";
import regionalEconomy from "../../public/data/regional-economy.json";
import type { RegionalEconomy } from "../regions/geographies";
import { SignupForm } from "../components/SignupForm";
import { ordinal } from "../v3/state-investment";
import { buildHomeModel, formatCountyChange } from "./home-model";
import type { HomeFigure, HomeModel } from "./home-model";
import { mountHomeMotion } from "./home-motion";
import "./home.css";

const BASE = import.meta.env.BASE_URL;
const to = (query: string) => `${BASE}${query}`;

function Headline() {
  return (
    <>
      <p className="home-kicker">Florida's economy, measured</p>
      <h1 id="home-title">
        The Florida economy, measured where it <span>happens.</span>
      </h1>
      <p className="home-dek">
        Jobs, wages, trade and investment across eight regions. Every figure comes from a public source and carries the date it describes.
      </p>
    </>
  );
}

function SourceLink({ source, children }: { source: HomeFigure["source"]; children?: string }) {
  if (!source) return null;
  return (
    <a href={source.url} target="_blank" rel="noreferrer">
      {children ?? source.label}
    </a>
  );
}

// Facility projects per million residents, Florida against the 50-state median. The motion engine traces the lines year by
// year as the reader scrolls; at rest the chart shows every year.
function ClimbChart({ climb }: { climb: NonNullable<HomeModel["climb"]> }) {
  const n = climb.years.length;
  const top = Math.max(5, Math.ceil(Math.max(...climb.florida, ...climb.median) / 5) * 5);
  const cx = (i: number) => 70 + (i * 528) / Math.max(n - 1, 1);
  const cy = (v: number) => 290 - (v * 250) / top;
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(" ");
  const last = n - 1;
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5);
  return (
    <svg className="home-chart" viewBox="0 0 640 330" role="img" aria-labelledby="home-chart-title home-chart-desc">
      <title id="home-chart-title">Facility projects per million residents, Florida and the 50-state median, {climb.years[0]} to {climb.years[last]}</title>
      <desc id="home-chart-desc">
        Florida: {climb.florida.map((v) => v.toFixed(1)).join(", ")}. Median: {climb.median.map((v) => v.toFixed(1)).join(", ")}.
      </desc>
      {ticks.map((v) => (
        <g key={v}>
          <line x1="54" x2="620" y1={cy(v)} y2={cy(v)} stroke="rgba(148,163,184,0.16)" />
          <text x="44" y={cy(v) + 4} textAnchor="end" className="home-chart-axis">{v}</text>
        </g>
      ))}
      {climb.years.map((year, i) => (
        <text key={year} x={cx(i)} y="316" textAnchor="middle" className="home-chart-axis home-chart-year">{year}</text>
      ))}
      <text x="54" y={cy(top) - 14} className="home-chart-axis">Projects per million residents</text>
      <line data-home-guide x1={cx(last)} x2={cx(last)} y1={cy(top)} y2={cy(0)} stroke="rgba(148,163,184,0.35)" strokeDasharray="3 4" />
      <path d={path(climb.median)} fill="none" stroke="rgba(86,194,255,0.22)" strokeWidth="2" />
      <path d={path(climb.florida)} fill="none" stroke="rgba(255,143,63,0.22)" strokeWidth="2" />
      <path data-home-line="med" d={path(climb.median)} fill="none" stroke="var(--home-teal)" strokeWidth="2.5" strokeLinecap="round" />
      <path data-home-line="fl" d={path(climb.florida)} fill="none" stroke="var(--home-sun)" strokeWidth="3" strokeLinecap="round" />
      {climb.median.map((v, i) => (
        <circle key={`m${i}`} data-home-dot="med" cx={cx(i)} cy={cy(v)} r="4" fill="var(--home-teal)" stroke="var(--home-navy)" strokeWidth="2" />
      ))}
      {climb.florida.map((v, i) => (
        <circle key={`f${i}`} data-home-dot="fl" cx={cx(i)} cy={cy(v)} r="5" fill="var(--home-sun)" stroke="var(--home-navy)" strokeWidth="2" />
      ))}
      <text data-home-label="fl" x={cx(last)} y={cy(climb.florida[last]) + 26} textAnchor="middle" className="home-chart-label" fill="var(--home-sun)">
        Florida {climb.florida[last].toFixed(1)}
      </text>
      <text data-home-label="med" x={cx(last)} y={cy(climb.median[last]) - 14} textAnchor="middle" className="home-chart-label" fill="var(--home-teal)">
        Median {climb.median[last].toFixed(1)}
      </text>
    </svg>
  );
}

function Figures({ items }: { items: HomeFigure[] }) {
  if (!items.length) return null;
  return (
    <ul className="home-figures">
      {items.map((item) => (
        <li key={item.label}>
          <strong>{item.value}</strong> {item.label}
          {item.context ? <span>{item.context}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Bars({ bars }: { bars: Array<{ label: string; value: string; share: number }> }) {
  return (
    <ul className="home-bars">
      {bars.map((bar) => (
        <li key={bar.label}>
          <b>{bar.label}</b>
          <span className="home-bar-value">{bar.value}</span>
          <span className="home-bar">
            <u style={{ "--w": `${(bar.share * 100).toFixed(1)}%` } as CSSProperties} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const DESTINATIONS: Array<{ title: string; line: string; query: string }> = [
  { title: "Briefing", line: "What changed this month, and why it matters.", query: "?view=briefing" },
  { title: "Competition", line: "Florida against ten competitor states and all fifty, year by year.", query: "?view=dashboard&tab=competition&competitionView=states" },
  { title: "Trade", line: "Exports, ports and the gateways to Latin America.", query: "?view=dashboard&tab=trade" },
  { title: "Talent & wages", line: "Degrees, demand and pay by field.", query: "?view=dashboard&tab=talent" },
  { title: "Policy", line: "The bills in play and what each would change.", query: "?view=dashboard&tab=policy" },
  { title: "Sources", line: "Every figure's source, date and method.", query: "?view=dashboard&tab=evidence" },
];

// Scroll motion needs position: sticky, and it respects reduced motion. index.css sets overflow-x: hidden on body, which
// makes body a scroll container and silently disables sticky; overflow-x: clip trims the same overflow without that, so
// motion runs only where clip is supported and the page falls back to its resting layout elsewhere.
function useMotionAllowed(): boolean {
  const [allowed] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      typeof CSS !== "undefined" &&
      CSS.supports("overflow-x", "clip"),
  );
  return allowed;
}

export default function Home() {
  const { data, status, error } = useDashboardData();
  const motion = useMotionAllowed();
  const model = useMemo(() => (data ? buildHomeModel(data, regionalEconomy as RegionalEconomy) : null), [data]);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!motion) return undefined;
    const body = document.body;
    const previous = body.style.overflowX;
    body.style.overflowX = "clip";
    return () => {
      body.style.overflowX = previous;
    };
  }, [motion]);

  useEffect(() => {
    if (!model || !rootRef.current) return undefined;
    return mountHomeMotion(rootRef.current, model, !motion);
  }, [model, motion]);

  if (!model) {
    return (
      <main className="home" id="home-main">
        <section className="home-hero home-hero--static" aria-labelledby="home-title">
          <div className="home-wrap">
            <div className="home-hero-copy">
              <Headline />
              <p className="home-state" role="status">
                {status === "error" ? `The latest figures could not load. ${error ?? ""}` : "Loading the latest figures."}
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const n = model.regions.length;
  const { climb, launches, ports, migration } = model;
  return (
    <main ref={rootRef} className={clsx("home", motion && "home--motion")} id="home-main">
      <div className="home-journey">
        <div className="home-stage" aria-hidden="true">
          <div className="home-glow" />
          <canvas data-home-map />
        </div>

        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-wrap">
            <div className="home-hero-copy">
              <Headline />
              <div className="home-stats">
                {model.hero.map((stat) => (
                  <div className="home-stat" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>
                      {stat.label}
                      {stat.delta ? (
                        <>
                          {" "}
                          <em className={stat.tone ? `is-${stat.tone}` : undefined}>{stat.delta}</em>
                        </>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
              <div className="home-actions">
                <a className="home-cta" href={to("?view=dashboard&tab=brief")}>Open the dashboard</a>
                <a className="home-secondary" href={to("?view=briefing")}>Read the briefing</a>
              </div>
              <p className="home-source">
                Sources:{" "}
                {model.heroSources.map((source, i) => (
                  <span key={source.url}>
                    {i ? ", " : ""}
                    <SourceLink source={source} />
                  </span>
                ))}
                .
              </p>
              <p className="home-cue">
                <i aria-hidden="true">{"↓"}</i> Scroll to travel the state
              </p>
            </div>
          </div>
        </section>

        <section className="home-tour" id="regions" aria-labelledby="home-region-name" data-home-tour>
          <div className="home-tour-pin" data-home-pin>
            <div className="home-wrap">
              <div className="home-route" data-home-route>
                <p className="home-kicker">Eight regional economies, benchmark counties</p>
                <h2 id="home-region-name" data-home-region-name aria-live="polite">{model.regions[0]?.title}</h2>
                <ol className="home-stops" data-home-stops>
                  {model.regions.map((region, i) => (
                    <li key={region.id} className={clsx(i === 0 && "is-done is-active")}>{region.short}</li>
                  ))}
                </ol>
              </div>
            </div>
            <div data-home-cards>
              <div className="home-track-wrap">
                <div className="home-track" data-home-track>
                  {model.regions.map((region, i) => (
                    <article className={clsx("home-card", i === 0 && "is-active")} key={region.id} data-home-card>
                      <p className="home-kicker">
                        {String(i + 1).padStart(2, "0")} of {String(n).padStart(2, "0")} {"·"} {region.short}
                      </p>
                      <h3>{region.title}</h3>
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">County</th>
                            <th scope="col">Jobs</th>
                            <th scope="col">Weekly wage</th>
                            <th scope="col">1 year</th>
                          </tr>
                        </thead>
                        <tbody>
                          {region.counties.map((county) => (
                            <tr key={county.fips}>
                              <td>{county.name}</td>
                              <td>{county.jobs.toLocaleString("en-US")}</td>
                              <td>${county.weeklyWage.toLocaleString("en-US")}</td>
                              <td className={clsx(county.change !== null && county.change > 0 && "is-up", county.change !== null && county.change < 0 && "is-down")}>
                                {formatCountyChange(county.change)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="home-note">{region.note}</p>
                      <a className="home-more" href={region.href}>
                        Open the {region.short} page <i aria-hidden="true">{"→"}</i>
                      </a>
                    </article>
                  ))}
                </div>
              </div>
              <div className="home-wrap">
                <p className="home-source">
                  {model.countyPeriod}{" "}
                  <a href="https://www.bls.gov/cew/" target="_blank" rel="noreferrer">BLS Quarterly Census of Employment and Wages</a>. Selected benchmark
                  counties, not regional totals.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {climb ? (
        <section className="home-climb" data-home-climb aria-labelledby="home-climb-title">
          <div className="home-climb-pin">
            <div className="home-wrap home-climb-grid">
              <div>
                <p className="home-kicker">Corporate facility projects, {climb.years[0]} to {climb.years[climb.years.length - 1]}</p>
                <h2 id="home-climb-title">{climb.title}</h2>
                <p className="home-body">{climb.body}</p>
                <ol className="home-years">
                  {climb.years.map((year, i) => (
                    <li key={year} data-home-year className={clsx(i === climb.years.length - 1 && "is-active")}>
                      <b>{year}</b> {ordinal(climb.ranks[i])}
                    </li>
                  ))}
                </ol>
                <div className="home-readout" aria-live="polite">
                  <div>
                    <strong className="home-lead" data-home-rank>{ordinal(climb.ranks[climb.ranks.length - 1])}</strong>
                    <span>of 50 states, per resident</span>
                  </div>
                  <div>
                    <strong data-home-count>{climb.counts[climb.counts.length - 1].toLocaleString("en-US")}</strong>
                    <span>qualifying projects</span>
                  </div>
                  <div>
                    <strong data-home-per>{climb.florida[climb.florida.length - 1].toFixed(1)}</strong>
                    <span>per million residents</span>
                  </div>
                </div>
              </div>
              <div>
                <ul className="home-legend">
                  <li><i style={{ background: "var(--home-sun)" }} />Florida</li>
                  <li><i style={{ background: "var(--home-teal)" }} />50-state median</li>
                </ul>
                <ClimbChart climb={climb} />
                <p className="home-source">
                  Counts: <SourceLink source={climb.source} />. Population: Census Vintage 2025. Ties share a rank.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {launches || ports || migration ? (
        <section className="home-flows" aria-labelledby="home-flows-title">
          <div className="home-wrap">
            <div className="home-section-head">
              <p className="home-kicker">What moves through Florida</p>
              <h2 id="home-flows-title">{launches && ports && migration ? "Rockets, containers and new residents." : "What moves through Florida."}</h2>
            </div>
            {launches ? (
              <div className="home-flow" data-home-flow="ticks">
                <div>
                  <p className="home-kicker">Space Coast</p>
                  <p className="home-big">{launches.count}</p>
                  <p className="home-what">{launches.line}</p>
                  <p className="home-source"><SourceLink source={launches.source} /></p>
                </div>
                <div>
                  <div className="home-ticks" data-home-ticks role="img" aria-label={`${launches.count} marks, one per launch in ${launches.year}`}>
                    {Array.from({ length: launches.count }, (_, i) => <i key={i} />)}
                  </div>
                  <Figures items={launches.extras} />
                </div>
              </div>
            ) : null}
            {ports ? (
              <div className="home-flow" data-home-flow="bars">
                <div>
                  <p className="home-kicker">Ports</p>
                  <p className="home-big">{ports.total}</p>
                  <p className="home-what">{ports.line}</p>
                  <p className="home-source"><SourceLink source={ports.source} /></p>
                </div>
                <div>
                  <Bars bars={ports.bars} />
                  {ports.aside ? <Figures items={[ports.aside]} /> : null}
                </div>
              </div>
            ) : null}
            {migration ? (
              <div className="home-flow" data-home-flow="bars">
                <div>
                  <p className="home-kicker">People and income</p>
                  <p className="home-big">{migration.value}</p>
                  <p className="home-what">{migration.line}</p>
                  <p className="home-source"><SourceLink source={migration.source} />. An annual measure expressed per hour.</p>
                </div>
                <div>
                  {migration.bars.length ? <Bars bars={migration.bars} /> : null}
                  {migration.note ? <p className="home-aside">{migration.note}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {model.ledger.length ? (
        <section className="home-ledger" aria-labelledby="home-ledger-title">
          <div className="home-wrap">
            <div className="home-section-head">
              <p className="home-kicker">Florida against the other states</p>
              <h2 id="home-ledger-title">Where Florida leads, and where it trails.</h2>
            </div>
            <ol className="home-rows">
              {model.ledger.map((row) => (
                <li key={row.id}>
                  <span className="home-row-label">
                    {row.label}
                    <small>{row.period}</small>
                  </span>
                  <span className="home-rank" style={{ "--pos": row.position } as CSSProperties}>
                    <b />
                    <span>1st</span>
                    <span>{ordinal(row.rankOf)}</span>
                  </span>
                  <span className="home-row-value">
                    <strong>{row.value}</strong>
                    <span>{row.rank}</span>
                  </span>
                </li>
              ))}
            </ol>
            <a className="home-more" href={to("?view=dashboard&tab=competition&competitionView=states")}>
              Open the full state comparison <i aria-hidden="true">{"→"}</i>
            </a>
          </div>
        </section>
      ) : null}

      <section className="home-enter" aria-labelledby="home-enter-title">
        <div className="home-wrap">
          <div className="home-section-head">
            <p className="home-kicker">Inside Floridanomics</p>
            <h2 id="home-enter-title">Go deeper.</h2>
          </div>
          <ul className="home-dest">
            {DESTINATIONS.slice(0, 1).map((item) => (
              <li key={item.title}>
                <a className="home-dest-row" href={to(item.query)}>
                  <span className="home-dest-title">{item.title}</span>
                  <span className="home-dest-line">{item.line}</span>
                  <span className="home-dest-go" aria-hidden="true">{"→"}</span>
                </a>
              </li>
            ))}
            <li>
              <div className="home-dest-row home-dest-regions">
                <span className="home-dest-title">Regions</span>
                <span className="home-chips">
                  {model.regions.map((region) => (
                    <a key={region.id} href={region.href}>{region.title}</a>
                  ))}
                  <a href={to("?view=atlas")}>Florida atlas</a>
                </span>
                <span className="home-dest-go" aria-hidden="true" />
              </div>
            </li>
            {DESTINATIONS.slice(1).map((item) => (
              <li key={item.title}>
                <a className="home-dest-row" href={to(item.query)}>
                  <span className="home-dest-title">{item.title}</span>
                  <span className="home-dest-line">{item.line}</span>
                  <span className="home-dest-go" aria-hidden="true">{"→"}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-signup">
        <div className="home-wrap">
          <SignupForm source="home" variant="briefing" />
        </div>
      </section>

      <footer className="home-foot">
        <div className="home-wrap">
          <p>
            Every figure on Floridanomics cites a public source and the date it describes.{" "}
            <a href={to("?view=dashboard&tab=evidence")}>Sources, dates and methods</a>.
          </p>
          <span className="home-sign">Florida Forever</span>
        </div>
      </footer>
    </main>
  );
}
