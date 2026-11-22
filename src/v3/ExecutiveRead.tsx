import { useState } from "react";
import clsx from "clsx";

type AudienceId = "operator" | "investor" | "policymaker" | "developer";

const AUDIENCES: Array<{ id: AudienceId; label: string }> = [
  { id: "operator", label: "CEO / operator" },
  { id: "investor", label: "Investor" },
  { id: "policymaker", label: "Policymaker" },
  { id: "developer", label: "Economic developer" },
];

export function ExecutiveRead() {
  const [audience, setAudience] = useState<AudienceId>("operator");
  const implications: Record<AudienceId, { headline: string; action: string }> = {
    operator: {
      headline: "The statewide numbers are a starting point. Hiring conditions differ by occupation and by region.",
      action: "Before you expand, check hiring and pay in the local market you are considering.",
    },
    investor: {
      headline: "Population growth supports demand. Productivity and export earnings decide how much the economy gains over time.",
      action: "Separate the businesses that serve local demand from those that sell technology, manufactured goods, and services to outside markets.",
    },
    policymaker: {
      headline: "An announced project counts once the money is spent, the site is operating, and people are hired.",
      action: "Track construction, private spending, supplier relationships, and wages against the original commitments.",
    },
    developer: {
      headline: "Investment decisions depend on available sites, reliable utilities, and workers with the required skills.",
      action: "Use the project comparisons to see what infrastructure and workers each prospect will need.",
    },
  };
  const implication = implications[audience];

  return (
    <section className="v3-executive-read" aria-label="Executive decision read">
      <div className="v3-implication-read">
        <div className="v3-audience-tabs" role="group" aria-label="Decision audience">
          {AUDIENCES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx(audience === item.id && "is-active")}
              aria-pressed={audience === item.id}
              onClick={() => setAudience(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div>
          <p className="v3-kicker">Economic Implications</p>
          <h2>{implication.headline}</h2>
          <p>{implication.action}</p>
        </div>
      </div>
    </section>
  );
}
