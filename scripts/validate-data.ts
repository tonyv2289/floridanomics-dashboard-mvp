import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DashboardDataset,
  BenchmarkExample,
  CompetitionMetric,
  CompetitionSource,
  FdiCompetitorState,
  FederalSignal,
  FederalSource,
  FloridaBrainNote,
  InsightSection,
  InsightSource,
  InsightStat,
  MigrationRank,
  PeerStateSnapshot,
  PolicyToolkitState,
  SemiconductorCommitment,
  StrategyCluster,
  StrategyScenario,
  TerminalEvidenceBlock,
  TerminalForecast,
  TerminalIndexFactor,
  TerminalMetric,
  TerminalPolicyMemo,
  TerminalProject,
  TerminalSource,
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

const REQUIRED_TERMINAL_SOURCE_IDS = [
  "bls_state_april_2026",
  "cbre_h2_2025_data_centers",
  "jll_2026_global_data_center_outlook",
  "florida_governor_sb484",
  "florida_senate_sb484",
  "fc100_ambition_accelerated",
] as const;

const REQUIRED_COMPETITION_SOURCE_IDS = [
  "sf_fdi_comparison_2025",
  "bea_new_fdi_2024",
  "bea_new_fdi_state_tables_2024",
  "sf_incentive_research_2020",
  "efi_bi_side_by_side_2022",
  "fl_program_inventory_2023",
  "chips_commitment_2024",
  "migration_rank_2022",
  "state_appropros_efi",
  "source_map_2026",
] as const;

const REQUIRED_FDI_OBSERVATORY_SCORE_IDS = ["stock", "flow", "quality", "pipeline"] as const;

const REQUIRED_FDI_DELTA_STATE_IDS = ["TX", "GA", "CA", "NC", "FL", "NY", "TN"] as const;

const REQUIRED_FEDERAL_SOURCE_IDS = [
  "bls_public_api",
  "census_bfs_api",
  "census_state_exports_api",
  "bea_regional_api",
  "eia_electricity_api",
  "irs_soi_migration_download",
] as const;

const REQUIRED_FEDERAL_SIGNAL_IDS = [
  "bls-florida-unemployment",
  "bls-florida-nonfarm-payrolls",
  "bls-peer-payroll-leader",
  "census-business-applications",
  "census-florida-exports",
  "bea-real-gsp",
  "eia-industrial-electricity-price",
  "irs-income-migration",
] as const;

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

