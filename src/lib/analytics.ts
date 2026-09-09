import { safeCampaignProps, sanitizeAnalyticsUrl } from "./analytics-privacy";

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

  return safeCampaignProps(window.location.search);
}

function pageContext(): Record<string, string> {
  return {
    page_location: sanitizeAnalyticsUrl(window.location.href, window.location.origin),
    page_path: window.location.pathname,
    page_referrer: document.referrer ? sanitizeAnalyticsUrl(document.referrer, window.location.origin) : "",
  };
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
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...pageContext(),
    });
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
    window.gtag("event", eventName, { ...mergedProps, ...pageContext() });
  }

  if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible(eventName, { props: mergedProps, u: pageContext().page_location });
  }
}

export function trackPageView(props: AnalyticsProps = {}): void {
  if (!hasBrowser() || !analyticsEnabled()) {
    return;
  }

  initAnalytics();
  const mergedProps = cleanProps({ ...queryProps(), ...props });
  const context = pageContext();
  const url = context.page_location;
  const pageViewKey = `${url}|${JSON.stringify(mergedProps)}`;
  if (pageViewKey === lastPageViewKey) {
    return;
  }
  lastPageViewKey = pageViewKey;

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "page_view", {
      page_title: document.title,
      ...mergedProps,
      ...context,
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
    link_url: url.origin,
    link_label: label?.trim().slice(0, 80),
  });
}
