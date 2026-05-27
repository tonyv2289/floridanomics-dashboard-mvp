import { Suspense, lazy } from "react";
import clsx from "clsx";
import "./app-frame.css";

const LegacyDashboard = lazy(() => import("./v1/LegacyDashboard"));
const DashboardV2 = lazy(() => import("./v2/DashboardV2"));

type VersionId = "v1" | "v2";

function resolveVersion(): VersionId {
  if (typeof window === "undefined") {
    return "v1";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("version") === "v2" ? "v2" : "v1";
}

function buildHref(version: VersionId): string {
  if (typeof window === "undefined") {
    return `?version=${version}`;
  }

  const params = new URLSearchParams(window.location.search);
  params.set("version", version);
  return `${window.location.pathname}?${params.toString()}`;
}

function App() {
  const version = resolveVersion();
  const ActiveDashboard = version === "v1" ? LegacyDashboard : DashboardV2;

  return (
    <div className="compare-frame">
      <header className="compare-bar">
        <div className="compare-copy">
          <p className="compare-kicker">Floridanomics Comparison Mode</p>
          <h1>Compare the preserved build against the first-principles rewrite.</h1>
          <p className="compare-note">
            `v1` stays the default until the rewrite clears design and content review. `v2` is the side-by-side rebuild from the
            May 20 GitHub and Studio baseline.
          </p>
        </div>

        <nav className="compare-links" aria-label="Dashboard version switcher">
          <a className={clsx("compare-link", version === "v2" && "compare-link-active")} href={buildHref("v2")}>
            Open v2 rewrite
          </a>
          <a className={clsx("compare-link", version === "v1" && "compare-link-active")} href={buildHref("v1")}>
            Open preserved v1
          </a>
        </nav>
      </header>

      <Suspense
        fallback={
          <main className="compare-loading">
            <div className="compare-loading-card">
              <p className="compare-kicker">Loading dashboard</p>
              <h2>Pulling the selected version into view.</h2>
            </div>
          </main>
        }
      >
        <ActiveDashboard />
      </Suspense>
    </div>
  );
}

export default App;
