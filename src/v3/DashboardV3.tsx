import { Suspense, lazy, useEffect, useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useFreshnessMemory } from "../hooks/useFreshnessMemory";
import { usePreferences, REGION_OPTIONS } from "../hooks/usePreferences";
import { AttentionStrip } from "./AttentionStrip";
import { EvidenceExport } from "./EvidenceExport";
import {
  type CoreMetricId,
  formatDateLabel,
  isCoreMetricId,
  isInnovationMetricId,
} from "../lib/dashboard";
import { trackDashboardView } from "../lib/analytics";
import { type CompetitionViewId, type V3TabId } from "./constants";
import { isCompetitionViewId, isV3TabId, readSearchParam } from "./url";
import { SourceFooter, TabNav } from "./primitives";
import { BrandMark } from "./BrandMark";
import { SignupForm } from "../components/SignupForm";
import { BriefTab } from "./BriefTab";
import { LensTab } from "./LensTab";
import { isLensId, type LensId } from "./lenses";
import {
  DEFAULT_TALENT_CLUSTER_ID,
  filterTalentClusters,
  isTalentClusterId,
  isTalentFocus,
  isTalentSort,
  type TalentFocus,
  type TalentSort,
} from "./talent-match";
// Chart-bearing tabs are lazy-loaded so the chart library (Recharts) stays off the
// default Brief landing and only loads when a chart tab is opened.
const CompetitionTab = lazy(() => import("./CompetitionTab").then((m) => ({ default: m.CompetitionTab })));
const StrategyTab = lazy(() => import("./StrategyTab").then((m) => ({ default: m.StrategyTab })));
const TalentTab = lazy(() => import("./TalentTab").then((m) => ({ default: m.TalentTab })));
const TerminalTab = lazy(() => import("./TerminalTab").then((m) => ({ default: m.TerminalTab })));
const ScorecardTab = lazy(() => import("./ScorecardTab").then((m) => ({ default: m.ScorecardTab })));
const InnovationTab = lazy(() => import("./InnovationTab").then((m) => ({ default: m.InnovationTab })));
const TradeTab = lazy(() => import("./TradeTab").then((m) => ({ default: m.TradeTab })));
import type { InnovationMetricId } from "../types/dashboard";
import "./dashboard-v3.css";

