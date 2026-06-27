import { Suspense, lazy, useEffect, useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useFreshnessMemory } from "../hooks/useFreshnessMemory";
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
// Chart-bearing tabs are lazy-loaded so the chart library (Recharts) stays off the
// default Brief landing and only loads when a chart tab is opened.
const CompetitionTab = lazy(() => import("./CompetitionTab").then((m) => ({ default: m.CompetitionTab })));
const StrategyTab = lazy(() => import("./StrategyTab").then((m) => ({ default: m.StrategyTab })));
const TerminalTab = lazy(() => import("./TerminalTab").then((m) => ({ default: m.TerminalTab })));
const ScorecardTab = lazy(() => import("./ScorecardTab").then((m) => ({ default: m.ScorecardTab })));
const InnovationTab = lazy(() => import("./InnovationTab").then((m) => ({ default: m.InnovationTab })));
const TradeTab = lazy(() => import("./TradeTab").then((m) => ({ default: m.TradeTab })));
import type { InnovationMetricId } from "../types/dashboard";
import "./dashboard-v3.css";

function DashboardV3() {
  const { data, error, status } = useDashboardData();
  const { isReturningWithUpdate } = useFreshnessMemory(data?.generatedAt);
  const [activeTab, setActiveTab] = useState<V3TabId>(() => {
    const param = readSearchParam("tab");
    return isV3TabId(param) ? param : "brief";
  });
  const [activeCompetitionView, setActiveCompetitionView] = useState<CompetitionViewId>(() => {
    const viewParam = readSearchParam("competitionView");
    return isCompetitionViewId(viewParam) ? viewParam : "metro";
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
    params.set("metric", selectedMetricId);
    params.set("innovationMetric", selectedInnovationMetricId);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    trackDashboardView({
      tab: activeTab,
      competitionView: activeTab === "competition" ? activeCompetitionView : undefined,
      lens: activeTab === "lens" ? activeLens : undefined,
      metric: selectedMetricId,
      innovationMetric: selectedInnovationMetricId,
    });
  }, [activeCompetitionView, activeLens, activeTab, data, selectedInnovationMetricId, selectedMetricId]);

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
            <a className="v3-briefing-link" href="?view=briefing">
              Open the briefing
            </a>
            <a
              className="v3-briefing-link"
              href={`${import.meta.env.BASE_URL}briefings/latest.png`}
              download
            >
              Download brief (PNG)
            </a>
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
          {activeTab === "brief" ? <BriefTab dataset={data} /> : null}
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
        {activeTab === "terminal" ? <TerminalTab dataset={data} /> : null}
        {activeTab === "scorecard" ? (
          <ScorecardTab dataset={data} selectedMetricId={selectedMetricId} onSelectMetric={setSelectedMetricId} />
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
