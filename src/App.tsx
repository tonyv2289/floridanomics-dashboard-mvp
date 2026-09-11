import { Suspense, lazy, useEffect } from "react";
import clsx from "clsx";
import { initAnalytics, trackOutboundLink } from "./lib/analytics";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { resolveAppView } from "./lib/routing";
import { SiteNav } from "./components/SiteNav";
import "./app-frame.css";

const DashboardV3 = lazy(() => import("./v3/DashboardV3"));
const Briefing = lazy(() => import("./briefing/Briefing"));
const FloridaAtlas = lazy(() => import("./atlas/FloridaAtlas"));
const RegionRoute = lazy(() => import("./regions/RegionRoute"));

function App() {
  const appView = resolveAppView(typeof window === "undefined" ? "" : window.location.search, typeof window === "undefined" ? "" : window.location.pathname);

  useEffect(() => {
    initAnalytics();

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (target instanceof HTMLAnchorElement) {
        trackOutboundLink(target.href, target.textContent);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="compare-frame">
      <a className="v3-skip-link" href={appView === "region" ? "#region-main" : appView === "atlas" ? "#atlas-main" : appView === "dashboard" ? "#v3-main" : "#briefing-main"}>
        Skip to content
      </a>
      {appView !== "dashboard" ? <SiteNav active={appView === "atlas" || appView === "region" ? "regions" : "briefing"} /> : null}
      <ErrorBoundary>
        <Suspense
          fallback={
            <main className={clsx("compare-loading")} role="status" aria-live="polite">
              <div className="compare-loading-card">
                <p className="compare-kicker">Loading Floridanomics</p>
                <h2>Loading Florida's Economic Data.</h2>
              </div>
            </main>
          }
        >
          {appView === "region" ? <RegionRoute /> : appView === "atlas" ? <FloridaAtlas /> : appView === "dashboard" ? <DashboardV3 /> : <Briefing />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
