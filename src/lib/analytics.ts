type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProps = Record<string, AnalyticsValue>;

type GtagCommand = "config" | "event" | "js";
type Gtag = (command: GtagCommand, target: string | Date, params?: Record<string, AnalyticsValue>) => void;
type Plausible = (eventName: string, options?: { props?: Record<string, string>; u?: string }) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    plausible?: Plausible & { q?: unknown[] };
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
const PLAUSIBLE_SRC = import.meta.env.VITE_PLAUSIBLE_SRC?.trim() || "https://plausible.io/js/script.manual.js";

const TRACKED_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
  "invite",
  "cohort",
  "version",
  "tab",
  "competitionView",
  "metric",
  "innovationMetric",
] as const;

let initialized = false;
let lastPageViewKey = "";

function hasBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function appendScript(id: string, src: string, attributes: Record<string, string> = {}): void {
  if (!hasBrowser() || document.getElementById(id)) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  script.defer = true;
  Object.entries(attributes).forEach(([key, value]) => {
    script.setAttribute(key, value);
  });
  document.head.appendChild(script);
}

function normalizeValue(value: AnalyticsValue): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const text = String(value).trim();
  if (!text || text.includes("@")) {
    return undefined;
  }

  return text.slice(0, 120);
}

function cleanProps(props: AnalyticsProps): Record<string, string> {
  return Object.entries(props).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalized = normalizeValue(value);
    if (normalized) {
      acc[key] = normalized;
    }
    return acc;
  }, {});
}

function queryProps(): AnalyticsProps {
  if (!hasBrowser()) {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return TRACKED_QUERY_KEYS.reduce<AnalyticsProps>((acc, key) => {
    const value = params.get(key);
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function analyticsEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID || PLAUSIBLE_DOMAIN);
}

export function initAnalytics(): void {
  if (!hasBrowser() || initialized) {
    return;
  }

  if (GA_MEASUREMENT_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag(...args) {
        window.dataLayer?.push(args);
      };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
    appendScript("ga4-script", `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
  }

  if (PLAUSIBLE_DOMAIN) {
    window.plausible =
      window.plausible ||
      function plausible(...args) {
        (window.plausible!.q = window.plausible!.q || []).push(args);
      };
    appendScript("plausible-script", PLAUSIBLE_SRC, { "data-domain": PLAUSIBLE_DOMAIN });
  }

  initialized = true;
}

export function trackEvent(eventName: string, props: AnalyticsProps = {}): void {
  if (!hasBrowser() || !analyticsEnabled()) {
    return;
  }

  initAnalytics();
  const mergedProps = cleanProps({ ...queryProps(), ...props });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", eventName, mergedProps);
  }

  if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible(eventName, { props: mergedProps });
  }
}

export function trackPageView(props: AnalyticsProps = {}): void {
  if (!hasBrowser() || !analyticsEnabled()) {
    return;
  }

  initAnalytics();
  const mergedProps = cleanProps({ ...queryProps(), ...props });
  const url = window.location.href;
  const pageViewKey = `${url}|${JSON.stringify(mergedProps)}`;
  if (pageViewKey === lastPageViewKey) {
    return;
  }
  lastPageViewKey = pageViewKey;

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "page_view", {
      page_location: url,
      page_path: `${window.location.pathname}${window.location.search}`,
      page_title: document.title,
      ...mergedProps,
    });
  }

  if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible("pageview", { props: mergedProps, u: url });
  }
}

export function trackDashboardView(props: AnalyticsProps): void {
  trackPageView({ surface: "dashboard", ...props });
}

export function trackOutboundLink(href: string, label?: string | null): void {
  if (!hasBrowser()) {
    return;
  }

  const url = new URL(href, window.location.href);
  if (url.origin === window.location.origin) {
    return;
  }

  trackEvent("outbound_link", {
    link_domain: url.hostname,
    link_url: url.href,
    link_label: label?.trim().slice(0, 80),
  });
}
