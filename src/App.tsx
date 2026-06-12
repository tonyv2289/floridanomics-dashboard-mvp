import { Suspense, lazy, useEffect } from "react";
import clsx from "clsx";
import { initAnalytics, trackOutboundLink } from "./lib/analytics";
import "./app-frame.css";

const DashboardV3 = lazy(() => import("./v3/DashboardV3"));
const Briefing = lazy(() => import("./briefing/Briefing"));

function isBriefingView(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("view") === "briefing";
}

function App() {
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
      <Suspense
        fallback={
          <main className={clsx("compare-loading")}>
            <div className="compare-loading-card">
              <p className="compare-kicker">Loading dashboard</p>
              <h2>Pulling the dashboard into view.</h2>
            </div>
          </main>
        }
      >
        {isBriefingView() ? <Briefing /> : <DashboardV3 />}
      </Suspense>
    </div>
  );
}

export default App;