function validateCompetitionSource(source: CompetitionSource, label: string, errors: string[]) {
  ensure(isNonEmptyString(source.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(source.label), `${label} missing label`, errors);
  ensure(
    source.kind === "Dropbox source" || source.kind === "Vault derivative" || source.kind === "Public source",
    `${label} has invalid kind`,
    errors,
  );
  ensure(isNonEmptyString(source.macStudioPath), `${label} missing Mac Studio path`, errors);
  ensure(
    source.kind !== "Dropbox source" || source.macStudioPath.startsWith("/Users/tjvillamil/Library/CloudStorage/Dropbox/"),
    `${label} Dropbox source must point at the Mac Studio Dropbox tree`,
    errors,
  );
  ensure(
    source.kind !== "Vault derivative" || source.macStudioPath.startsWith("/Users/tjvillamil/pelayo-vault/"),
    `${label} vault derivative must point at the Mac Studio Pelayo Vault`,
    errors,
  );
  ensure(isNonEmptyString(source.note), `${label} missing note`, errors);
  ensure(
    source.status === "vault_logged" || source.status === "needs_refresh" || source.status === "public_source",
    `${label} has invalid status`,
    errors,
  );

  if (source.localPath !== undefined) {
    ensure(isNonEmptyString(source.localPath), `${label} localPath is empty`, errors);
  }

  if (source.url !== undefined) {
    ensure(isHttpUrl(source.url), `${label} has invalid url`, errors);
  }

  ensure(
    source.kind !== "Public source" || isHttpUrl(source.url ?? source.macStudioPath),
    `${label} public source must include a valid URL`,
    errors,
  );
}

function validateCompetitionSourceRefs(
  sourceIds: string[],
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(sourceIds.length > 0, `${label} must include sourceIds`, errors);
  sourceIds.forEach((sourceId) => {
    ensure(sourceIdSet.has(sourceId), `${label} references missing competition source: ${sourceId}`, errors);
  });
}

function validateCompetitionMetric(
  metric: CompetitionMetric,
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(metric.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(metric.label), `${label} missing label`, errors);
  ensure(isNonEmptyString(metric.value), `${label} missing value`, errors);
  ensure(isNonEmptyString(metric.context), `${label} missing context`, errors);
  ensure(isNonEmptyString(metric.read), `${label} missing read`, errors);
  validateCompetitionSourceRefs(metric.sourceIds, sourceIdSet, label, errors);
}

function isFederalFeedStatus(value: string): boolean {
  return (
    value === "live" ||
    value === "fallback" ||
    value === "needs_key" ||
    value === "download_required" ||
    value === "error"
  );
}

function validateFederalSource(source: FederalSource, label: string, errors: string[]) {
  ensure(isNonEmptyString(source.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(source.agency), `${label} missing agency`, errors);
  ensure(isNonEmptyString(source.label), `${label} missing label`, errors);
  ensure(
    source.tier === "federal_api" || source.tier === "federal_download" || source.tier === "federal_via_fred",
    `${label} has invalid tier`,
    errors,
  );
  ensure(isHttpUrl(source.url), `${label} missing valid source URL`, errors);

  if (source.apiUrl !== undefined) {
    ensure(isHttpUrl(source.apiUrl), `${label} has invalid apiUrl`, errors);
  }

  if (source.envKey !== undefined) {
    ensure(isNonEmptyString(source.envKey), `${label} has empty envKey`, errors);
  }

  ensure(isFederalFeedStatus(source.status), `${label} has invalid status`, errors);
  ensure(isNonEmptyString(source.note), `${label} missing note`, errors);
}

function validateFederalSignal(signal: FederalSignal, sourceIdSet: Set<string>, label: string, errors: string[]) {
  ensure(isNonEmptyString(signal.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(signal.label), `${label} missing label`, errors);
  ensure(isNonEmptyString(signal.value), `${label} missing value`, errors);
  ensure(isNonEmptyString(signal.unit), `${label} missing unit`, errors);
  ensure(isNonEmptyString(signal.geography), `${label} missing geography`, errors);
  ensure(isNonEmptyString(signal.period), `${label} missing period`, errors);
  ensure(sourceIdSet.has(signal.sourceId), `${label} references missing federal source: ${signal.sourceId}`, errors);
  ensure(isFederalFeedStatus(signal.status), `${label} has invalid status`, errors);
  ensure(isNonEmptyString(signal.read), `${label} missing read`, errors);
  ensure(isNonEmptyString(signal.retrievedAt), `${label} missing retrievedAt`, errors);
  ensure(isHttpUrl(signal.sourceUrl), `${label} missing valid sourceUrl`, errors);

  if (signal.caveat !== undefined) {
    ensure(isNonEmptyString(signal.caveat), `${label} has empty caveat`, errors);
  }
}

function validateFdiCompetitorState(
  state: FdiCompetitorState,
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(state.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(state.name), `${label} missing name`, errors);
  ensure(isNonEmptyString(state.tier), `${label} missing tier`, errors);
  ensure(isFiniteNumber(state.fdiJobs), `${label} missing fdiJobs`, errors);
  ensure(isFiniteNumber(state.greenfieldProjects), `${label} missing greenfieldProjects`, errors);
  ensure(
    state.fdiPpeUsdBillions === null || isFiniteNumber(state.fdiPpeUsdBillions),
    `${label} has invalid fdiPpeUsdBillions`,
    errors,
  );
  ensure(
    state.firstYearExpendituresUsdBillions === null || isFiniteNumber(state.firstYearExpendituresUsdBillions),
    `${label} has invalid firstYearExpendituresUsdBillions`,
    errors,
  );
  ensure(isNonEmptyString(state.capitalIntensityRead), `${label} missing capitalIntensityRead`, errors);
  ensure(isNonEmptyString(state.posture), `${label} missing posture`, errors);
  validateCompetitionSourceRefs(state.sourceIds, sourceIdSet, label, errors);
}

function validateFdiObservatoryScore(
  score: DashboardDataset["competition"]["fdiScoreboard"]["observatory"]["scores"][number],
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(score.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(score.label), `${label} missing label`, errors);
  ensure(isFiniteNumber(score.score), `${label} missing score`, errors);
  ensure(isFiniteNumber(score.maxScore), `${label} missing maxScore`, errors);
  ensure(score.score >= 0 && score.score <= score.maxScore, `${label} score outside maxScore`, errors);
  ensure(isNonEmptyString(score.value), `${label} missing value`, errors);
  ensure(isNonEmptyString(score.delta), `${label} missing delta`, errors);
  ensure(isNonEmptyString(score.status), `${label} missing status`, errors);
  ensure(isNonEmptyString(score.read), `${label} missing read`, errors);
  validateCompetitionSourceRefs(score.sourceIds, sourceIdSet, label, errors);
}

function validateFdiDeltaState(
  state: DashboardDataset["competition"]["fdiScoreboard"]["observatory"]["deltas"][number],
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(state.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(state.state), `${label} missing state`, errors);
  ensure(
    state.latestExpendituresUsdBillions === null || isFiniteNumber(state.latestExpendituresUsdBillions),
    `${label} has invalid latestExpendituresUsdBillions`,
    errors,
  );
  ensure(
    state.oneYearExpendituresPercent === null || isFiniteNumber(state.oneYearExpendituresPercent),
    `${label} has invalid oneYearExpendituresPercent`,
    errors,
  );
  ensure(
    state.currentEmploymentThousands === null || isFiniteNumber(state.currentEmploymentThousands),
    `${label} has invalid currentEmploymentThousands`,
    errors,
  );
  ensure(
    state.oneYearEmploymentPercent === null || isFiniteNumber(state.oneYearEmploymentPercent),
    `${label} has invalid oneYearEmploymentPercent`,
    errors,
  );
  ensure(
    state.greenfieldSharePercent === null || isFiniteNumber(state.greenfieldSharePercent),
    `${label} has invalid greenfieldSharePercent`,
    errors,
  );
  ensure(
    state.momentum === "accelerating" ||
      state.momentum === "mixed" ||
      state.momentum === "slowing" ||
      state.momentum === "suppressed",
    `${label} has invalid momentum`,
    errors,
  );
  ensure(isNonEmptyString(state.read), `${label} missing read`, errors);
  validateCompetitionSourceRefs(state.sourceIds, sourceIdSet, label, errors);
}

function validatePolicyToolkitState(
  state: PolicyToolkitState,
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(state.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(state.state), `${label} missing state`, errors);
  ensure(isNonEmptyString(state.competitorSignal), `${label} missing competitorSignal`, errors);
  ensure(state.tools.length > 0, `${label} missing tools`, errors);
  state.tools.forEach((tool, index) => ensure(isNonEmptyString(tool), `${label} tool ${index + 1} is empty`, errors));
  ensure(isNonEmptyString(state.floridaGap), `${label} missing floridaGap`, errors);
  validateCompetitionSourceRefs(state.sourceIds, sourceIdSet, label, errors);
}

function validateMigrationRank(rank: MigrationRank, label: string, errors: string[]) {
  ensure(isFiniteNumber(rank.rank), `${label} missing rank`, errors);
  ensure(rank.rank > 0, `${label} rank must be positive`, errors);
  ensure(isNonEmptyString(rank.state), `${label} missing state`, errors);
  ensure(isFiniteNumber(rank.netMigration2021), `${label} missing netMigration2021`, errors);
  ensure(isFiniteNumber(rank.netMigration2022), `${label} missing netMigration2022`, errors);
}

function validateSemiconductorCommitment(commitment: SemiconductorCommitment, label: string, errors: string[]) {
  ensure(isNonEmptyString(commitment.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(commitment.label), `${label} missing label`, errors);
  ensure(isFiniteNumber(commitment.valueUsd), `${label} missing valueUsd`, errors);
  ensure(commitment.valueUsd > 0, `${label} valueUsd must be positive`, errors);
  ensure(isNonEmptyString(commitment.context), `${label} missing context`, errors);
}

function validateTerminalSource(source: TerminalSource, label: string, errors: string[]) {
  ensure(isNonEmptyString(source.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(source.label), `${label} missing label`, errors);
  ensure(isHttpUrl(source.url), `${label} missing valid URL`, errors);
  ensure(isNonEmptyString(source.tier), `${label} missing tier`, errors);
  ensure(isNonEmptyString(source.note), `${label} missing note`, errors);
}

function validateTerminalSourceRefs(
  sourceIds: string[],
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(sourceIds.length > 0, `${label} must include sourceIds`, errors);
  sourceIds.forEach((sourceId) => {
    ensure(sourceIdSet.has(sourceId), `${label} references missing terminal source: ${sourceId}`, errors);
  });
}

function validateTerminalMetric(metric: TerminalMetric, sourceIdSet: Set<string>, label: string, errors: string[]) {
  ensure(isNonEmptyString(metric.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(metric.label), `${label} missing label`, errors);
  ensure(isNonEmptyString(metric.value), `${label} missing value`, errors);
  ensure(isNonEmptyString(metric.context), `${label} missing context`, errors);
  ensure(isNonEmptyString(metric.read), `${label} missing read`, errors);
  validateTerminalSourceRefs(metric.sourceIds, sourceIdSet, label, errors);
}

function validateTerminalIndexFactor(
  factor: TerminalIndexFactor,
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(factor.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(factor.label), `${label} missing label`, errors);
  ensure(isFiniteNumber(factor.score), `${label} missing score`, errors);
  ensure(isFiniteNumber(factor.maxScore), `${label} missing maxScore`, errors);
  ensure(factor.score >= 0 && factor.score <= factor.maxScore, `${label} score is outside maxScore`, errors);
  ensure(isNonEmptyString(factor.read), `${label} missing read`, errors);
  validateTerminalSourceRefs(factor.sourceIds, sourceIdSet, label, errors);
}

function validateTerminalProject(project: TerminalProject, sourceIdSet: Set<string>, label: string, errors: string[]) {
  ensure(isNonEmptyString(project.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(project.name), `${label} missing name`, errors);
  ensure(isNonEmptyString(project.geography), `${label} missing geography`, errors);
  ensure(isNonEmptyString(project.sector), `${label} missing sector`, errors);
  ensure(isNonEmptyString(project.capex), `${label} missing capex`, errors);
  ensure(isNonEmptyString(project.jobs), `${label} missing jobs`, errors);
  ensure(isNonEmptyString(project.stage), `${label} missing stage`, errors);
  ensure(isNonEmptyString(project.strategicRead), `${label} missing strategicRead`, errors);
  validateTerminalSourceRefs(project.sourceIds, sourceIdSet, label, errors);
}

function validateTerminalForecast(forecast: TerminalForecast, sourceIdSet: Set<string>, label: string, errors: string[]) {
  ensure(isNonEmptyString(forecast.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(forecast.claim), `${label} missing claim`, errors);
  ensure(isNonEmptyString(forecast.horizon), `${label} missing horizon`, errors);
  ensure(isNonEmptyString(forecast.confidence), `${label} missing confidence`, errors);
  ensure(isNonEmptyString(forecast.mechanism), `${label} missing mechanism`, errors);
  ensure(forecast.leadingIndicators.length > 0, `${label} missing leadingIndicators`, errors);
  ensure(forecast.laggingIndicators.length > 0, `${label} missing laggingIndicators`, errors);
  ensure(isNonEmptyString(forecast.baseCase), `${label} missing baseCase`, errors);
  ensure(isNonEmptyString(forecast.ambitionCase), `${label} missing ambitionCase`, errors);
  ensure(isNonEmptyString(forecast.riskCase), `${label} missing riskCase`, errors);
  ensure(isNonEmptyString(forecast.counterCase), `${label} missing counterCase`, errors);
  ensure(isNonEmptyString(forecast.updateTrigger), `${label} missing updateTrigger`, errors);
  forecast.leadingIndicators.forEach((indicator, index) =>
    ensure(isNonEmptyString(indicator), `${label} leadingIndicator ${index + 1} is empty`, errors),
  );
  forecast.laggingIndicators.forEach((indicator, index) =>
    ensure(isNonEmptyString(indicator), `${label} laggingIndicator ${index + 1} is empty`, errors),
  );
  validateTerminalSourceRefs(forecast.sourceIds, sourceIdSet, label, errors);
}

function validateTerminalPolicyMemo(
  memo: TerminalPolicyMemo,
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(memo.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(memo.title), `${label} missing title`, errors);
  ensure(isNonEmptyString(memo.stance), `${label} missing stance`, errors);
  ensure(isNonEmptyString(memo.whatChanged), `${label} missing whatChanged`, errors);
  ensure(isNonEmptyString(memo.mechanism), `${label} missing mechanism`, errors);
  ensure(isNonEmptyString(memo.recommendation), `${label} missing recommendation`, errors);
  ensure(isNonEmptyString(memo.whatNotToDo), `${label} missing whatNotToDo`, errors);
  ensure(memo.nextMoves.length > 0, `${label} missing nextMoves`, errors);
  memo.nextMoves.forEach((move, index) =>
    ensure(isNonEmptyString(move), `${label} nextMove ${index + 1} is empty`, errors),
  );
  validateTerminalSourceRefs(memo.sourceIds, sourceIdSet, label, errors);
}

function validateTerminalEvidenceBlock(
  block: TerminalEvidenceBlock,
  sourceIdSet: Set<string>,
  label: string,
  errors: string[],
) {
  ensure(isNonEmptyString(block.id), `${label} missing id`, errors);
  ensure(isNonEmptyString(block.title), `${label} missing title`, errors);
  ensure(isNonEmptyString(block.briefCopy), `${label} missing briefCopy`, errors);
  ensure(isNonEmptyString(block.exportUse), `${label} missing exportUse`, errors);
  validateTerminalSourceRefs(block.sourceIds, sourceIdSet, label, errors);
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
  validateRequiredIds(data.sources, REQUIRED_TERMINAL_SOURCE_IDS, "Terminal source stack", errors);

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

  ensure(isNonEmptyString(data.competition.headline), "competition missing headline", errors);
  ensure(isNonEmptyString(data.competition.summary), "competition missing summary", errors);
  ensure(isNonEmptyString(data.competition.vaultLog.macStudioPath), "competition.vaultLog missing Mac Studio path", errors);
  ensure(
    data.competition.vaultLog.macStudioPath.startsWith("/Users/tjvillamil/pelayo-vault/"),
    "competition.vaultLog must point at the Mac Studio Pelayo Vault",
    errors,
  );
  ensure(isNonEmptyString(data.competition.vaultLog.localPath), "competition.vaultLog missing localPath", errors);
  ensure(isNonEmptyString(data.competition.vaultLog.caveat), "competition.vaultLog missing caveat", errors);
  ensure(
    data.competition.sources.length >= REQUIRED_COMPETITION_SOURCE_IDS.length,
    "competition missing source stack",
    errors,
  );
  validateRequiredIds(data.competition.sources, REQUIRED_COMPETITION_SOURCE_IDS, "Competition sources", errors);
  data.competition.sources.forEach((source, index) =>
    validateCompetitionSource(source, `competition.sources ${index + 1}`, errors),
  );

  const competitionSourceIds = new Set(data.competition.sources.map((source) => source.id));
  ensure(isNonEmptyString(data.competition.fdiScoreboard.headline), "competition.fdiScoreboard missing headline", errors);
  ensure(isNonEmptyString(data.competition.fdiScoreboard.summary), "competition.fdiScoreboard missing summary", errors);
  ensure(
    isNonEmptyString(data.competition.fdiScoreboard.observatory.headline),
    "competition.fdiScoreboard.observatory missing headline",
    errors,
  );
  ensure(
    isNonEmptyString(data.competition.fdiScoreboard.observatory.summary),
    "competition.fdiScoreboard.observatory missing summary",
    errors,
  );
  ensure(
    data.competition.fdiScoreboard.observatory.scores.length === 4,
    "competition.fdiScoreboard.observatory must include four scores",
    errors,
  );
  validateRequiredIds(
    data.competition.fdiScoreboard.observatory.scores,
    REQUIRED_FDI_OBSERVATORY_SCORE_IDS,
    "competition.fdiScoreboard.observatory.scores",
    errors,
  );
  data.competition.fdiScoreboard.observatory.scores.forEach((score, index) =>
    validateFdiObservatoryScore(score, competitionSourceIds, `competition.fdiScoreboard.observatory.scores ${index + 1}`, errors),
  );
  ensure(
    data.competition.fdiScoreboard.observatory.deltas.length >= 7,
    "competition.fdiScoreboard.observatory missing peer deltas",
    errors,
  );
  validateRequiredIds(
    data.competition.fdiScoreboard.observatory.deltas,
    REQUIRED_FDI_DELTA_STATE_IDS,
    "competition.fdiScoreboard.observatory.deltas",
    errors,
  );
  data.competition.fdiScoreboard.observatory.deltas.forEach((state, index) =>
    validateFdiDeltaState(state, competitionSourceIds, `competition.fdiScoreboard.observatory.deltas ${index + 1}`, errors),
  );
  ensure(data.competition.fdiScoreboard.metrics.length >= 4, "competition.fdiScoreboard missing metrics", errors);
  data.competition.fdiScoreboard.metrics.forEach((metric, index) =>
    validateCompetitionMetric(metric, competitionSourceIds, `competition.fdiScoreboard.metrics ${index + 1}`, errors),
  );
  ensure(data.competition.fdiScoreboard.states.length >= 7, "competition.fdiScoreboard missing peer states", errors);
  data.competition.fdiScoreboard.states.forEach((state, index) =>
    validateFdiCompetitorState(state, competitionSourceIds, `competition.fdiScoreboard.states ${index + 1}`, errors),
  );

  ensure(isNonEmptyString(data.competition.policyToolkit.headline), "competition.policyToolkit missing headline", errors);
  ensure(isNonEmptyString(data.competition.policyToolkit.summary), "competition.policyToolkit missing summary", errors);
  ensure(data.competition.policyToolkit.states.length >= 5, "competition.policyToolkit missing states", errors);
  data.competition.policyToolkit.states.forEach((state, index) =>
    validatePolicyToolkitState(state, competitionSourceIds, `competition.policyToolkit.states ${index + 1}`, errors),
  );

  ensure(
    isNonEmptyString(data.competition.institutionalCapacity.headline),
    "competition.institutionalCapacity missing headline",
    errors,
  );
  ensure(
    isNonEmptyString(data.competition.institutionalCapacity.summary),
    "competition.institutionalCapacity missing summary",
    errors,
  );
  ensure(
    data.competition.institutionalCapacity.metrics.length >= 3,
    "competition.institutionalCapacity missing metrics",
    errors,
  );
  data.competition.institutionalCapacity.metrics.forEach((metric, index) =>
    validateCompetitionMetric(metric, competitionSourceIds, `competition.institutionalCapacity.metrics ${index + 1}`, errors),
  );
  ensure(
    data.competition.institutionalCapacity.operatingLessons.length >= 3,
    "competition.institutionalCapacity missing operating lessons",
    errors,
  );
  data.competition.institutionalCapacity.operatingLessons.forEach((lesson, index) =>
    ensure(isNonEmptyString(lesson), `competition.institutionalCapacity lesson ${index + 1} is empty`, errors),
  );
  validateCompetitionSourceRefs(
    data.competition.institutionalCapacity.sourceIds,
    competitionSourceIds,
    "competition.institutionalCapacity",
    errors,
  );

  ensure(isNonEmptyString(data.competition.migration.headline), "competition.migration missing headline", errors);
  ensure(isNonEmptyString(data.competition.migration.summary), "competition.migration missing summary", errors);
  ensure(data.competition.migration.rankings.length >= 5, "competition.migration missing rankings", errors);
  data.competition.migration.rankings.forEach((rank, index) =>
    validateMigrationRank(rank, `competition.migration.rankings ${index + 1}`, errors),
  );
  ensure(isNonEmptyString(data.competition.migration.read), "competition.migration missing read", errors);
  validateCompetitionSourceRefs(data.competition.migration.sourceIds, competitionSourceIds, "competition.migration", errors);

  ensure(isNonEmptyString(data.competition.semiconductor.headline), "competition.semiconductor missing headline", errors);
  ensure(isNonEmptyString(data.competition.semiconductor.summary), "competition.semiconductor missing summary", errors);
  ensure(data.competition.semiconductor.commitments.length >= 10, "competition.semiconductor missing commitments", errors);
  data.competition.semiconductor.commitments.forEach((commitment, index) =>
    validateSemiconductorCommitment(commitment, `competition.semiconductor.commitments ${index + 1}`, errors),
  );
  const semiconductorTotal = data.competition.semiconductor.commitments.reduce(
    (sum, commitment) => sum + commitment.valueUsd,
    0,
  );
  ensure(
    semiconductorTotal === 391_985_340,
    "competition.semiconductor commitments must sum to the logged $391,985,340 spreadsheet total",
    errors,
  );
  ensure(isNonEmptyString(data.competition.semiconductor.read), "competition.semiconductor missing read", errors);
  validateCompetitionSourceRefs(
    data.competition.semiconductor.sourceIds,
    competitionSourceIds,
    "competition.semiconductor",
    errors,
  );
  ensure(data.competition.nextMoves.length >= 4, "competition.nextMoves missing build queue", errors);
  data.competition.nextMoves.forEach((move, index) =>
    ensure(isNonEmptyString(move), `competition.nextMoves ${index + 1} is empty`, errors),
  );

  ensure(isNonEmptyString(data.federal.headline), "federal missing headline", errors);
  ensure(isNonEmptyString(data.federal.summary), "federal missing summary", errors);
  ensure(isNonEmptyString(data.federal.refreshedAt), "federal missing refreshedAt", errors);
  ensure(data.federal.sources.length >= REQUIRED_FEDERAL_SOURCE_IDS.length, "federal missing source stack", errors);
  validateRequiredIds(data.federal.sources, REQUIRED_FEDERAL_SOURCE_IDS, "Federal sources", errors);
  data.federal.sources.forEach((source, index) => validateFederalSource(source, `federal.sources ${index + 1}`, errors));

  const federalSourceIds = new Set(data.federal.sources.map((source) => source.id));
  ensure(data.federal.signals.length >= REQUIRED_FEDERAL_SIGNAL_IDS.length, "federal missing signal stack", errors);
  validateRequiredIds(data.federal.signals, REQUIRED_FEDERAL_SIGNAL_IDS, "Federal signals", errors);
  data.federal.signals.forEach((signal, index) =>
    validateFederalSignal(signal, federalSourceIds, `federal.signals ${index + 1}`, errors),
  );
  ensure(
    data.federal.signals.some((signal) => signal.status === "live" && signal.sourceId === "bls_public_api"),
    "federal must include at least one live BLS signal",
    errors,
  );
  data.federal.missingKeys.forEach((key, index) =>
    ensure(isNonEmptyString(key), `federal.missingKeys ${index + 1} is empty`, errors),
  );
  ensure(data.federal.nextFeeds.length >= 4, "federal.nextFeeds missing activation queue", errors);
  data.federal.nextFeeds.forEach((feed, index) =>
    ensure(isNonEmptyString(feed), `federal.nextFeeds ${index + 1} is empty`, errors),
  );

  ensure(isNonEmptyString(data.terminal.headline), "terminal missing headline", errors);
  ensure(isNonEmptyString(data.terminal.thesis), "terminal missing thesis", errors);
  ensure(isNonEmptyString(data.terminal.operatingQuestion), "terminal missing operatingQuestion", errors);
  ensure(data.terminal.sources.length >= REQUIRED_TERMINAL_SOURCE_IDS.length, "terminal missing source stack", errors);
  validateRequiredIds(data.terminal.sources, REQUIRED_TERMINAL_SOURCE_IDS, "Terminal sources", errors);
  data.terminal.sources.forEach((source, index) => validateTerminalSource(source, `terminal.sources ${index + 1}`, errors));

  const terminalSourceIds = new Set(data.terminal.sources.map((source) => source.id));
  ensure(isNonEmptyString(data.terminal.aiCapexIndex.label), "terminal.aiCapexIndex missing label", errors);
  ensure(isFiniteNumber(data.terminal.aiCapexIndex.score), "terminal.aiCapexIndex missing score", errors);
  ensure(isFiniteNumber(data.terminal.aiCapexIndex.maxScore), "terminal.aiCapexIndex missing maxScore", errors);
  ensure(
    data.terminal.aiCapexIndex.score >= 0 && data.terminal.aiCapexIndex.score <= data.terminal.aiCapexIndex.maxScore,
    "terminal.aiCapexIndex score is outside maxScore",
    errors,
  );
  ensure(isNonEmptyString(data.terminal.aiCapexIndex.rating), "terminal.aiCapexIndex missing rating", errors);
  ensure(isNonEmptyString(data.terminal.aiCapexIndex.caveat), "terminal.aiCapexIndex missing caveat", errors);
  ensure(data.terminal.aiCapexIndex.metrics.length >= 4, "terminal.aiCapexIndex missing metrics", errors);
  ensure(data.terminal.aiCapexIndex.factors.length >= 5, "terminal.aiCapexIndex missing factors", errors);
  data.terminal.aiCapexIndex.metrics.forEach((metric, index) =>
    validateTerminalMetric(metric, terminalSourceIds, `terminal.aiCapexIndex.metrics ${index + 1}`, errors),
  );
  data.terminal.aiCapexIndex.factors.forEach((factor, index) =>
    validateTerminalIndexFactor(factor, terminalSourceIds, `terminal.aiCapexIndex.factors ${index + 1}`, errors),
  );

  ensure(isNonEmptyString(data.terminal.highWageMonitor.headline), "terminal.highWageMonitor missing headline", errors);
  ensure(isNonEmptyString(data.terminal.highWageMonitor.summary), "terminal.highWageMonitor missing summary", errors);
  ensure(data.terminal.highWageMonitor.metrics.length >= 3, "terminal.highWageMonitor missing metrics", errors);
  data.terminal.highWageMonitor.metrics.forEach((metric, index) =>
    validateTerminalMetric(metric, terminalSourceIds, `terminal.highWageMonitor.metrics ${index + 1}`, errors),
  );
  ensure(data.terminal.projectLedger.length >= 4, "terminal.projectLedger missing projects", errors);
  data.terminal.projectLedger.forEach((project, index) =>
    validateTerminalProject(project, terminalSourceIds, `terminal.projectLedger ${index + 1}`, errors),
  );
  ensure(data.terminal.forecasts.length >= 2, "terminal.forecasts missing forecasts", errors);
  data.terminal.forecasts.forEach((forecast, index) =>
    validateTerminalForecast(forecast, terminalSourceIds, `terminal.forecasts ${index + 1}`, errors),
  );
  ensure(data.terminal.policyMemos.length >= 2, "terminal.policyMemos missing memos", errors);
  data.terminal.policyMemos.forEach((memo, index) =>
    validateTerminalPolicyMemo(memo, terminalSourceIds, `terminal.policyMemos ${index + 1}`, errors),
  );
  ensure(data.terminal.evidenceBlocks.length >= 3, "terminal.evidenceBlocks missing blocks", errors);
  data.terminal.evidenceBlocks.forEach((block, index) =>
    validateTerminalEvidenceBlock(block, terminalSourceIds, `terminal.evidenceBlocks ${index + 1}`, errors),
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

  console.log("Dataset contract looks valid, including curated sections, State Competition, Terminal, and Florida Brain notes.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
