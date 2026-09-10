import { formatDateLabel } from "../lib/dashboard";
import type { DashboardDataset, SourceClassification } from "../types/dashboard";
import { EvidenceExport } from "./EvidenceExport";
import { Frame } from "./primitives";

function dateOrPending(value: string | null): string {
  return value ? formatDateLabel(value, { month: "short", day: "numeric", year: "numeric" }) : "Not scheduled";
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
          <h1>Know the number, its vintage, and what can still change.</h1>
          <p>
            Floridanomics separates observations from release dates, official evidence from outside analysis, and
            sourced facts from editorial inference.
          </p>
        </div>
        <dl>
          <div>
            <dt>Data bundle built</dt>
            <dd>{formatDateLabel(dataset.generatedAt, { month: "short", day: "numeric", year: "numeric" })}</dd>
          </div>
          <div>
            <dt>Latest labor period</dt>
            <dd>{dataset.asOfLaborMarket}</dd>
          </div>
          <div>
            <dt>Methodology</dt>
            <dd>{dataset.trust.methodologyVersion}</dd>
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

      <Frame label="Release calendar">
        <div className="v3-panel-head">
          <div>
            <h2>No new data and a failed pipeline are different conditions.</h2>
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
                  <dd>{dateOrPending(release.latestReleaseDate)}</dd>
                </div>
                <div>
                  <dt>Next expected</dt>
                  <dd>{dateOrPending(release.nextExpectedRelease)}</dd>
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
              <span role="cell" data-label="Released">{dateOrPending(vintage.releaseDate)}</span>
              <span role="cell" data-label="Next">{dateOrPending(vintage.nextExpectedRelease)}</span>
              <small role="cell" data-label="Revision status">{vintage.revisionStatus}</small>
            </div>
          ))}
        </div>
      </Frame>

      <section className="v3-trust-band" id="methodology">
        <div>
          <p className="v3-kicker">Methodology</p>
          <h2>Evidence first, interpretation second.</h2>
        </div>
        <div className="v3-method-grid">
          <article>
            <strong>Refresh</strong>
            <p>Core labor, population, formation, output, metro, industry, and peer-state series refresh through validated public feeds.</p>
          </article>
          <article>
            <strong>Revision</strong>
            <p>The current official vintage replaces the prior value. Release-to-release comparisons label revisions separately from new periods.</p>
          </article>
          <article>
            <strong>Conflict</strong>
            <p>Official statistical releases control headline metrics. Other credible sources remain visible as context and are never silently blended.</p>
          </article>
          <article>
            <strong>Inference</strong>
            <p>Forecasts, scores, and strategic reads are labeled Floridanomics analysis and retain links to the evidence used to construct them.</p>
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
          <h2>A visible correction is stronger than a silent edit.</h2>
        </div>
        <div>
          <p>{dataset.trust.correctionPolicy.commitment}</p>
          <a href={`mailto:${dataset.trust.correctionPolicy.contact}`}>{dataset.trust.correctionPolicy.contact}</a>
          <small>Policy reviewed {dataset.trust.correctionPolicy.reviewedAt}</small>
        </div>
      </section>

      <EvidenceExport dataset={dataset} />
    </>
  );
}
