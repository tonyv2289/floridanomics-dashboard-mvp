export type AppView = "briefing" | "dashboard";

const DASHBOARD_DEEP_LINKS = ["tab", "competitionView", "lens", "metric", "innovationMetric"];

export function resolveAppView(search: string): AppView {
  const params = new URLSearchParams(search);
  const requestedView = params.get("view");

  if (requestedView === "briefing") {
    return "briefing";
  }

  if (requestedView === "dashboard" || DASHBOARD_DEEP_LINKS.some((name) => params.has(name))) {
    return "dashboard";
  }

  return "briefing";
}
