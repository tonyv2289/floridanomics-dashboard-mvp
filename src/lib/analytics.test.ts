import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it("strips private URL values from GA configuration, page views, events, and Plausible", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TESTONLY");
  vi.stubEnv("VITE_PLAUSIBLE_DOMAIN", "www.floridanomics.com");
  const gtag = vi.fn(), plausible = vi.fn();
  const location = new URL("https://www.floridanomics.com/?view=atlas&email=private%40example.com&invite=secret#private-fragment");
  vi.stubGlobal("window", { location, gtag, plausible });
  vi.stubGlobal("document", {
    referrer: "https://example.com/from?token=private-referrer",
    title: "Floridanomics",
    getElementById: () => ({}),
  });
  const analytics = await import("./analytics");
  analytics.initAnalytics();
  analytics.trackPageView({ surface: "atlas" });
  analytics.trackEvent("region_selected", { region: "space-coast" });
  analytics.trackOutboundLink("https://example.com/source?token=outbound-secret#private", "Official source");
  const output = JSON.stringify([gtag.mock.calls, plausible.mock.calls]);
  for (const privateValue of ["private", "secret", "invite", "email=", "token="]) expect(output).not.toContain(privateValue);
  expect(gtag).toHaveBeenCalledWith("config", "G-TESTONLY", expect.objectContaining({
    page_location: "https://www.floridanomics.com/", page_referrer: "https://example.com/from", send_page_view: false,
  }));
  expect(plausible).toHaveBeenCalledWith("region_selected", expect.objectContaining({ u: "https://www.floridanomics.com/" }));
});
