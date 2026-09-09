export const SOURCE_CHECKED = "2026-09-08";
export const SECTORS = ["All sectors", "Space", "Advanced industry", "Defense & simulation", "Trade & logistics", "Research & life sciences", "Water & resilience"] as const;
export type Sector = typeof SECTORS[number];
export type Asset = {
  id: string;
  name: string;
  kind: "Spaceport" | "Seaport" | "Research" | "Technology campus" | "Company";
  sector: Sector;
  coordinates: readonly [number, number];
  summary: string;
  source: string;
  sourceName: string;
  model: "rocket" | "port" | "chip" | "campus" | "dish" | "water";
};
export type Region = {
  id: string;
  name: string;
  shortName: string;
  coordinates: readonly [number, number];
  headline: string;
  description: string;
  detailed?: boolean;
  assets: Asset[];
};

// A curated, public-source prototype, not a comprehensive cluster census.
// Coordinates are approximate geographic anchors; models are illustrative.
export const REGIONS: Region[] = [
  {
    id: "space-coast", name: "Space Coast", shortName: "Space Coast", coordinates: [-80.68, 28.5], detailed: true,
    headline: "Where Florida leaves Earth.",
    description: "Explore a multi-user spaceport and the neighboring seaport. The Space Coast brings launch infrastructure and maritime logistics into the same regional view.",
    assets: [
      { id: "kennedy", name: "Kennedy Space Center", kind: "Spaceport", sector: "Space", coordinates: [-80.65, 28.59], model: "rocket", summary: "NASA’s Kennedy Space Center is a multi-user spaceport supporting government and commercial space operations, with launch, research and development facilities.", source: "https://www.nasa.gov/kennedy/", sourceName: "NASA · Kennedy Space Center" },
      { id: "canaveral", name: "Port Canaveral", kind: "Seaport", sector: "Trade & logistics", coordinates: [-80.6, 28.41], model: "port", summary: "Port Canaveral operates cargo facilities on Florida’s Atlantic coast. Its cargo resources cover maritime facilities and services for shippers.", source: "https://www.portcanaveral.com/Cargo", sourceName: "Port Canaveral · Cargo" },
    ],
  },
  {
    id: "orlando-osceola", name: "Orlando–Osceola", shortName: "Orlando–Osceola", coordinates: [-81.28, 28.38], detailed: true,
    headline: "The next layer of industry.",
    description: "A closer look at the region’s semiconductor campus and modeling, simulation and training research. Two different capabilities, one Central Florida chapter.",
    assets: [
      { id: "neocity", name: "NeoCity", kind: "Technology campus", sector: "Advanced industry", coordinates: [-81.35, 28.29], model: "chip", summary: "NeoCity is Osceola County’s 500-acre technology campus, south of Orlando. Its Center for Neovation is a semiconductor fabrication facility supporting the district’s technology ecosystem.", source: "https://www.neocityfl.com/what-is-neocity/", sourceName: "Osceola County · What is NeoCity?" },
      { id: "ucf-ist", name: "UCF Institute for Simulation & Training", kind: "Research", sector: "Defense & simulation", coordinates: [-81.2, 28.59], model: "dish", summary: "UCF’s Institute for Simulation & Training develops modeling, simulation and training technologies, tools, processes and systems in Orlando.", source: "https://www.ist.ucf.edu/", sourceName: "UCF · Institute for Simulation & Training" },
      { id: "skywater", name: "SkyWater Florida", kind: "Company", sector: "Advanced industry", coordinates: [-81.35, 28.29], model: "chip", summary: "NeoCity identifies SkyWater Florida as operator of the Center for Neovation, collaborating with BRIDG on microelectronics research and development and advanced packaging capabilities.", source: "https://www.neocityfl.com/current-innovation/", sourceName: "Osceola County · NeoCity current innovation" },
    ],
  },
  {
    id: "tampa-bay", name: "Tampa Bay", shortName: "Tampa Bay", coordinates: [-82.46, 27.95], detailed: true,
    headline: "Ideas meet the working waterfront.",
    description: "Move between cargo infrastructure, defense innovation and university commercialization. This chapter makes the region’s range visible in one place.",
    assets: [
      { id: "port-tampa", name: "Port Tampa Bay", kind: "Seaport", sector: "Trade & logistics", coordinates: [-82.44, 27.94], model: "port", summary: "Port Tampa Bay handles container, bulk, general, refrigerated and roll-on/roll-off cargo. Its facilities serve the Tampa Bay region and the I-4 corridor.", source: "https://www.porttb.com/cargo/", sourceName: "Port Tampa Bay · Cargo" },
      { id: "sofwerx", name: "SOFWERX", kind: "Research", sector: "Defense & simulation", coordinates: [-82.43, 27.96], model: "dish", summary: "SOFWERX brings technical experts and industry together to address Special Operations Forces challenges, including prototyping and USSOCOM-focused collaboration events.", source: "https://www.sofwerx.org/", sourceName: "SOFWERX · Mission and capabilities" },
      { id: "usf", name: "USF Research & Innovation", kind: "Research", sector: "Research & life sciences", coordinates: [-82.42, 28.06], model: "campus", summary: "USF supports research commercialization through technology transfer and USF CONNECT, which manages the Tampa Bay Technology Incubator and other startup programs.", source: "https://www.usf.edu/research-innovation/", sourceName: "University of South Florida · Research" },
    ],
  },
  {
    id: "south-florida", name: "South Florida", shortName: "South Florida", coordinates: [-80.3, 26.16],
    headline: "Research with a path to market.",
    description: "Start with Boca Raton’s university-affiliated research park. This regional overview will grow as more public-source assets are curated.",
    assets: [{ id: "fau-park", name: "Research Park at FAU", kind: "Technology campus", sector: "Research & life sciences", coordinates: [-80.1, 26.39], model: "campus", summary: "The Research Park at Florida Atlantic University supports research and development companies, university partnerships and technology-led economic development in South Florida.", source: "https://researchparkfau.com/", sourceName: "Research Park at Florida Atlantic University" }],
  },
  {
    id: "northeast", name: "Jacksonville & Northeast", shortName: "Jacksonville", coordinates: [-81.65, 30.33],
    headline: "Florida’s Atlantic gateway.",
    description: "Begin at Jacksonville’s cargo port, where marine terminals connect with the region’s rail and highway network.",
    assets: [{ id: "jaxport", name: "JAXPORT", kind: "Seaport", sector: "Trade & logistics", coordinates: [-81.56, 30.4], model: "port", summary: "The Jacksonville Port Authority is an international cargo gateway in Northeast Florida, handling containers, vehicles and other freight with access to rail and highway networks.", source: "https://www.jaxport.com/", sourceName: "Jacksonville Port Authority" }],
  },
  {
    id: "north-central", name: "Gainesville & Tallahassee", shortName: "Research corridor", coordinates: [-82.65, 29.9],
    headline: "From the lab to what comes next.",
    description: "Two research anchors across North Florida: startup incubation in Gainesville and Alachua, and high-field science in Tallahassee. A curated grouping, not an administrative region.",
    assets: [
      { id: "uf-innovate", name: "UF Innovate | Accelerate", kind: "Research", sector: "Research & life sciences", coordinates: [-82.43, 29.72], model: "campus", summary: "UF Innovate | Accelerate supports early-stage ventures through The Hub in Gainesville and Sid Martin Biotech in Alachua, with facilities, resources and business support.", source: "https://ufinnovateaccelerate.com/", sourceName: "University of Florida · UF Innovate | Accelerate" },
      { id: "maglab", name: "National MagLab", kind: "Research", sector: "Advanced industry", coordinates: [-84.32, 30.42], model: "dish", summary: "The National High Magnetic Field Laboratory conducts high-field research across materials, energy, health and the environment. Its headquarters are in Tallahassee, with facilities at FSU, UF and Los Alamos.", source: "https://www.magnet.fsu.edu/", sourceName: "National High Magnetic Field Laboratory" },
    ],
  },
  {
    id: "panhandle", name: "Northwest & Panhandle", shortName: "Northwest Florida", coordinates: [-87.21, 30.42],
    headline: "Human ingenuity. Machine capability.",
    description: "Pensacola’s IHMC is the first research anchor in this Northwest Florida overview, spanning robotics, AI and human performance.",
    assets: [{ id: "ihmc", name: "Institute for Human & Machine Cognition", kind: "Research", sector: "Defense & simulation", coordinates: [-87.21, 30.41], model: "dish", summary: "IHMC’s Pensacola campus is home to work in artificial intelligence, human-centered computing, robotics, exoskeletons and human performance. The institute also has an Ocala campus.", source: "https://www.ihmc.us/aboutihmc/", sourceName: "IHMC · The IHMC Story" }],
  },
  {
    id: "southwest", name: "Southwest Florida", shortName: "Southwest Florida", coordinates: [-81.8, 26.55],
    headline: "A living laboratory for water.",
    description: "Explore the Water School at Florida Gulf Coast University, a starting point for understanding the region’s water and environmental research.",
    assets: [{ id: "fgcu-water", name: "FGCU Water School", kind: "Research", sector: "Water & resilience", coordinates: [-81.77, 26.46], model: "water", summary: "The Water School at FGCU studies climate, natural resources, ecosystem health, restoration and remediation, drawing on Southwest Florida’s freshwater and saltwater environments.", source: "https://www.fgcu.edu/thewaterschool/", sourceName: "Florida Gulf Coast University · The Water School" }],
  },
];

