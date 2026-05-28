import { useEffect, useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
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
import { BriefTab } from "./BriefTab";
import { CompetitionTab } from "./CompetitionTab";
import { TerminalTab } from "./TerminalTab";
import { ScorecardTab } from "./ScorecardTab";
import { InnovationTab } from "./InnovationTab";
import { TradeTab } from "./TradeTab";
import type { InnovationMetricId } from "../types/dashboard";
import "./dashboard-v3.css";

function DashboardV3() {
  const { data, error, status } = useDashboardData();
  const [activeTab, setActiveTab] = useState<V3TabId>(() => {
    const param = readSearchParam("tab");
    if (param === "strategy") {
      return "competition";
    }

    return isV3TabId(param) ? param : "brief";
  });
  const [activeCompetitionView, setActiveCompetitionView] = useState<CompetitionViewId>(() => {
    const tabParam = readSearchParam("tab");
    const viewParam = readSearchParam("competitionView");
    if (tabParam === "strategy") {
      return "strategy";
    }

    return isCompetitionViewId(viewParam) ? viewParam : "metro";
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
    params.set("metric", selectedMetricId);
    params.set("innovationMetric", selectedInnovationMetricId);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    trackDashboardView({
      tab: activeTab,
      competitionView: activeTab === "competition" ? activeCompetitionView : undefined,
      metric: selectedMetricId,
      innovationMetric: selectedInnovationMetricId,
    });
  }, [activeCompetitionView, activeTab, data, selectedInnovationMetricId, selectedMetricId]);

  if (status === "error") {
    return (
      <main className="v3-root">
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
        <section className="v3-state">
          <p className="v3-kicker">Floridanomics v3</p>
          <h1>Loading the operating brief.</h1>
          <p>Pulling the current Florida dataset into the new reading surface.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="v3-root">
      <div className="v3-shell">
        <div className="v3-masthead">
          <div>
            <p className="v3-kicker">Floridanomics v3 | first-principles rewrite</p>
            <h1>Florida economic intelligence, rewritten as an operating brief.</h1>
          </div>
          <div className="v3-freshness">
            <span>Dataset</span>
            <strong>{formatDateLabel(data.generatedAt)}</strong>
            <small>Labor: {data.asOfLaborMarket} | Population: {data.asOfPopulation}</small>
          </div>
        </div>

        <TabNav activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "brief" ? <BriefTab dataset={data} /> : null}
        {activeTab === "competition" ? (
          <CompetitionTab
            dataset={data}
            activeView={activeCompetitionView}
            onSelectView={setActiveCompetitionView}
          />
        ) : null}
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

        <SourceFooter dataset={data} />
      </div>
    </main>
  );
}

export default DashboardV3;