function DashboardV3() {
  const { data, error, status } = useDashboardData();
  const { isReturningWithUpdate } = useFreshnessMemory(data?.generatedAt);
  const { region, setRegion } = usePreferences();
  const [activeTab, setActiveTab] = useState<V3TabId>(() => {
    const param = readSearchParam("tab");
    return isV3TabId(param) ? param : "brief";
  });
  const [activeCompetitionView, setActiveCompetitionView] = useState<CompetitionViewId>(() => {
    const viewParam = readSearchParam("competitionView");
    return isCompetitionViewId(viewParam) ? viewParam : "projects";
  });
  const [activeLens, setActiveLens] = useState<LensId>(() => {
    const param = readSearchParam("lens");
    return isLensId(param) ? param : "logistics";
  });
  const [selectedMetricId, setSelectedMetricId] = useState<CoreMetricId>(() => {
    const param = readSearchParam("metric");
    return isCoreMetricId(param) ? param : "nonfarmPayrolls";
  });
  const [selectedInnovationMetricId, setSelectedInnovationMetricId] = useState<InnovationMetricId>(() => {
    const param = readSearchParam("innovationMetric");
    return isInnovationMetricId(param) ? param : "businessApplications";
  });
  const [selectedTalentClusterId, setSelectedTalentClusterId] = useState(
    () => readSearchParam("talentCluster") ?? DEFAULT_TALENT_CLUSTER_ID,
  );
  const [talentFocus, setTalentFocus] = useState<TalentFocus>(() => {
    const param = readSearchParam("talentFilter");
    return isTalentFocus(param) ? param : "all";
  });
  const [talentSort, setTalentSort] = useState<TalentSort>(() => {
    const param = readSearchParam("talentSort");
    return isTalentSort(param) ? param : "coverage";
  });
  const visibleTalentClusters = data
    ? filterTalentClusters(data.talent.clusters, talentFocus, talentSort)
    : [];
  const activeTalentClusterId =
    data &&
    isTalentClusterId(selectedTalentClusterId, data.talent) &&
    visibleTalentClusters.some((cluster) => cluster.id === selectedTalentClusterId)
      ? selectedTalentClusterId
      : (visibleTalentClusters[0]?.id ?? DEFAULT_TALENT_CLUSTER_ID);

  useEffect(() => {
    if (!data || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    if (activeTab === "competition") {
      params.set("competitionView", activeCompetitionView);
    } else {
      params.delete("competitionView");
    }
    if (activeTab === "lens") {
      params.set("lens", activeLens);
    } else {
      params.delete("lens");
    }
    if (activeTab === "talent") {
      params.set("talentCluster", activeTalentClusterId);
      if (talentFocus === "all") {
        params.delete("talentFilter");
      } else {
        params.set("talentFilter", talentFocus);
      }
      if (talentSort === "coverage") {
        params.delete("talentSort");
      } else {
        params.set("talentSort", talentSort);
      }
    } else {
      params.delete("talentCluster");
      params.delete("talentFilter");
      params.delete("talentSort");
    }
    if (activeTab === "scorecard") {
      params.set("metric", selectedMetricId);
    } else {
      params.delete("metric");
    }
    if (activeTab === "innovation") {
      params.set("innovationMetric", selectedInnovationMetricId);
    } else {
      params.delete("innovationMetric");
    }
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    trackDashboardView({
      tab: activeTab,
      competitionView: activeTab === "competition" ? activeCompetitionView : undefined,
      lens: activeTab === "lens" ? activeLens : undefined,
      talentCluster: activeTab === "talent" ? activeTalentClusterId : undefined,
      talentFilter: activeTab === "talent" ? talentFocus : undefined,
      talentSort: activeTab === "talent" ? talentSort : undefined,
      metric: activeTab === "scorecard" ? selectedMetricId : undefined,
      innovationMetric: activeTab === "innovation" ? selectedInnovationMetricId : undefined,
    });
  }, [
    activeCompetitionView,
    activeLens,
    activeTab,
    activeTalentClusterId,
    data,
    selectedInnovationMetricId,
    selectedMetricId,
    talentFocus,
    talentSort,
  ]);

  if (status === "error") {
    return (
      <main className="v3-root" role="alert">
        <section className="v3-state">
          <p className="v3-kicker">Data load error</p>
          <h1>The dashboard could not load the Florida dataset.</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!data || status === "loading") {
    return (
      <main className="v3-root">
        <section className="v3-state" role="status" aria-live="polite">
          <p className="v3-kicker">Floridanomics</p>
          <h1>Loading the operating brief.</h1>
          <p>Pulling the current Florida dataset.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="v3-root" id="v3-main">
      <div className="v3-shell">
        <div className="v3-masthead">
          <div>
            <div className="v3-brand">
              <BrandMark metric={data.metrics.nonfarmPayrolls} />
              <p className="v3-wordmark">
                FLORIDA<span>NOMICS</span>
              </p>
            </div>
            <h1>Florida economic intelligence, built as an operating brief.</h1>
          </div>
          <div className="v3-freshness">
            {isReturningWithUpdate ? (
              <span className="v3-fresh-pill">Updated since your last visit</span>
            ) : null}
            <span>Dataset</span>
            <strong>{formatDateLabel(data.generatedAt)}</strong>
            <small>Labor: {data.asOfLaborMarket} | Population: {data.asOfPopulation}</small>
            <a className="v3-briefing-link" href={import.meta.env.BASE_URL}>
              Open the briefing
            </a>
            <a
              className="v3-briefing-link"
              href={`${import.meta.env.BASE_URL}briefings/latest.png`}
              download
            >
              Download brief (PNG)
            </a>
            <label className="v3-region-select">
              <span className="v3-visually-hidden">Focus region</span>
              <select value={region} onChange={(event) => setRegion(event.target.value as typeof region)}>
                {REGION_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <TabNav activeTab={activeTab} onChange={setActiveTab} />

        <Suspense
          fallback={
            <div className="v3-state" role="status" aria-live="polite">
              <p className="v3-kicker">Loading</p>
              <h2>Opening the view.</h2>
            </div>
          }
        >
          {activeTab === "brief" ? <AttentionStrip dataset={data} region={region} /> : null}
          {activeTab === "brief" ? <BriefTab dataset={data} /> : null}
          {activeTab === "brief" ? <EvidenceExport dataset={data} /> : null}
        {activeTab === "lens" ? (
          <LensTab dataset={data} activeLens={activeLens} onSelectLens={setActiveLens} />
        ) : null}
        {activeTab === "competition" ? (
          <CompetitionTab
            dataset={data}
            activeView={activeCompetitionView}
            onSelectView={setActiveCompetitionView}
          />
        ) : null}
        {activeTab === "strategy" ? <StrategyTab dataset={data} /> : null}
        {activeTab === "talent" ? (
          <TalentTab
            dataset={data}
            selectedClusterId={activeTalentClusterId}
            onSelectCluster={setSelectedTalentClusterId}
            focus={talentFocus}
            onFocusChange={setTalentFocus}
            sort={talentSort}
            onSortChange={setTalentSort}
          />
        ) : null}
        {activeTab === "terminal" ? <TerminalTab dataset={data} /> : null}
        {activeTab === "scorecard" ? (
          <ScorecardTab
            dataset={data}
            selectedMetricId={selectedMetricId}
            onSelectMetric={setSelectedMetricId}
            region={region}
            onSelectRegion={setRegion}
          />
        ) : null}
        {activeTab === "innovation" ? (
          <InnovationTab
            dataset={data}
            selectedMetricId={selectedInnovationMetricId}
            onSelectMetric={setSelectedInnovationMetricId}
          />
        ) : null}
        {activeTab === "trade" ? <TradeTab dataset={data} /> : null}
        </Suspense>

        <SignupForm source={`dashboard:${activeTab}`} />
        <SourceFooter dataset={data} />
      </div>
    </main>
  );
}

export default DashboardV3;
