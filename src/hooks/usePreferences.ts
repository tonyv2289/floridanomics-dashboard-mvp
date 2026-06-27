import { useEffect, useState } from "react";

export type FloridaRegion = "statewide" | "miami" | "tampa" | "orlando" | "jacksonville";

export const REGION_OPTIONS: Array<{ id: FloridaRegion; label: string }> = [
  { id: "statewide", label: "Statewide" },
  { id: "miami", label: "Miami" },
  { id: "tampa", label: "Tampa" },
  { id: "orlando", label: "Orlando" },
  { id: "jacksonville", label: "Jacksonville" },
];

const KEY = "fn:region";
const DEFAULT_REGION: FloridaRegion = "statewide";

function isRegion(value: string | null): value is FloridaRegion {
  return REGION_OPTIONS.some((option) => option.id === value);
}

function readRegion(): FloridaRegion {
  if (typeof window === "undefined") {
    return DEFAULT_REGION;
  }
  try {
    const stored = window.localStorage.getItem(KEY);
    return isRegion(stored) ? stored : DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

/** Persisted region preference. Lazy-init read, effect-only write (compiler-safe). */
export function usePreferences(): { region: FloridaRegion; setRegion: (region: FloridaRegion) => void } {
  const [region, setRegion] = useState<FloridaRegion>(readRegion);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(KEY, region);
    } catch {
      // localStorage blocked: preference is session-only.
    }
  }, [region]);

  return { region, setRegion };
}
