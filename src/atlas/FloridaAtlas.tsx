import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import florida from "../data/florida.geo.json";
import { ALL_ASSETS, REGIONS, SECTORS, SOURCE_CHECKED, TOUR, nextTourRegion, projectLocation, readAtlasQuery, regionMatches } from "./data";
import type { Sector } from "./data";
import type { AtlasSceneController } from "./scene";
import "./atlas.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerMotion = () => true;
const mapPath = florida.geometry.coordinates.flatMap((polygon) => polygon.map((ring) => ring.map((coordinate, i) => {
  const [x, z] = projectLocation(coordinate);
  return `${i === 0 ? "M" : "L"}${(x + 6) * 40},${(z + 5) * 40}`;
}).join(" ") + "Z")).join(" ");

export default function FloridaAtlas() {
  const [regionId, setRegionId] = useState<string | null>(() => readAtlasQuery(window.location.search).regionId);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [sector, setSector] = useState<Sector>(() => readAtlasQuery(window.location.search).sector);
  const [paused, setPaused] = useState(false);
  const [flatMap, setFlatMap] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerMotion);
  const motion = !paused && !reducedMotion;
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef(new Map<string, HTMLButtonElement>());
  const controllerRef = useRef<AtlasSceneController | null>(null);
  const selectedRegion = REGIONS.find((region) => region.id === regionId);
  const visibleRegions = REGIONS.filter((region) => regionMatches(region, sector));
  const visibleAssets = selectedRegion?.assets.filter((asset) => sector === "All sectors" || asset.sector === sector) ?? [];
  const selectedAsset = visibleAssets.find((asset) => asset.id === assetId) ?? visibleAssets[0];
  const isFlat = flatMap || sceneStatus === "unavailable";

  const selectRegion = useCallback((id: string | null) => {
    setRegionId(id);
    setAssetId(null);
  }, []);
  const selectAsset = useCallback((id: string, asset: string) => {
    setRegionId(id);
    setAssetId(asset);
  }, []);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Explore Florida | Florida Brain";
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "atlas");
    if (regionId) url.searchParams.set("region", regionId); else url.searchParams.delete("region");
    if (sector !== "All sectors") url.searchParams.set("sector", sector); else url.searchParams.delete("sector");
    window.history.replaceState(null, "", url);
  }, [regionId, sector]);

  useEffect(() => {
    if (isFlat) return;
    let cancelled = false;
    let engine: AtlasSceneController | undefined;
    import("./scene").then(({ createAtlasScene }) => {
      if (cancelled || !hostRef.current) return;
      try {
        engine = createAtlasScene({ host: hostRef.current, labels: labelsRef.current, onAsset: selectAsset, onFailure: () => setSceneStatus("unavailable") });
        controllerRef.current = engine;
        setSceneStatus("ready");
      } catch {
        setSceneStatus("unavailable");
      }
    }).catch(() => { if (!cancelled) setSceneStatus("unavailable"); });
    return () => { cancelled = true; engine?.dispose(); controllerRef.current = null; };
  }, [isFlat, selectAsset]);

  useEffect(() => {
    controllerRef.current?.update({ regionId, assetId: selectedAsset?.id ?? null, sector, motion });
  }, [regionId, selectedAsset?.id, sector, motion, sceneStatus, flatMap]);

  const changeSector = (value: Sector) => {
    setSector(value);
    if (selectedRegion && !regionMatches(selectedRegion, value)) selectRegion(null);
    setAssetId(null);
  };
  const tour = (direction: 1 | -1) => {
    setSector("All sectors");
    selectRegion(nextTourRegion(regionId, direction));
  };
  const toggleMap = () => {
    if (flatMap) setSceneStatus("loading");
    setFlatMap((value) => !value);
  };

  return (
    <main className="atlas" id="atlas-main">
      <header className="atlas-header">
        <a className="atlas-brand" href="?view=briefing" aria-label="Florida Brain, open the economic briefing">
          <span className="atlas-brand-icon" aria-hidden="true">F<span>B</span></span>
          <span>FLORIDA <b>BRAIN</b><small>THE REGIONAL ATLAS</small></span>
        </a>
        <nav aria-label="Florida Brain views" className="atlas-top-nav">
          <a href="?view=briefing">Briefing</a>
          <a href="?view=dashboard">Dashboard</a>
          <a href="?view=atlas" aria-current="page">Explore Florida</a>
        </nav>
        <span className="atlas-edition"><i /> FIELD NOTES / 01</span>
      </header>

      <div className="atlas-workspace">
        <aside className="atlas-sidebar" aria-label="Atlas navigation">
          <p className="atlas-eyebrow">ONE STATE. MANY FRONTIERS.</p>
          <h1>Meet the Florida<br />being <em>built.</em></h1>
          <p className="atlas-intro">The places, institutions and infrastructure shaping what comes next.</p>
          <div className="atlas-region-label"><span>EXPLORE BY REGION</span><span>08</span></div>
          <nav className="atlas-region-nav" aria-label="Regions">
            <button type="button" className={!regionId ? "is-active" : ""} aria-pressed={!regionId} onClick={() => selectRegion(null)}><span className="atlas-nav-dot" />All of Florida<span className="atlas-nav-count">↗</span></button>
            {REGIONS.map((region, index) => (
              <button type="button" key={region.id} className={regionId === region.id ? "is-active" : ""} disabled={!regionMatches(region, sector)} aria-pressed={regionId === region.id} onClick={() => selectRegion(region.id)}>
                <span className="atlas-nav-number">{String(index + 1).padStart(2, "0")}</span>{region.shortName}<span className="atlas-nav-count">{region.assets.length}</span>
              </button>
            ))}
          </nav>
          <label className="atlas-mobile-select">Choose a region
            <select value={regionId ?? ""} onChange={(event) => selectRegion(event.target.value || null)}>
              <option value="">All of Florida</option>
              {visibleRegions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          </label>
          <div className="atlas-sidebar-bottom"><span>28.1° N · 83.5° W</span><p>A field guide to the state’s productive economy.</p></div>
        </aside>

        <section className="atlas-map-section" aria-label="Interactive Florida regional map">
          <div className="atlas-map-caption"><span><i />{selectedRegion ? selectedRegion.name.toUpperCase() : "FLORIDA / STATEWIDE VIEW"}</span><span>{isFlat ? "2D MAP" : "3D ATLAS"}</span></div>
          <div className="atlas-map-host" ref={hostRef} style={isFlat ? { display: "none" } : undefined}>
            {sceneStatus === "loading" ? <div className="atlas-map-loading" role="status">Building your Florida view…</div> : null}
            {REGIONS.map((region) => <button type="button" key={region.id} ref={(element) => { if (element) labelsRef.current.set(region.id, element); else labelsRef.current.delete(region.id); }} className={`atlas-marker marker-${region.id}${regionId === region.id ? " is-selected" : ""}`} style={{ visibility: "hidden" }} onClick={() => selectRegion(region.id)} aria-label={`Explore ${region.name}`}><span className="atlas-marker-pin" /><span className="atlas-marker-text">{region.shortName}</span></button>)}
          </div>
          {isFlat ? <div className="atlas-flat-map">
            <svg viewBox="0 0 470 455" role="img" aria-labelledby="flat-map-title"><title id="flat-map-title">Florida geography and curated regional anchors. Choose a region using the buttons below or the region menu.</title>
              <path d={mapPath} fill="#172b3d" stroke="#ff8f3f" strokeWidth="0.9" fillRule="evenodd" />
              {visibleRegions.map((region, index) => { const [x, z] = projectLocation(region.coordinates); return <g key={region.id} transform={`translate(${(x + 6) * 40},${(z + 5) * 40})`}><circle r={regionId === region.id ? 9 : 6} fill={regionId === region.id ? "#ff8f3f" : "#56c2ff"} /><text x="11" y="4" fill="#e8eef9" fontSize="11">{index + 1}</text></g>; })}
            </svg>
            <div className="atlas-flat-regions">{visibleRegions.map((region, index) => <button type="button" key={region.id} aria-pressed={regionId === region.id} onClick={() => selectRegion(region.id)}>{index + 1}. {region.shortName}</button>)}</div>
          </div> : null}
          <div className="atlas-map-tools">
            <button type="button" aria-label="Zoom in" disabled={isFlat || sceneStatus !== "ready"} onClick={() => controllerRef.current?.zoom(1)}>+</button>
            <button type="button" aria-label="Zoom out" disabled={isFlat || sceneStatus !== "ready"} onClick={() => controllerRef.current?.zoom(-1)}>−</button>
            <button type="button" aria-label="Reset camera" disabled={isFlat || sceneStatus !== "ready"} onClick={() => controllerRef.current?.reset()}>↺</button>
          </div>
          <div className="atlas-map-bottom">
            <p>{sceneStatus === "unavailable" ? "3D is unavailable on this device. All profiles work in 2D." : isFlat ? "Every region is also available in the navigation." : "Drag to orbit · Scroll to zoom · Select a miniature"}</p>
            <div>
              <button type="button" aria-pressed={!motion} disabled={reducedMotion || isFlat} onClick={() => setPaused((value) => !value)}>{reducedMotion ? "Reduced motion" : motion ? "Ⅱ Pause motion" : "▷ Resume motion"}</button>
              <button type="button" aria-pressed={isFlat} onClick={toggleMap} disabled={sceneStatus === "unavailable"}>{sceneStatus === "unavailable" ? "2D fallback" : isFlat ? "3D view" : "2D view"}</button>
            </div>
          </div>
        </section>

        <aside className="atlas-detail" aria-label="Region and source-backed profiles">
          <div className="atlas-detail-scroll">
            <p className="atlas-eyebrow">{selectedRegion ? selectedRegion.detailed ? "REGIONAL FIELD NOTES" : "REGIONAL OVERVIEW" : "THE BIG PICTURE"}</p>
            <div aria-live="polite" aria-atomic="true" className="atlas-detail-heading">
              <h2>{selectedRegion ? selectedRegion.headline : <>A whole state<br />of possibility.</>}</h2>
              <p>{selectedRegion ? selectedRegion.description : "Follow the coast. Look beyond the skyline. Discover Florida’s launchpads, research campuses, working ports and emerging industrial clusters."}</p>
            </div>
            {selectedRegion ? <>
              <div className="atlas-detail-label"><span>PLACES TO KNOW</span><span>{String(visibleAssets.length).padStart(2, "0")}</span></div>
              <div className="atlas-asset-list" aria-label="Choose an anchor profile">
                {visibleAssets.map((asset) => <button type="button" key={asset.id} aria-pressed={selectedAsset?.id === asset.id} onClick={() => setAssetId(asset.id)}><span>{asset.name}<small>{asset.kind}</small></span><span aria-hidden="true">↗</span></button>)}
              </div>
              {selectedAsset ? <article className="atlas-profile" aria-live="polite">
                <span className="atlas-sector-tag">{selectedAsset.sector}</span>
                <h3>{selectedAsset.name}</h3>
                <p>{selectedAsset.summary}</p>
                <a href={selectedAsset.source} target="_blank" rel="noopener noreferrer">Read the primary source <span aria-hidden="true">↗</span></a>
                <small>{selectedAsset.sourceName}</small>
              </article> : <p>No matching assets in this region. Choose another sector.</p>}
              <button className="atlas-back" type="button" onClick={() => selectRegion(null)}>← Back to the whole state</button>
            </> : <>
              <div className="atlas-stats"><div><strong>08</strong><span>regional views</span></div><div><strong>{ALL_ASSETS.length}</strong><span>curated anchors</span></div></div>
              <div className="atlas-start"><span className="atlas-eyebrow">START EXPLORING</span><h3>From orbit to industry.</h3><p>Three closer looks at the infrastructure beneath Florida’s next chapter.</p><button type="button" onClick={() => { setSector("All sectors"); selectRegion(TOUR[0].id); }}>Take the three-region tour <span aria-hidden="true">↗</span></button></div>
              <p className="atlas-source-note">Public sources. Human-curated regions. Every anchor has a source you can open.</p>
            </>}
          </div>
          <div className="atlas-detail-foot"><i />CURATED PROTOTYPE · SEPTEMBER 2026</div>
        </aside>
      </div>

      <section className="atlas-filter-bar" aria-label="Filter regional anchors by sector">
        <span className="atlas-eyebrow">FOLLOW A SECTOR</span>
        <div className="atlas-sector-filters">{SECTORS.map((value) => <button key={value} type="button" aria-pressed={sector === value} onClick={() => changeSector(value)}>{value}</button>)}</div>
        <span className="atlas-filter-count" role="status">{visibleRegions.length} / 8 regions</span>
      </section>

      <section className="atlas-tour" aria-label="Three-region guided tour">
        <div className="atlas-tour-intro"><span className="atlas-eyebrow">A CLOSER LOOK</span><p>Three regional chapters.</p></div>
        {TOUR.map((region, index) => <button type="button" className={regionId === region.id ? "is-active" : ""} key={region.id} onClick={() => { setSector("All sectors"); selectRegion(region.id); }} aria-pressed={regionId === region.id}><span className="atlas-tour-number">0{index + 1}</span><span><strong>{region.name}</strong><small>{["Launch + logistics", "Chips + simulation", "Trade + defense + research"][index]}</small></span><span className="atlas-tour-arrow" aria-hidden="true">↗</span></button>)}
        <div className="atlas-tour-controls"><button type="button" aria-label="Previous tour region" onClick={() => tour(-1)}>←</button><button type="button" aria-label="Next tour region" onClick={() => tour(1)}>→</button></div>
      </section>
      <footer className="atlas-footer"><span>FLORIDA BRAIN <span className="atlas-footer-divider">/</span> AN ATLAS OF WHAT COMES NEXT</span><details><summary>Sources & map notes</summary><p>Sources checked {SOURCE_CHECKED}. This is a curated starting set, not an exhaustive inventory, a ranking or an official definition of Florida’s regions. Each profile links to its public primary source. Geography uses the project’s existing Florida outline. Anchor locations are approximate; miniatures are stylized and spread out in regional views for clarity. Motion is illustrative, never live telemetry. The dotted line is the three-chapter guided route, not a measured trade, capital or talent flow. No private CRM or relationship data is included.</p></details></footer>
    </main>
  );
}
