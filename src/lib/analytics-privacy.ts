/** Analytics never needs invite tokens, fragments, credentials, or arbitrary query text. */
export function sanitizeAnalyticsUrl(raw: string, base: string): string {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

export function safeCampaignProps(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const props: Record<string, string> = {};
  // Deliberately exclude invite/ref, free-text search terms, and per-recipient IDs.
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = params.get(key);
    if (value && /^[a-z0-9][a-z0-9_-]{0,47}$/i.test(value)) props[key] = value;
  }
  return props;
}
