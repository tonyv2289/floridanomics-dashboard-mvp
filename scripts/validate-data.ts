import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DashboardDataset,
  BenchmarkExample,
  FloridaBrainNote,
  InsightSection,
  InsightSource,
  InsightStat,
  PeerStateSnapshot,
  StrategyCluster,
  StrategyScenario,
} from "../src/types/dashboard";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "public", "data", "florida-economy.json");

const REQUIRED_TOP_LEVEL_SOURCE_IDS = [
  "selectflorida_exports",
  "florida_governor_press_office",
  "florida_scorecard",
  "florida_chamber_income_migration",
  "florida_taxwatch",
  "james_madison_institute",
  "fc100_ambition_accelerated",
] as const;

const REQUIRED_INNOVATION_RESOURCE_IDS = [
  "select-florida",
  "florida-commerce",
  "florida-governor-press-office",
  "florida-council-of-100",
  "florida-chamber",
  "florida-taxwatch",
  "james-madison-institute",
] as const;

const REQUIRED_BRAIN_NOTE_IDS = [
  "ai-capex-gap",
  "strategic-compute-not-dumb-load",
  "florida-shaped-compute-lane",
] as const;

const REQUIRED_STRATEGY_SOURCE_IDS = [
  "texas_comptroller_texstats",
  "texas_2036_data_hub",
  "pennsylvania_on_target",
  "north_carolina_evi",
  "tennessee_e2e",
  "washington_stem_dashboard",
  "mass_competitiveness_index",
] as const;

const REQUIRED_PEER_STATE_IDS = ["FL", "TX", "GA", "NC", "TN", "AZ", "UT", "CA"] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: unknown): value is string {
  return isNonEmptyString(value) && /^https?:\/\//.test(value);
}

function ensure(condition: unknown, message: string, errors: string[]) {
  if (!condition) {
    errors.push(message);
  }
}

function validateSource(source: InsightSource, label: string, errors: string[]) {
  ensure(isNonEmptyString(source.label), `${label} missing source label`, errors);
  ensure(isHttpUrl(source.url), `${label} missing valid source URL`, errors);
}

function validateRequiredIds(
  items: Array<{ id: string }>,
  requiredIds: readonly string[],
  label: string,
  errors: string[],
) {
  const ids = new Set(items.map((item) => item.id));

  requiredIds.forEach((id) => {
    ensure(ids.has(id), `${label} missing required id: ${id}`, errors);
  });
}

function validateInsightStat(stat: InsightStat, label: string, errors: string[]) {
  ensure(isNonEmptyString(stat.label), `${label} missing stat label`, errors);
  ensure(isNonEmptyString(stat.value), `${label} missing stat value`, errors);
  ensure(isNonEmptyString(stat.context), `${label} missing stat context`, errors);

  if (stat.source) {
    validateSource(stat.source, `${label} source`, errors);
  }

  if (stat.note !== undefined) {
    ensure(isNonEmptyString(stat.note), `${label} has an empty note`, errors);
  }
}

function validateInsightSection(section: InsightSection, label: string, errors: string[]) {
  ensure(isNonEmptyString(section.eyebrow), `${label} missing eyebrow`, errors);
  ensure(isNonEmptyString(section.title), `${label} missing title`, errors);
  ensure(isNonEmptyString(section.summary), `${label} missing summary`, errors);
  ensure(section.stats.length > 0, `${label} must include at least one stat`, errors);
  ensure(section.interpretation.length > 0, `${label} must include interpretation copy`, errors);
  ensure(section.sources.length > 0, `${label} must include sources`, errors);

  section.stats.forEach((stat, index) => validateInsightStat(stat, `${label} stat ${index + 1}`, errors));
  section.sources.forEach((source, index) => validateSource(source, `${label} source ${index + 1}`, errors));
  section.interpretation.forEach((paragraph, index) =>
    ensure(isNonEmptyString(paragraph), `${label} interpretation ${index + 1} is empty`, errors),
  );
}

