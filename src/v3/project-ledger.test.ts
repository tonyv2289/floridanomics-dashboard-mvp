import { describe, expect, it } from "vitest";
import type { TerminalProject } from "../types/dashboard";
import {
  filterCapexProjects,
  formatCapexMillions,
  formatProjectJobs,
  summarizeCapexProjects,
} from "./project-ledger";

const baseProject: TerminalProject = {
  id: "fl-project",
  company: "Florida Co",
  project: "Factory",
  stateId: "FL",
  state: "Florida",
  geography: "Miami",
  isFlorida: true,
  sector: "Aerospace & Space",
  capexUsdMillions: 600,
  amountQualifier: "exact",
  jobsAnnounced: 500,
  jobsQualifier: "exact",
  averageWageUsd: 98000,
  stage: "announced",
  stageDetail: "Announced",
  announcedDate: "2026-05-22",
  expectedOperationalDate: null,
  facilityScale: null,
  lastVerifiedDate: "2026-07-17",
  strategicRead: "Read",
  sourceIds: ["source"],
};

const peerProject: TerminalProject = {
  ...baseProject,
  id: "peer-project",
  company: "Peer Co",
  stateId: "TX",
  state: "Texas",
  geography: "Brownsville",
  isFlorida: false,
  sector: "Defense & Maritime",
  capexUsdMillions: 3000,
  amountQualifier: "minimum",
  jobsAnnounced: 10000,
  jobsQualifier: "minimum",
  stage: "under_construction",
  announcedDate: "2026-07-16",
};

describe("project capex ledger", () => {
  it("separates Florida from peer projects and sorts by capex", () => {
    const results = filterCapexProjects([baseProject, peerProject], {
      geography: "peers",
      stage: "all",
      sector: "all",
      query: "",
      sort: "capex",
    });

    expect(results.map((project) => project.id)).toEqual(["peer-project"]);
  });

  it("treats construction and operating projects as converted", () => {
    const summary = summarizeCapexProjects([baseProject, peerProject]);

    expect(summary.disclosedCapex).toBe(3600);
    expect(summary.convertedCapex).toBe(3000);
    expect(summary.convertedShare).toBeCloseTo(5 / 6);
    expect(summary.floridaGap).toBe(2400);
    expect(summary.announcedJobs).toBe(10500);
  });

  it("does not count supported positions as newly announced jobs", () => {
    const supportedProject = { ...peerProject, jobsQualifier: "supports" as const };
    const summary = summarizeCapexProjects([supportedProject]);

    expect(summary.announcedJobs).toBe(0);
    expect(formatProjectJobs(supportedProject)).toBe("Supports 10,000");
  });

  it("formats minimum disclosed capital without hiding the qualifier", () => {
    expect(formatCapexMillions(3000, "minimum")).toBe("$3B+");
    expect(formatCapexMillions(null, "undisclosed")).toBe("Undisclosed");
  });
});
