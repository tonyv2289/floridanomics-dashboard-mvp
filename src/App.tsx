import { Suspense, lazy } from "react";
import clsx from "clsx";
import "./app-frame.css";

const LegacyDashboard = lazy(() => import("./v1/LegacyDashboard"));
const DashboardV2 = lazy(() => import("./v2/DashboardV2"));
const DashboardV3 = lazy(() => import("./v3/DashboardV3"));

type VersionId = "v1" | "v2" | "v3";
const DEFAULT_VERSION: VersionId = "v3";

function resolveVersion(): VersionId {
  if (typeof window === "undefined") {
    return DEFAULT_VERSION;
  }

  const params = new URLSearchParams(window.location.search);
  const version = params.get("version");
  return version === "v1" || version === "v2" || version === "v3" ? version : DEFAULT_VERSION;
}

function isCompareMode(version: VersionId): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("compare") === "1" || params.has("version") || version === "v1";
}

function buildHref(version: VersionId): string {
  if (typeof window === "undefined") {
    return `?compare=1&version=${version}`;
  }

  const params = new URLSearchParams(window.location.search);
  params.set("version", version);
  params.set("compare", "1");
  return `${window.location.pathname}?${params.toString()}`;
}

function App() {
  const version = resolveVersion();
  const compareMode = isCompareMode(version);
  const ActiveDashboard = version === "v1" ? LegacyDashboard : version === "v2" ? DashboardV2 : DashboardV3;

  return (
    <div className="compare-frame">
      {!compareMode ? (
        <a className="compare-launch-link" href={buildHref("v3")}>
          Compare dashboard versions
        </a>
      ) : null}

      {compareMode ? (
        <header className="compare-bar">
          <div className="compare-copy">
            <p className="compare-kicker">Floridanomics Comparison Mode</p>
            <h1>Compare the published builds against the first-principles rewrite.</h1>
            <p className="compare-note">
              `v3` is the new first-principles candidate. `v2` remains the published dashboard, and `v1` stays preserved
              for fallback and review.
            </p>
          </div>

          <nav className="compare-links" aria-label="Dashboard version switcher">
            <a className={clsx("compare-link", version === "v3" && "compare-link-active")} href={buildHref("v3")}>
              Open v3 rewrite
            </a>
            <a className={clsx("compare-link", version === "v2" && "compare-link-active")} href={buildHref("v2")}>
              Open published v2
            </a>
            <a className={clsx("compare-link", version === "v1" && "compare-link-active")} href={buildHref("v1")}>
              Open preserved v1
            </a>
          </nav>
        </header>
      ) : null}

      <Suspense
        fallback={
          <main className={clsx("compare-loading", compareMode && "compare-loading-with-bar")}>
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
