import { useMemo, useState } from "react";
import clsx from "clsx";
import type { DashboardDataset, GovernmentGrantAward } from "../types/dashboard";
import { Frame, TerminalSourceList } from "./primitives";
import {
  filterGovernmentGrants,
  formatGrantFundingType,
  formatGrantMillions,
  formatGrantStage,
  getGrantLeverageRatio,
  summarizeGovernmentGrants,
  type GrantFundingLevelFilter,
  type GrantGeographyFilter,
  type GrantSort,
} from "./grants-ledger";

function GrantMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="v3-capex-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatJobs(award: GovernmentGrantAward) {
  if (award.jobsCreated === null && award.jobsRetained === null) return "Not disclosed";
  const parts = [];
  if (award.jobsCreated !== null) parts.push(`${award.jobsCreated.toLocaleString("en-US")} new`);
  if (award.jobsRetained !== null) parts.push(`${award.jobsRetained.toLocaleString("en-US")} retained`);
  return parts.join(" / ");
}

function GrantRows({ dataset, awards }: { dataset: DashboardDataset; awards: GovernmentGrantAward[] }) {
  return (
    <div className="v3-capex-rows">
      <div className="v3-capex-row v3-capex-row-head v3-grant-row" aria-hidden="true">
        <span>Recipient and program</span>
        <span>Award</span>
        <span>Public source</span>
        <span>Documented outcomes</span>
      </div>
      {awards.map((award) => {
        const leverageRatio = getGrantLeverageRatio(award);

        return (
          <article key={award.id} className="v3-capex-row v3-grant-row">
            <div className="v3-capex-project">
              <div>
                <span className={clsx("v3-capex-state", award.isFlorida && "is-florida")}>{award.stateId}</span>
                <small>{award.geography}</small>
              </div>
              <h3>{award.recipient}</h3>
              <p>{award.program}</p>
              <span className="v3-capex-sector">{award.sector}</span>
            </div>
            <div className="v3-capex-cell" data-label="Award">
              <strong>{formatGrantMillions(award.awardAmountUsdMillions, award.amountQualifier)}</strong>
              <small>{formatDate(award.awardDate)}</small>
            </div>
            <div className="v3-capex-cell v3-capex-stage-cell" data-label="Public source">
              <b className={clsx("v3-capex-stage", `is-${award.stage}`)}>{formatGrantStage(award.stage)}</b>
              <strong className="v3-grant-agency">{award.fundingAgency}</strong>
              <small>
                {award.fundingLevel === "federal" ? "Federal" : "State"} | {formatGrantFundingType(award.fundingType)}
              </small>
            </div>
            <div className="v3-capex-cell" data-label="Documented outcomes">
              <strong>
                {award.leveragedCapitalUsdMillions === null
                  ? formatJobs(award)
                  : formatGrantMillions(award.leveragedCapitalUsdMillions)}
              </strong>
              <small>
                {award.leveragedCapitalUsdMillions === null
                  ? "Jobs tied to award"
                  : `${leverageRatio.toLocaleString("en-US", { maximumFractionDigits: 1 })}x documented leverage | ${formatJobs(award)}`}
              </small>
            </div>
            <details className="v3-capex-detail">
              <summary>Decision read</summary>
              <div>
                <p>{award.strategicRead}</p>
                <dl className="v3-grant-detail-grid">
                  <div>
                    <dt>Delivery</dt>
                    <dd>{award.stageDetail}</dd>
                  </div>
                  <div>
                    <dt>Administration</dt>
                    <dd>{award.administeringAgency ?? "Direct federal award"}</dd>
                  </div>
                  <div>
                    <dt>Award record</dt>
                    <dd>
                      {award.awardId ? `ID ${award.awardId}` : "ID not disclosed"}
                      {award.assistanceListing ? ` | AL ${award.assistanceListing}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Performance end</dt>
                    <dd>{award.performanceEndDate === null ? "Not disclosed" : formatDate(award.performanceEndDate)}</dd>
                  </div>
                  <div>
                    <dt>Last verified</dt>
                    <dd>{award.lastVerifiedDate}</dd>
                  </div>
                </dl>
                <TerminalSourceList dataset={dataset} sourceIds={award.sourceIds} />
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}

export function GovernmentGrantsLedger({ dataset }: { dataset: DashboardDataset }) {
  const ledger = dataset.terminal.governmentGrantsLedger;
  const summary = useMemo(() => summarizeGovernmentGrants(ledger.awards), [ledger.awards]);
  const [geography, setGeography] = useState<GrantGeographyFilter>("all");
  const [fundingLevel, setFundingLevel] = useState<GrantFundingLevelFilter>("all");
  const [sector, setSector] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<GrantSort>("award");
  const sectors = useMemo(
    () => [...new Set(ledger.awards.map((award) => award.sector))].sort(),
    [ledger.awards],
  );
  const visibleAwards = useMemo(
    () => filterGovernmentGrants(ledger.awards, { geography, fundingLevel, sector, query, sort }),
    [fundingLevel, geography, ledger.awards, query, sector, sort],
  );

  return (
    <Frame label="Government awards ledger">
      <div className="v3-panel-head v3-capex-head">
        <div>
          <h2>{ledger.headline}</h2>
          <p>{ledger.summary}</p>
        </div>
        <div className="v3-panel-number">
          <strong>{ledger.awards.length}</strong>
          <span>verified awards</span>
        </div>
      </div>

      <div className="v3-capex-scoreboard">
        <GrantMetric
          label="Florida named awards"
          value={formatGrantMillions(
            summary.floridaAwardAmount,
            summary.floridaHasMinimumAmount ? "minimum" : "exact",
          )}
          note={`${summary.floridaAwardCount} recipient-level awards since 2024`}
        />
        <GrantMetric
          label="Federal share"
          value={`${Math.round(summary.floridaFederalShare * 100)}%`}
          note="Florida award value originating in federal programs"
        />
        <GrantMetric
          label="Largest peer award"
          value={
            summary.largestPeerAward
              ? formatGrantMillions(summary.largestPeerAward.awardAmountUsdMillions, summary.largestPeerAward.amountQualifier)
              : "n/a"
          }
          note={summary.largestPeerAward ? `${summary.largestPeerAward.recipient} | ${summary.largestPeerAward.state}` : "No peer award"}
        />
        <GrantMetric
          label="Peer documented leverage"
          value={`${summary.peerLeverageRatio.toLocaleString("en-US", { maximumFractionDigits: 1 })}x`}
          note={`${summary.peerLeverageAwardCount} company awards with disclosed capital`}
        />
      </div>

      <p className="v3-capex-coverage">{ledger.coverageNote}</p>

      <div className="v3-capex-controls">
        <fieldset>
          <legend>Geography</legend>
          <div className="v3-capex-segments">
            {([
              ["all", "All"],
              ["florida", "Florida"],
              ["peers", "Peers"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={clsx(geography === value && "is-active")}
                onClick={() => setGeography(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Funding source</legend>
          <div className="v3-capex-segments">
            {([
              ["all", "All"],
              ["federal", "Federal"],
              ["state", "State"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={clsx(fundingLevel === value && "is-active")}
                onClick={() => setFundingLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <span>Sector</span>
          <select value={sector} onChange={(event) => setSector(event.target.value)}>
            <option value="all">All sectors</option>
            {sectors.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as GrantSort)}>
            <option value="award">Largest award</option>
            <option value="newest">Newest award</option>
            <option value="leverage">Highest leverage</option>
          </select>
        </label>
        <label className="v3-capex-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Recipient, agency, place"
          />
        </label>
      </div>

      <div className="v3-capex-results-head">
        <strong>{visibleAwards.length} {visibleAwards.length === 1 ? "award" : "awards"}</strong>
        <span>{visibleAwards.filter((award) => award.leveragedCapitalUsdMillions !== null).length} with documented leverage</span>
      </div>
      {visibleAwards.length > 0 ? (
        <GrantRows dataset={dataset} awards={visibleAwards} />
      ) : (
        <div className="v3-capex-empty">No awards match the current filters.</div>
      )}

      <div className="v3-capex-context">
        {ledger.context.map((item) => (
          <article key={item.id}>
            <span>{item.category} | {item.label}</span>
            <strong>{item.headline}</strong>
            <p>{item.treatment}</p>
            <TerminalSourceList dataset={dataset} sourceIds={item.sourceIds} />
          </article>
        ))}
      </div>

      <details className="v3-capex-method">
        <summary>Ledger methodology</summary>
        <ol>
          {ledger.methodology.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </details>
    </Frame>
  );
}
