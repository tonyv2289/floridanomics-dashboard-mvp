export type ReleaseProgram = "state-labor" | "metro-labor" | "county-wages";
export type ScheduledRelease = { program: ReleaseProgram; releaseDate: string; observationDate: string; label: string };
export type ReleaseCalendar = { checkedAt: string; sourceUrl: string; releases: ScheduledRelease[] };

// A kept calendar stands for this many days after its last real check. The freshness
// review raises its calendar alert after the same number of days (see freshness.test.ts).
export const CALENDAR_MAX_AGE_DAYS = 45;
export const calendarAgeDays = (checkedAt: string, now = new Date()) => Math.floor((now.getTime() - new Date(checkedAt).getTime()) / 86400000);
export const keptCalendarIsCurrent = (checkedAt: string, now = new Date()) => {
  const days = calendarAgeDays(checkedAt, now);
  return Number.isFinite(days) && days >= 0 && days <= CALENDAR_MAX_AGE_DAYS;
};

const clean = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function parseBlsCalendar(html: string): ScheduledRelease[] {
  const releases: ScheduledRelease[] = [];
  for (const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
    const dateText = clean(row.match(/<td[^>]*class="date-cell"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    const label = clean(row.match(/<td[^>]*class="desc-cell"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    const program = /State Employment and Unemployment/.test(label) ? "state-labor" : /Metropolitan Area Employment and Unemployment/.test(label) ? "metro-labor" : /County Employment and Wages/.test(label) ? "county-wages" : null;
    if (!program) continue;
    const date = new Date(`${dateText} UTC`);
    const observation = label.split(/\s+for\s+/).at(-1) ?? "";
    const quarterMatch = observation.match(/(First|Second|Third|Fourth) Quarter (\d{4})/);
    const quarter = quarterMatch ? ["First", "Second", "Third", "Fourth"].indexOf(quarterMatch[1]) + 1 : null;
    const observed = quarterMatch && quarter ? new Date(Date.UTC(Number(quarterMatch[2]), quarter * 3 - 1, 1)) : new Date(`${observation} 1 UTC`);
    if (Number.isNaN(date.getTime()) || Number.isNaN(observed.getTime())) throw new Error(`Unrecognized release-calendar date: ${label}`);
    releases.push({ program, releaseDate: date.toISOString().slice(0, 10), observationDate: observed.toISOString().slice(0, 10), label });
  }
  return releases.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
}
