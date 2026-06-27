import { useEffect, useState } from "react";

const KEY = "fn:lastSeenGeneratedAt";

function readStored(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Lightweight personalization/memory: remembers the dataset version a visitor last saw
 * and reports when the data has updated since. The foundation for "new since your last
 * visit" habit cues. Reads the prior value once via a lazy state initializer (at first
 * render) and only writes to localStorage in the effect.
 */
export function useFreshnessMemory(generatedAt: string | undefined): {
  isReturningWithUpdate: boolean;
  previousSeen: string | null;
} {
  const [previousSeen] = useState<string | null>(readStored);

  useEffect(() => {
    if (!generatedAt || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(KEY, generatedAt);
    } catch {
      // localStorage blocked (private mode, etc.): skip personalization.
    }
  }, [generatedAt]);

  const isReturningWithUpdate = Boolean(generatedAt && previousSeen && previousSeen !== generatedAt);

  return { isReturningWithUpdate, previousSeen };
}
