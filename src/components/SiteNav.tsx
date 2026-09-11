import * as React from "react";

export type SiteSection = "briefing" | "regions" | "industry" | "policy" | "sources";

const SITE_SECTIONS: Array<{ id: SiteSection; label: string; query: string }> = [
  { id: "briefing", label: "Briefing", query: "" },
  { id: "regions", label: "Regions", query: "?view=atlas" },
  { id: "industry", label: "Industry & Investment", query: "?view=dashboard&tab=competition" },
  { id: "policy", label: "Policy", query: "?view=dashboard&tab=policy" },
  { id: "sources", label: "Sources", query: "?view=dashboard&tab=evidence" },
];

export function SiteNav({ active, base = import.meta.env.BASE_URL }: { active: SiteSection; base?: string }): React.ReactElement {
  return <header className="site-header">
    <a className="site-wordmark" href={base} aria-label="Floridanomics home">FLORIDA<span>NOMICS</span></a>
    <nav aria-label="Main navigation">{SITE_SECTIONS.map((section) =>
      <a key={section.id} href={`${base}${section.query}`} aria-current={active === section.id ? "page" : undefined}>{section.label}</a>,
    )}</nav>
  </header>;
}
