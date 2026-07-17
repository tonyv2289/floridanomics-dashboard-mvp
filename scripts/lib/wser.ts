/**
 * WSER (FloridaCommerce Bureau of Workforce Statistics & Economic Research) source module.
 *
 * WSER is the state's own bureau and the authoritative Florida delivery of the same
 * LAUS/CES series the dashboard pulls from BLS, often released a touch earlier and with
 * native metro/county detail. We use it for: (1) source credibility, (2) a freshness
 * cross-check against the dashboard's BLS as-of month, and (3) a future live-data feeder.
 *
 * Dependency-free: uses global fetch + a browser User-Agent (floridajobs.org returns 403
 * to non-browser agents). The release files live on a stable CDN and are overwritten each
 * monthly release.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const RELEASE_BASE = "https://lmsresources.labormarketinfo.com/library/press";
const RELEASES_PAGE = "https://floridajobs.org/economic-data/monthly-data-releases";

export const WSER_SOURCE = {
  id: "wser_floridacommerce",
  name: "FloridaCommerce WSER (Bureau of Workforce Statistics & Economic Research)",
  url: "https://floridajobs.org/wser-home/about-wser",
  notes:
    "State of Florida bureau: monthly LAUS/CES employment, unemployment, and labor-force releases plus QCEW wages and OEWS. Authoritative Florida-native source.",
} as const;

/** Stable monthly-release file URLs (overwritten each release). */
export const WSER_RELEASE_FILES = {
  fullRelease: `${RELEASE_BASE}/release.pdf`,
  flUsLaborForce: `${RELEASE_BASE}/fl-us.pdf`,
  laborForceXlsx: `${RELEASE_BASE}/laus.xlsx`,
  nonagXlsx: `${RELEASE_BASE}/nonag.xlsx`,
  releaseDocx: `${RELEASE_BASE}/release.docx`,
  manufacturingPptx: `${RELEASE_BASE}/fl_manufacturing.pptx`,
  schedule: "https://lmsresources.labormarketinfo.com/library/DataReleaseSchedule.pdf",
} as const;

export interface WserReleaseInfo {
  /** Most recent due date parsed from the published 2026 schedule (ISO, or null). */
  latestReleaseDate: string | null;
  /** All release dates found on the page, ascending (ISO). */
  scheduledDates: string[];
  releasesPageUrl: string;
  files: typeof WSER_RELEASE_FILES;
}

export function floridaIsoDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) {
    throw new Error(`WSER fetch ${url} failed: HTTP ${res.status}`);
  }
  return res.text();
}

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

/** Parse "June 19, 2026" style dates out of the release-schedule text into ISO strings. */
function parseScheduleDates(text: string): string[] {
  const out = new Set<string>();
  const re = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),\s+(\d{4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const mm = MONTHS[m[1].toLowerCase()];
    const dd = m[2].padStart(2, "0");
    out.add(`${m[3]}-${mm}-${dd}`);
  }
  return Array.from(out).sort();
}

/**
 * Fetch WSER's monthly-data-release schedule and report the latest due date in Florida.
 * Best-effort: returns nulls (not throws) on network/parse failure so it never breaks a refresh.
 */
export async function fetchWserReleaseInfo(now: Date = new Date()): Promise<WserReleaseInfo> {
  let scheduledDates: string[] = [];
  try {
    const html = await fetchText(RELEASES_PAGE);
    scheduledDates = parseScheduleDates(html);
  } catch {
    scheduledDates = [];
  }
  const todayIso = floridaIsoDate(now);
  const past = scheduledDates.filter((d) => d <= todayIso);
  return {
    latestReleaseDate: past.length ? past[past.length - 1] : null,
    scheduledDates,
    releasesPageUrl: RELEASES_PAGE,
    files: WSER_RELEASE_FILES,
  };
}