function validateFloridaBrainNote(note: FloridaBrainNote, label: string, errors: string[]) {
  ensure(isNonEmptyString(note.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(note.kicker), `${label} missing kicker`, errors);
  ensure(isNonEmptyString(note.status), `${label} missing status`, errors);
  ensure(isNonEmptyString(note.title), `${label} missing title`, errors);
  ensure(isNonEmptyString(note.summary), `${label} missing summary`, errors);
  ensure(note.sources.length > 0, `${label} must include sources`, errors);

  if (note.ctaLabel !== undefined) {
    ensure(isNonEmptyString(note.ctaLabel), `${label} has an empty ctaLabel`, errors);
  }

  if (note.href !== undefined) {
    ensure(isNonEmptyString(note.href), `${label} has an empty href`, errors);
    ensure(!note.href.toLowerCase().startsWith("javascript:"), `${label} href must not be javascript`, errors);
  }

  note.sources.forEach((source, index) => validateSource(source, `${label} source ${index + 1}`, errors));
}

function validatePeerState(state: PeerStateSnapshot, label: string, errors: string[]) {
  ensure(isNonEmptyString(state.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(state.name), `${label} missing name`, errors);
  ensure(isNonEmptyString(state.shortName), `${label} missing shortName`, errors);
  ensure(isNonEmptyString(state.positioning), `${label} missing positioning`, errors);
  ensure(isNonEmptyString(state.watch), `${label} missing watch`, errors);

  const metricEntries = [
    ["unemploymentRate", state.unemploymentRate],
    ["laborForce", state.laborForce],
    ["nonfarmPayrolls", state.nonfarmPayrolls],
  ] as const;

  for (const [metricLabel, metric] of metricEntries) {
    ensure(isFiniteNumber(metric.latest.value), `${label}.${metricLabel} missing latest value`, errors);
    ensure(isNonEmptyString(metric.latest.date), `${label}.${metricLabel} missing latest date`, errors);
    ensure(metric.sparkline.length > 0, `${label}.${metricLabel} missing sparkline`, errors);
  }

  ensure(state.sources.length > 0, `${label} must include sources`, errors);
  state.sources.forEach((source, index) => validateSource(source, `${label} source ${index + 1}`, errors));
}

function validateBenchmarkExample(example: BenchmarkExample, label: string, errors: string[]) {
  ensure(isNonEmptyString(example.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(example.name), `${label} missing name`, errors);
  ensure(isNonEmptyString(example.model), `${label} missing model`, errors);
  ensure(isNonEmptyString(example.takeaway), `${label} missing takeaway`, errors);
  validateSource(example.source, `${label} source`, errors);
}

function validateStrategyCluster(cluster: StrategyCluster, label: string, errors: string[]) {
  ensure(isNonEmptyString(cluster.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(cluster.title), `${label} missing title`, errors);
  ensure(isNonEmptyString(cluster.thesis), `${label} missing thesis`, errors);
  ensure(isNonEmptyString(cluster.bottleneck), `${label} missing bottleneck`, errors);
  ensure(isNonEmptyString(cluster.proof), `${label} missing proof`, errors);
  ensure(isNonEmptyString(cluster.whatToTrack), `${label} missing whatToTrack`, errors);
  ensure(cluster.sources.length > 0, `${label} must include sources`, errors);
  cluster.sources.forEach((source, index) => validateSource(source, `${label} source ${index + 1}`, errors));
}

function validateStrategyScenario(scenario: StrategyScenario, label: string, errors: string[]) {
  ensure(isNonEmptyString(scenario.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(scenario.label), `${label} missing label`, errors);
  ensure(isNonEmptyString(scenario.status), `${label} missing status`, errors);
  ensure(isNonEmptyString(scenario.summary), `${label} missing summary`, errors);
  ensure(scenario.signals.length > 0, `${label} must include signals`, errors);
  ensure(scenario.sources.length > 0, `${label} must include sources`, errors);
  scenario.signals.forEach((signal, index) =>
    ensure(isNonEmptyString(signal), `${label} signal ${index + 1} is empty`, errors),
  );
  scenario.sources.forEach((source, index) => validateSource(source, `${label} source ${index + 1}`, errors));
}

async function main() {
  const errors: string[] = [];
  const raw = await readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw) as DashboardDataset;

  ensure(isNonEmptyString(data.generatedAt), "Missing generatedAt", errors);
  ensure(isNonEmptyString(data.asOfLaborMarket), "Missing asOfLaborMarket", errors);
  ensure(isNonEmptyString(data.asOfPopulation), "Missing asOfPopulation", errors);

  ensure(data.sources.length >= 3, "Expected at least three top-level sources", errors);
  data.sources.forEach((source, index) => {
    ensure(isNonEmptyString(source.id), `Top-level source ${index + 1} missing id`, errors);
    ensure(isNonEmptyString(source.name), `Top-level source ${index + 1} missing name`, errors);
    ensure(isHttpUrl(source.url), `Top-level source ${index + 1} missing valid URL`, errors);
    ensure(isNonEmptyString(source.notes), `Top-level source ${index + 1} missing notes`, errors);
  });
  validateRequiredIds(data.sources, REQUIRED_TOP_LEVEL_SOURCE_IDS, "Top-level source stack", errors);
  validateRequiredIds(data.sources, REQUIRED_STRATEGY_SOURCE_IDS, "Strategy source stack", errors);

  ensure(data.heroMetrics.length >= 4, "heroMetrics should have at least 4 entries", errors);

  for (const metricId of data.heroMetrics) {
    const metric = data.metrics[metricId];
    ensure(Boolean(metric), `Missing hero metric object: ${metricId}`, errors);
  }

  const coreMetricIds: Array<keyof DashboardDataset["metrics"]> = [
    "unemploymentRate",
    "laborForce",
    "employmentLevel",
    "nonfarmPayrolls",
    "population",
  ];

  for (const metricId of coreMetricIds) {
    const metric = data.metrics[metricId];
    ensure(metric.series.length > 0, `Metric ${metricId} has empty series`, errors);
    ensure(metric.sparkline.length > 0, `Metric ${metricId} has empty sparkline`, errors);
    ensure(isFiniteNumber(metric.latest.value), `Metric ${metricId} has invalid latest value`, errors);
    ensure(isNonEmptyString(metric.latest.date), `Metric ${metricId} missing latest date`, errors);
  }

  ensure(data.industry.sectors.length >= 8, "Industry sectors should include major categories", errors);
  ensure(data.industry.strongestGrowers.length > 0, "Missing strongestGrowers", errors);
  ensure(data.industry.laggards.length > 0, "Missing laggards", errors);

  ensure(data.metros.length === 4, "Expected exactly four metro cards", errors);
  const requiredMetros = ["Miami MSA", "Tampa MSA", "Orlando MSA", "Jacksonville MSA"];
  for (const metroName of requiredMetros) {
    ensure(data.metros.some((metro) => metro.name === metroName), `Missing metro ${metroName}`, errors);
  }

  ensure(data.narrative.whatStandsOut.length > 0, "Narrative missing whatStandsOut", errors);
  ensure(data.narrative.improving.length > 0, "Narrative missing improving", errors);
  ensure(data.narrative.softening.length > 0, "Narrative missing softening", errors);
  ensure(data.narrative.whyItMatters.length > 0, "Narrative missing whyItMatters", errors);

  ensure(data.innovation.heroMetrics.length >= 4, "Innovation heroMetrics should have at least 4 entries", errors);
  for (const metricId of data.innovation.heroMetrics) {
    const metric = data.innovation.metrics[metricId];
    ensure(Boolean(metric), `Missing innovation metric: ${metricId}`, errors);
    ensure(metric.series.length > 0, `Innovation metric ${metricId} has empty series`, errors);
    ensure(metric.sparkline.length > 0, `Innovation metric ${metricId} has empty sparkline`, errors);
    ensure(isFiniteNumber(metric.latest.value), `Innovation metric ${metricId} has invalid latest value`, errors);
  }

  ensure(data.innovation.resources.length >= 6, "Innovation resources list is unexpectedly short", errors);
  validateRequiredIds(
    data.innovation.resources,
    REQUIRED_INNOVATION_RESOURCE_IDS,
    "Innovation source atlas",
    errors,
  );
  ensure(data.innovation.narrative.signals.length > 0, "Innovation narrative missing signals", errors);
  ensure(data.innovation.narrative.development.length > 0, "Innovation narrative missing development", errors);
  ensure(data.innovation.narrative.momentum.length > 0, "Innovation narrative missing momentum", errors);

  validateInsightSection(data.scorecard2030, "scorecard2030", errors);
  ensure(data.brainNotes.length >= 3, "brainNotes should include at least three Florida Brain notes", errors);
  validateRequiredIds(data.brainNotes, REQUIRED_BRAIN_NOTE_IDS, "Florida Brain notes", errors);
  data.brainNotes.forEach((note, index) => validateFloridaBrainNote(note, `brainNotes ${index + 1}`, errors));
  ensure(isNonEmptyString(data.strategy.headline), "strategy missing headline", errors);
  ensure(isNonEmptyString(data.strategy.summary), "strategy missing summary", errors);
  ensure(data.strategy.peerStates.length >= REQUIRED_PEER_STATE_IDS.length, "strategy.peerStates missing peer states", errors);
  validateRequiredIds(data.strategy.peerStates, REQUIRED_PEER_STATE_IDS, "Strategy peer states", errors);
  data.strategy.peerStates.forEach((state, index) => validatePeerState(state, `strategy.peerStates ${index + 1}`, errors));
  ensure(data.strategy.benchmarkExamples.length >= 5, "strategy.benchmarkExamples should include external models", errors);
  data.strategy.benchmarkExamples.forEach((example, index) =>
    validateBenchmarkExample(example, `strategy.benchmarkExamples ${index + 1}`, errors),
  );
  ensure(data.strategy.clusters.length >= 4, "strategy.clusters should include priority clusters", errors);
  data.strategy.clusters.forEach((cluster, index) =>
    validateStrategyCluster(cluster, `strategy.clusters ${index + 1}`, errors),
  );
  validateInsightSection(data.strategy.talentPipeline, "strategy.talentPipeline", errors);
  ensure(data.strategy.scenarios.length === 3, "strategy.scenarios should include base, ambition, and risk cases", errors);
  data.strategy.scenarios.forEach((scenario, index) =>
    validateStrategyScenario(scenario, `strategy.scenarios ${index + 1}`, errors),
  );
  validateInsightSection(data.distinctives.snowbirdIndex, "distinctives.snowbirdIndex", errors);
  validateInsightSection(data.distinctives.spaceCoastCadence, "distinctives.spaceCoastCadence", errors);
  validateInsightSection(data.distinctives.latamGateway, "distinctives.latamGateway", errors);

  ensure(isNonEmptyString(data.trade.headline), "trade missing headline", errors);
  ensure(isNonEmptyString(data.trade.asOf), "trade missing asOf", errors);
  ensure(isNonEmptyString(data.trade.releaseDate), "trade missing releaseDate", errors);
  ensure(isNonEmptyString(data.trade.releaseTitle), "trade missing releaseTitle", errors);
  ensure(isHttpUrl(data.trade.releaseUrl), "trade missing valid releaseUrl", errors);

  ensure(data.trade.heroMetrics.length >= 3, "trade should include at least three hero metrics", errors);
  data.trade.heroMetrics.forEach((metric, index) => {
    ensure(isNonEmptyString(metric.id), `trade hero metric ${index + 1} missing id`, errors);
    ensure(isNonEmptyString(metric.label), `trade hero metric ${index + 1} missing label`, errors);
    ensure(isFiniteNumber(metric.value), `trade hero metric ${index + 1} missing value`, errors);
    ensure(isNonEmptyString(metric.helper), `trade hero metric ${index + 1} missing helper`, errors);
  });

  ensure(data.trade.deltas.length >= 4, "trade should include the expected deltas", errors);
  data.trade.deltas.forEach((delta, index) => {
    ensure(isNonEmptyString(delta.label), `trade delta ${index + 1} missing label`, errors);
    ensure(isNonEmptyString(delta.baseLabel), `trade delta ${index + 1} missing baseLabel`, errors);
    if (delta.absolute !== null) {
      ensure(isFiniteNumber(delta.absolute), `trade delta ${index + 1} absolute is invalid`, errors);
    }
    if (delta.percent !== null) {
      ensure(isFiniteNumber(delta.percent), `trade delta ${index + 1} percent is invalid`, errors);
    }
  });

  ensure(data.trade.topMarkets.length >= 3, "trade should include at least three top markets", errors);
  data.trade.topMarkets.forEach((market, index) => {
    ensure(isFiniteNumber(market.rank), `trade top market ${index + 1} missing rank`, errors);
    ensure(isNonEmptyString(market.country), `trade top market ${index + 1} missing country`, errors);
    ensure(isNonEmptyString(market.region), `trade top market ${index + 1} missing region`, errors);
  });

  ensure(data.trade.topCategories.length >= 3, "trade should include at least three top categories", errors);
  data.trade.topCategories.forEach((category, index) => {
    ensure(isFiniteNumber(category.rank), `trade top category ${index + 1} missing rank`, errors);
    ensure(isNonEmptyString(category.label), `trade top category ${index + 1} missing label`, errors);
    ensure(isFiniteNumber(category.valueUsdBillions), `trade top category ${index + 1} missing value`, errors);
  });

  ensure(isNonEmptyString(data.trade.selectFlorida.headline), "trade.selectFlorida missing headline", errors);
  ensure(isFiniteNumber(data.trade.selectFlorida.businessesServed), "trade.selectFlorida missing businessesServed", errors);
  ensure(isNonEmptyString(data.trade.selectFlorida.businessesWindow), "trade.selectFlorida missing businessesWindow", errors);
  ensure(
    isFiniteNumber(data.trade.selectFlorida.salesGeneratedUsdMillions),
    "trade.selectFlorida missing salesGeneratedUsdMillions",
    errors,
  );
  ensure(data.trade.selectFlorida.showResults.length > 0, "trade.selectFlorida missing showResults", errors);
  data.trade.selectFlorida.showResults.forEach((show, index) => {
    ensure(isNonEmptyString(show.id), `trade show result ${index + 1} missing id`, errors);
    ensure(isNonEmptyString(show.show), `trade show result ${index + 1} missing show`, errors);
    ensure(isNonEmptyString(show.window), `trade show result ${index + 1} missing window`, errors);
    ensure(
      isFiniteNumber(show.reportedSalesUsdMillions),
      `trade show result ${index + 1} missing reportedSalesUsdMillions`,
      errors,
    );
  });

  ensure(isNonEmptyString(data.trade.bilateralTrade.label), "trade.bilateralTrade missing label", errors);
  ensure(isFiniteNumber(data.trade.bilateralTrade.valueUsdBillions), "trade.bilateralTrade missing value", errors);
  ensure(
    isFiniteNumber(data.trade.bilateralTrade.oneYearAbsoluteUsdBillions),
    "trade.bilateralTrade missing oneYearAbsoluteUsdBillions",
    errors,
  );
  ensure(isFiniteNumber(data.trade.bilateralTrade.oneYearPercent), "trade.bilateralTrade missing oneYearPercent", errors);
  ensure(
    isFiniteNumber(data.trade.bilateralTrade.sevenYearAbsoluteUsdBillions),
    "trade.bilateralTrade missing sevenYearAbsoluteUsdBillions",
    errors,
  );
  ensure(isFiniteNumber(data.trade.bilateralTrade.sevenYearPercent), "trade.bilateralTrade missing sevenYearPercent", errors);

  ensure(isNonEmptyString(data.trade.narrative.headline), "trade narrative missing headline", errors);
  ensure(data.trade.narrative.whatStandsOut.length > 0, "trade narrative missing whatStandsOut", errors);
  ensure(data.trade.narrative.watchOuts.length > 0, "trade narrative missing watchOuts", errors);
  ensure(data.trade.narrative.whyItMatters.length > 0, "trade narrative missing whyItMatters", errors);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    throw new Error(`Data validation failed with ${errors.length} issue(s).`);
  }

  console.log("Dataset contract looks valid, including curated sections and Florida Brain notes.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
