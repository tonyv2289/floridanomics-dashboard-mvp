import { useEffect, useState } from "react";
import { Frame } from "./primitives";

type PolicyItem = {
  billId: number;
  number: string;
  title: string;
  status: string;
  lastAction: string;
  lastActionDate: string;
  url: string;
};

type PolicyPayload = {
  status: "pending" | "live";
  generatedAt: string | null;
  items: PolicyItem[];
  note?: string;
};

export function PolicyMemo() {
  const [payload, setPayload] = useState<PolicyPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/policy-watch.json`, { cache: "default" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as PolicyPayload;
        if (!cancelled) {
          setPayload(data);
        }
      } catch {
        // Optional panel: render nothing if the file is missing.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!payload) {
    return null;
  }

  const live = payload.status === "live" && payload.items.length > 0;

  return (
    <Frame label="Policy watch">
      <div className="v3-panel-head">
        <div>
          <h2>{live ? "Where Florida economic-policy bills stand." : "Florida policy tracking, ready to connect."}</h2>
          <p>
            {live
              ? "Tracked bills relevant to economic development, technology, and workforce. Source: LegiScan (CC BY 4.0)."
              : "Connect a LegiScan API key to track Florida economic-policy legislation here."}
          </p>
        </div>
      </div>

      {live ? (
        <div className="v3-table">
          {payload.items.map((item) => (
            <a key={item.billId} className="v3-policy-row" href={item.url} target="_blank" rel="noreferrer">
              <span className="v3-policy-number">{item.number}</span>
              <span className="v3-policy-title">{item.title}</span>
              <span className="v3-policy-status">
                {item.status} · {item.lastActionDate}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </Frame>
  );
}
