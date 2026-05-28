export type V3TabId = "brief" | "competition" | "terminal" | "scorecard" | "innovation" | "trade";
export type CompetitionViewId = "metro" | "international" | "strategy" | "fdi";

export const TAB_OPTIONS: Array<{ id: V3TabId; label: string; line: string }> = [
  { id: "brief", label: "Brief", line: "what matters now" },
  { id: "competition", label: "Competition", line: "metros, strategy, FDI" },
  { id: "terminal", label: "Terminal", line: "forecasts and policy alpha" },
  { id: "scorecard", label: "Scorecard", line: "labor, metros, 2030" },
  { id: "innovation", label: "Innovation", line: "formation and capacity" },
  { id: "trade", label: "Trade", line: "exports and gateways" },
];

export const COMPETITION_VIEW_OPTIONS: Array<{ id: CompetitionViewId; label: string; line: string }> = [
  { id: "metro", label: "US Metros", line: "Florida, Austin, Seattle, Boston" },
  { id: "international", label: "International Metros", line: "Miami, Dubai, Riyadh, Taipei, Singapore" },
  { id: "strategy", label: "Strategy", line: "peers, clusters, scenarios" },
  { id: "fdi", label: "FDI / Tools / Capacity", line: "capital, incentives, institutions" },
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
