import * as React from "react";
import { REGIONS, SOURCE_CHECKED } from "../atlas/data";
import { REGION_COUNTIES, type RegionalEconomy } from "./geographies";
import { REGIONAL_PROFILES, regionalPath, type RegionalProfile, type RegionalEntry } from "./profiles";

function Entry({ entry }: { entry: RegionalEntry }) {
  return <article className="region-entry"><h3>{entry.name}</h3><p>{entry.detail}</p><a href={entry.source.url} target="_blank" rel="noopener noreferrer">{entry.source.label} ↗</a><small>Source date / page checked: {entry.source.asOf}</small></article>;
}

export function RegionProfile({ profile, economy, base = "/" }: { profile: RegionalProfile; economy: RegionalEconomy; base?: string }) {
  const [shareStatus, setShareStatus] = React.useState("");
  const atlasRegion = REGIONS.find((region) => region.id === profile.id)!;
  const otherAnchors = atlasRegion.assets.filter((asset) => !profile.research.some((entry) => entry.source.url === asset.source) && !profile.employers.some((entry) => entry.source.url === asset.source));
  const counties = REGION_COUNTIES[profile.id].map((county) => economy.counties.find((row) => row.fips === county.fips)).filter((row) => row !== undefined);
  const employmentMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(economy.employmentMonth));
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://www.floridanomics.com${regionalPath(profile.id)}`);
      setShareStatus("Link copied");
    } catch { setShareStatus("Copy this page's address to share it."); }
  };
  return <main className="region-page" id="region-main">
    <div className="region-breadcrumb"><a href={`${base}?view=atlas`}>← All regions</a><span>Regional profile · Reviewed {profile.reviewedAt}</span></div>
    <header className="region-heading"><p className="region-kicker">Florida Brain / Regional Economy</p><h1>{profile.title}</h1><p>{profile.description}</p>
      <div className="region-actions"><a href={`${base}?view=atlas&region=${profile.id}`}>See this region on the map ↗</a><button type="button" onClick={copyLink}>Copy profile link</button><span role="status">{shareStatus}</span></div>
    </header>
    <div className="region-layout"><div>
      <section className="region-section"><h2>The Economic Read</h2><p>{profile.read}</p><p className="region-small">Floridanomics analysis, based on the institutions and sources below. Not an official forecast or a measured impact estimate.</p></section>
      <section className="region-section"><h2>Employers to Know</h2><p className="region-small">Selected examples, not a ranking or a complete employer census.</p>{profile.employers.map((entry) => <Entry key={entry.name} entry={entry} />)}</section>
      <section className="region-section"><h2>Research & Commercialization</h2>{profile.research.map((entry) => <Entry key={entry.name} entry={entry} />)}</section>
      <section className="region-section"><h2>Projects & Operating Milestones</h2>{profile.projects.map((project) => <div className="region-project" key={project.name}><div className="region-project-status"><span>{project.status}</span><small>{project.milestone}</small></div><Entry entry={project} /></div>)}</section>
      {otherAnchors.length > 0 && <section className="region-section"><h2>Other Regional Anchors</h2><div className="region-anchor-grid">{otherAnchors.map((asset) => <Entry key={asset.id} entry={{ name: asset.name, detail: asset.summary, source: { label: asset.sourceName, url: asset.source, asOf: SOURCE_CHECKED } }} />)}</div></section>}
    </div><aside className="region-context" aria-label="Workforce figures and regional context">
      <section className="region-workforce"><p className="region-kicker">Workforce & Pay</p><h2>Selected County Benchmarks</h2><p>Jobs in {employmentMonth}. Average weekly wages in {economy.period}.</p>
        <div className="region-table-wrap"><table><caption>All industries, public and private employers</caption><thead><tr><th scope="col">County</th><th scope="col">Jobs</th><th scope="col">Weekly wage</th></tr></thead><tbody>{counties.map((county) => <tr key={county.fips}><th scope="row">{county.name}</th><td>{county.jobs.toLocaleString("en-US")}</td><td>${county.weeklyWage.toLocaleString("en-US")}</td></tr>)}</tbody></table></div>
        <p className="region-small">BLS QCEW counts covered jobs by place of work, not residents in the labor force. Wages are nominal averages across covered jobs, not median household income or pay in a specific occupation. Data are not seasonally adjusted and may be revised.</p>
        <p className="region-small">These counties are reference points, not totals for the illustrated map region. Counties and map pieces have different boundaries.</p>
        <a href={economy.sourceUrl}>BLS QCEW source data ↗</a><small>Retrieved {economy.retrievedAt}</small>
      </section>
      <section className="region-watch"><h2>What to Watch</h2><p>{profile.watch}</p></section>
      <a className="region-data-link" href={`${base}?view=dashboard&tab=talent`}>Explore statewide talent & wage comparisons →</a>
    </aside></div>
    <nav className="region-next" aria-label="Other regional profiles"><h2>Keep Exploring Florida</h2>{REGIONAL_PROFILES.filter((region) => region.id !== profile.id).map((region) => <a key={region.id} href={regionalPath(region.id, base)}>{region.title} →</a>)}</nav>
    <footer className="region-foot"><p>Public-source regional profiles. Milestone dates and source-check dates are distinct. Project announcements remain subject to delivery, and listed institutions do not imply endorsement of Floridanomics.</p><a href={`${base}?view=dashboard&tab=evidence`}>Sources & correction policy</a></footer>
  </main>;
}
