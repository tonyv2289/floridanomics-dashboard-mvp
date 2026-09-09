export type RegionalIdentity = {
  title: string;
  strengths: readonly string[];
  sceneNote: string;
  material: string;
  accent: number;
  ground: number;
  water: number;
};

export const REGIONAL_IDENTITIES: Record<string, RegionalIdentity> = {
  "space-coast": { title: "THE ORBITAL COAST", strengths: ["Launch infrastructure", "Space operations", "Maritime logistics"], sceneNote: "A launch tower, rocket, satellite and recovery harbor.", material: "Ceramic white · launch orange · Atlantic blue", accent: 0xff8f3f, ground: 0x506953, water: 0x123e5b },
  "orlando-osceola": { title: "THE SILICON STUDIO", strengths: ["Semiconductors", "Advanced packaging", "Modeling & simulation"], sceneNote: "A silicon wafer, exposed chip, cleanroom and simulation dome.", material: "Polished silicon · copper traces · cool glass", accent: 0x62c6e5, ground: 0x496b73, water: 0x142e40 },
  "tampa-bay": { title: "THE WORKING BAY", strengths: ["Cargo & logistics", "Defense innovation", "Research commercialization"], sceneNote: "Moving cargo, industrial gantries and a defense research pavilion.", material: "Oxidized copper · steel · deep harbor blue", accent: 0xe9a35c, ground: 0x607064, water: 0x163e50 },
  "south-florida": { title: "THE GLOBAL WATERFRONT", strengths: ["International trade", "Research & development", "Technology commercialization"], sceneNote: "A tropical skyline, palm-lined waterfront and cargo gateway.", material: "Ivory terraces · coral · turquoise water", accent: 0xf49b78, ground: 0x697158, water: 0x176079 },
  northeast: { title: "THE RIVER GATEWAY", strengths: ["Container cargo", "Vehicle logistics", "Intermodal connections"], sceneNote: "A cable-stayed river crossing, vehicle yards and cargo rail.", material: "Steel blue · river glass · freight orange", accent: 0x81bce2, ground: 0x466463, water: 0x234957 },
  "north-central": { title: "THE DISCOVERY GROVE", strengths: ["Biotech incubation", "High-field science", "Research commercialization"], sceneNote: "A botanical research campus, DNA helix and superconducting magnet.", material: "Campus brick · forest green · warm brass", accent: 0xe1b768, ground: 0x687551, water: 0x1e3c37 },
  panhandle: { title: "THE HUMAN–MACHINE COAST", strengths: ["Robotics", "Human–machine teaming", "Exoskeleton research"], sceneNote: "A humanoid test platform, articulated arm and coastal robotics lab.", material: "Quartz white · pine green · brushed alloy", accent: 0x9fd7c8, ground: 0x427568, water: 0x245865 },
  southwest: { title: "THE LIVING ESTUARY", strengths: ["Water science", "Ecosystem health", "Restoration & resilience"], sceneNote: "Mangrove islands, a research skiff, water sensors and an elevated lab.", material: "Mangrove jade · limestone · shallow-water teal", accent: 0x81d7b2, ground: 0x5c7758, water: 0x216b68 },
};

export function crispPixelRatio(ratio: number) {
  return Math.max(1, Math.min(Number.isFinite(ratio) ? ratio : 1, 2.5));
}

export function snapToDevicePixel(value: number, ratio: number) {
  return Math.round(value * ratio) / ratio;
}
