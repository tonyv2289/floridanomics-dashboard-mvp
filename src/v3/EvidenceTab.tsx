import { formatDateLabel } from "../lib/dashboard";
import type { DashboardDataset, SourceClassification } from "../types/dashboard";
import { EvidenceExport } from "./EvidenceExport";
import { Frame } from "./primitives";
import { FreshnessNotice } from "../components/FreshnessNotice";
import releaseCalendar from "../../public/data/release-calendar.json";
import regionalEconomy from "../../public/data/regional-economy.json";

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

/** A release date that has been read in the release itself, or "Not recorded" when none has. */
function releasedOrUnrecorded(value: string | null): string {
  return value ? formatDateLabel(value, SHORT_DATE) : "Not recorded";
}

/** The next scheduled release, or "Not scheduled" when the source has announced none. */
function nextOrUnscheduled(value: string | null): string {
  return value ? formatDateLabel(value, SHORT_DATE) : "Not scheduled";
}

export function EvidenceTab({ dataset }: { dataset: DashboardDataset }) {
  const sourceCounts = dataset.sources.reduce<Record<SourceClassification, number>>(
    (counts, source) => {
      if (source.classification) {
        counts[source.classification] += 1;
      }
      return counts;
    },
    { official_data: 0, official_announcement: 0, industry_research: 0, advocacy_analysis: 0 },
  );

  return (
    <>
      <header className="v3-section-hero v3-trust-hero">
        <div>
          <p className="v3-kicker">Evidence</p>
          <h1>Each number shows its date, its source, and whether it can still be revised.</h1>
          <p>
            Floridanomics shows the period each number describes and the day it was released. Official data,
            outside analysis, and our own reading are labeled separately.
          </p>
        </div>
        <dl>
          <div>
            <dt>Data updated</dt>
            <dd>{formatDateLabel(dataset.generatedAt, SHORT_DATE)}</dd>
          </div>
          <div>
            <dt>Latest labor period</dt>
            <dd>{dataset.asOfLaborMarket}</dd>
          </div>
          <div>
            <dt>Methodology</dt>
            <dd>{formatDateLabel(dataset.trust.methodologyVersion, SHORT_DATE)}</dd>
          </div>
        </dl>
      </header>

      {dataset.trust.review ? (
        <Frame label="Editorial and data review">
          <h2>Reviewed {formatDateLabel(dataset.trust.review.reviewedAt)}</h2>
          <p>{dataset.trust.review.summary}</p>
          <dl>{dataset.trust.review.sections.map((section) => <div key={section.label}><dt>{section.label}</dt><dd>{section.note}</dd></div>)}</dl>
        </Frame>
      ) : null}

      <section id="freshness"><FreshnessNotice dataset={dataset} expanded /></section>
      <Frame label="How updates reach the site">
        <h2>Source checks, then editorial review.</h2>
        <p>Weekday checks run after the usual morning releases. The official BLS calendar identifies which state, metro, and county observations are due. New observations and stale sources produce a review alert; they do not publish themselves.</p>
        <p>Regional jobs and wages: {regionalEconomy.period}, retrieved {formatDateLabel(regionalEconomy.retrievedAt, SHORT_DATE)}. These are all-industry county benchmarks, not totals for the atlas's illustrative regions.</p>
        <p>Project announcements and TJ’s Read are reviewed separately. A data refresh does not change the date on an older article, and it does not confirm that a construction milestone was met.</p>
        <a href={releaseCalendar.sourceUrl}>Official BLS calendar, checked {formatDateLabel(releaseCalendar.checkedAt, SHORT_DATE)} ↗</a>
        <div className="v3-release-grid">{releaseCalendar.releases.filter((release) => release.releaseDate >= new Date().toISOString().slice(0, 10)).slice(0, 4).map((release) => <article key={`${release.program}-${release.releaseDate}`}><strong>{release.label}</strong><p>Scheduled: {formatDateLabel(release.releaseDate, SHORT_DATE)}</p></article>)}</div>
      </Frame>

      <Frame label="Release calendar">
        <div className="v3-panel-head">
          <div>
            <h2>A source with no new data is different from a refresh that failed.</h2>
            <p>The calendar identifies the latest official period and the next expected publication window.</p>
          </div>
        </div>
        <div className="v3-release-grid">
          {dataset.trust.releaseCalendar.map((release) => (
            <article key={release.id}>
              <div>
                <span>{release.cadence}</span>
                <strong>{release.label}</strong>
              </div>
              <dl>
                <div>
                  <dt>Latest period</dt>
                  <dd>{release.latestPeriod}</dd>
                </div>
                <div>
                  <dt>Released</dt>
                  <dd>{releasedOrUnrecorded(release.latestReleaseDate)}</dd>
                </div>
                <div>
                  <dt>Next expected</dt>
                  <dd>{nextOrUnscheduled(release.nextExpectedRelease)}</dd>
                </div>
              </dl>
              <p>{release.note}</p>
              <a href={release.sourceUrl} target="_blank" rel="noreferrer">
                {release.sourceLabel}
              </a>
            </article>
          ))}
        </div>
      </Frame>

      <Frame label="Headline metric vintages">
        <div className="v3-vintage-table" role="table" aria-label="Headline metric vintages">
          <div className="v3-vintage-row v3-vintage-head" role="row">
            <span role="columnheader">Metric</span>
            <span role="columnheader">Observation</span>
            <span role="columnheader">Released</span>
            <span role="columnheader">Next</span>
            <span role="columnheader">Revision status</span>
          </div>
          {dataset.trust.metricVintages.map((vintage) => (
            <div className="v3-vintage-row" role="row" key={vintage.metricId}>
              <strong role="cell">
                {vintage.label}
                <a href={vintage.sourceUrl} target="_blank" rel="noreferrer">
                  {vintage.sourceLabel}
                </a>
              </strong>
              <span role="cell" data-label="Observation">{vintage.observationPeriod}</span>
              <span role="cell" data-label="Released">{releasedOrUnrecorded(vintage.releaseDate)}</span>
              <span role="cell" data-label="Next">{nextOrUnscheduled(vintage.nextExpectedRelease)}</span>
              <small role="cell" data-label="Revision status">{vintage.revisionStatus}</small>
            </div>
          ))}
        </div>
      </Frame>

      <section className="v3-trust-band" id="methodology">
        <div>
          <p className="v3-kicker">Methodology</p>
          <h2>How we handle the numbers.</h2>
        </div>
        <div className="v3-method-grid">
          <article>
            <strong>Refresh</strong>
            <p>The core series on jobs, population, new businesses, output, metros, industries, and peer states are refreshed from public data feeds and checked before use.</p>
          </article>
          <article>
            <strong>Revision</strong>
            <p>When an agency revises a number, the new figure replaces the old one. Comparisons between releases mark revisions separately from new periods.</p>
          </article>
          <article>
            <strong>Conflict</strong>
            <p>Headline numbers come only from official statistical releases. Other sources are shown as context, and they are never mixed into an official figure.</p>
          </article>
          <article>
            <strong>Inference</strong>
            <p>Forecasts, scores, and our own analysis are labeled as Floridanomics analysis and link to the evidence behind them.</p>
          </article>
        </div>
      </section>

      <Frame label="Source classes">
        <div className="v3-source-class-grid">
          {dataset.trust.sourceClasses.map((sourceClass) => (
            <article key={sourceClass.id}>
              <span>
                {sourceClass.id === "editorial_inference"
                  ? "Analysis"
                  : `${sourceCounts[sourceClass.id as SourceClassification] ?? 0} sources`}
              </span>
              <strong>{sourceClass.label}</strong>
              <p>{sourceClass.description}</p>
            </article>
          ))}
        </div>
      </Frame>

      <section className="v3-corrections" id="corrections">
        <div>
          <p className="v3-kicker">Corrections</p>
          <h2>How we handle corrections.</h2>
        </div>
        <div>
          <p>{dataset.trust.correctionPolicy.commitment}</p>
          <a href={`mailto:${dataset.trust.correctionPolicy.contact}`}>{dataset.trust.correctionPolicy.contact}</a>
          <small>Policy reviewed {formatDateLabel(dataset.trust.correctionPolicy.reviewedAt, SHORT_DATE)}</small>
        </div>
      </section>

      <EvidenceExport dataset={dataset} />
    </>
  );
}
