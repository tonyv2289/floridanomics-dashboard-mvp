export type V3TabId =
  | "brief"
  | "policy"
  | "evidence"
  | "lens"
  | "competition"
  | "strategy"
  | "talent"
  | "terminal"
  | "scorecard"
  | "innovation"
  | "trade";
export type CompetitionViewId = "projects" | "grants" | "metro" | "international" | "fdi";

export const PRIMARY_TAB_OPTIONS: Array<{ id: V3TabId; label: string; line: string }> = [
  { id: "brief", label: "Today", line: "what changed and why" },
  { id: "competition", label: "Competition", line: "projects, awards, metros, FDI" },
  { id: "policy", label: "Policy", line: "bills, choices, implications" },
  { id: "evidence", label: "Evidence", line: "vintages, sources, methods" },
];

export const DEEP_TAB_OPTIONS: Array<{ id: V3TabId; label: string; line: string }> = [
  { id: "lens", label: "Lenses", line: "reads by industry" },
  { id: "strategy", label: "Strategy", line: "peers, clusters, scenarios" },
  { id: "talent", label: "Talent", line: "degrees, demand, wages" },
  { id: "terminal", label: "Terminal", line: "forecasts and model" },
  { id: "scorecard", label: "Scorecard", line: "labor, metros, 2030" },
  { id: "innovation", label: "Innovation", line: "formation and capacity" },
  { id: "trade", label: "Trade", line: "exports and gateways" },
];

export const COMPETITION_VIEW_OPTIONS: Array<{ id: CompetitionViewId; label: string; line: string }> = [
  { id: "projects", label: "Project Capex", line: "announced, building, operating" },
  { id: "grants", label: "Government Awards", line: "awards, leverage, delivery" },
  { id: "metro", label: "US Metros", line: "Florida, Austin, Seattle, Boston" },
  { id: "international", label: "International Metros", line: "Miami, Dubai, Riyadh, Taipei, Singapore" },
  { id: "fdi", label: "FDI", line: "investment flows, employment, sources" },
];

export const TOOLTIP_STYLE = {
  backgroundColor: "rgba(2, 6, 13, 0.98)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: "8px",
  color: "#e8eef9",
};

export const TOOLTIP_LABEL_STYLE = {
  color: "#e8eef9",
  fontWeight: 700,
};

export const TOOLTIP_ITEM_STYLE = {
  color: "#c6d1df",
};
