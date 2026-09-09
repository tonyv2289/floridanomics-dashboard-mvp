export type RegionalIdentity = {
  title: string;
  strengths: readonly string[];
  sceneNote: string;
  material: string;
  accent: number;
  ground: number;
  water: number;
  // Exploded atlas layout. Leaders retain the geographic anchor on Florida.
  position: readonly [number, number, number];
};

export const REGIONAL_IDENTITIES: Record<string, RegionalIdentity> = {
  "space-coast": { title: "THE ORBITAL COAST", strengths: ["Launch infrastructure", "Space operations", "Maritime logistics"], sceneNote: "A launch tower, rocket, satellite and recovery harbor.", material: "Ceramic white · launch orange · Atlantic blue", accent: 0xff8f3f, ground: 0x374c4e, water: 0x123e5b, position: [6.1, 0.75, -0.7] },
  "orlando-osceola": { title: "THE SILICON STUDIO", strengths: ["Semiconductors", "Advanced packaging", "Modeling & simulation"], sceneNote: "A silicon wafer, exposed chip, cleanroom and simulation dome.", material: "Polished silicon · copper traces · cool glass", accent: 0x62c6e5, ground: 0x293f52, water: 0x142e40, position: [2.9, 0.8, -0.4] },
  "tampa-bay": { title: "THE WORKING BAY", strengths: ["Cargo & logistics", "Defense innovation", "Research commercialization"], sceneNote: "Moving cargo, industrial gantries and a defense research pavilion.", material: "Oxidized copper · steel · deep harbor blue", accent: 0xe9a35c, ground: 0x514b3c, water: 0x163e50, position: [-0.55, 0.8, 0.7] },
  "south-florida": { title: "THE GLOBAL WATERFRONT", strengths: ["International trade", "Research & development", "Technology commercialization"], sceneNote: "A tropical skyline, palm-lined waterfront and cargo gateway.", material: "Ivory terraces · coral · turquoise water", accent: 0xf49b78, ground: 0x766e59, water: 0x176079, position: [5.8, 0.7, 3.2] },
  northeast: { title: "THE RIVER GATEWAY", strengths: ["Container cargo", "Vehicle logistics", "Intermodal connections"], sceneNote: "A cable-stayed river crossing, vehicle yards and cargo rail.", material: "Steel blue · river glass · freight orange", accent: 0x81bce2, ground: 0x414d4a, water: 0x234957, position: [3.0, 0.8, -4.1] },
  "north-central": { title: "THE DISCOVERY GROVE", strengths: ["Biotech incubation", "High-field science", "Research commercialization"], sceneNote: "A botanical research campus, DNA helix and superconducting magnet.", material: "Campus brick · forest green · warm brass", accent: 0xe1b768, ground: 0x3d5c4c, water: 0x1e3c37, position: [-0.65, 0.8, -3.2] },
  panhandle: { title: "THE HUMAN–MACHINE COAST", strengths: ["Robotics", "Human–machine teaming", "Exoskeleton research"], sceneNote: "A humanoid test platform, articulated arm and coastal robotics lab.", material: "Quartz white · pine green · brushed alloy", accent: 0x9fd7c8, ground: 0x596958, water: 0x245865, position: [-4.5, 0.8, -3.6] },
  southwest: { title: "THE LIVING ESTUARY", strengths: ["Water science", "Ecosystem health", "Restoration & resilience"], sceneNote: "Mangrove islands, a research skiff, water sensors and an elevated lab.", material: "Mangrove jade · limestone · shallow-water teal", accent: 0x81d7b2, ground: 0x6c7751, water: 0x216b68, position: [1.5, 0.7, 3.5] },
};

export function regionalCameraPose(regionId: string, aspect: number) {
  const [x, y, z] = REGIONAL_IDENTITIES[regionId].position;
  const distance = Math.max(1.1, 1.02 / Math.max(aspect, 0.25));
  return { position: [x + 4.5 * distance, y + 6.1 * distance, z + 8.4 * distance] as const, target: [x, y + 0.6, z] as const };
}

export function crispPixelRatio(ratio: number) {
  return Math.max(1, Math.min(Number.isFinite(ratio) ? ratio : 1, 2.5));
}

export function snapToDevicePixel(value: number, ratio: number) {
  return Math.round(value * ratio) / ratio;
}