export const TOUR = REGIONS.filter((region) => region.detailed);
export const ALL_ASSETS = REGIONS.flatMap((region) => region.assets);
export function regionMatches(region: Region, sector: Sector): boolean {
  return sector === "All sectors" || region.assets.some((asset) => asset.sector === sector);
}
export function projectLocation([longitude, latitude]: readonly number[]): [number, number] {
  return [(longitude + 83.5) * 1.32, (28.1 - latitude) * 1.5];
}
export function nextTourRegion(current: string | null, direction: 1 | -1): string {
  const index = TOUR.findIndex((region) => region.id === current);
  if (index === -1) return TOUR[direction === 1 ? 0 : TOUR.length - 1].id;
  return TOUR[(index + direction + TOUR.length) % TOUR.length].id;
}

export function readAtlasQuery(search: string): { regionId: string | null; sector: Sector } {
  const params = new URLSearchParams(search);
  const sector = SECTORS.find((value) => value === params.get("sector")) ?? "All sectors";
  const region = REGIONS.find((value) => value.id === params.get("region") && regionMatches(value, sector));
  return { regionId: region?.id ?? null, sector };
}

export function overviewPose(aspect: number): { position: [number, number, number]; target: [number, number, number] } {
  const distance = aspect < 0.9 ? 1.22 : 1;
  return { position: [6 * distance, 13.4 * distance, 14.8 * distance], target: [0, 0, 0.25] };
}
