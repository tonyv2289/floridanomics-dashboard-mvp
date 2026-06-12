import { useEffect, useState } from "react";
import clsx from "clsx";
import { formatDateLabel } from "../lib/dashboard";
import { Frame } from "./primitives";

type WhatChangedItem = {
  id: string;
  label: string;
  kind: "new_period" | "revision";
  scope: string;
  tone: "good" | "warn" | "flat";
  headline: string;
};

type WhatChangedPayload = {
  generatedAt: string;
  period: string;
  prevPeriod: string;
  items: WhatChangedItem[];
};

export function WhatChanged() {
  const [payload, setPayload] = useState<WhatChangedPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/what-changed.json`, { cache: "no-cache" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as WhatChangedPayload;
        if (!cancelled && Array.isArray(data.items) && data.items.length > 0) {
          setPayload(data);
        }
      } catch {
        // The panel is optional; render nothing if the payload is missing.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!payload) {
    return null;
  }

  return (
    <Frame label="What changed">
      <div className="v3-panel-head">
        <div>
          <h2>The numbers that moved in the latest refresh.</h2>
          <p>From the {formatDateLabel(payload.generatedAt)} data update. Generated automatically by the pipeline.</p>
        </div>
      </div>

      <ul className="v3-change-list">
        {payload.items.map((item) => (
          <li key={item.id}>
            <span className={clsx("v3-change-dot", `tone-${item.tone}`)} aria-hidden="true" />
            <span>{item.headline}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
