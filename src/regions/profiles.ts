export type RegionalSource = { label: string; url: string; asOf: string };
export type RegionalEntry = { name: string; detail: string; source: RegionalSource };
export type RegionalProject = RegionalEntry & { status: "Construction announced" | "Funding awarded" | "Opened" | "Planned"; milestone: string };
export type RegionalProfile = {
  id: string; title: string; description: string; read: string; watch: string;
  employers: RegionalEntry[]; research: RegionalEntry[]; projects: RegionalProject[];
  reviewedAt: string;
};

const blue = { label: "Blue Origin · LC-36B construction", url: "https://www.blueorigin.com/news/returning-launch-complex-36-to-two-pads", asOf: "2026-08-12" };
const engine = { label: "Florida Semiconductor Engine · Phase 2", url: "https://semiconductorengine.org/florida-semiconductor-engine-advances-to-phase-2-with-up-to-45m-in-nsf-funding-to-accelerate-commercialization-and-growth/", asOf: "2026-03-23" };
const moffitt = { label: "Moffitt · Speros now open", url: "https://www.moffitt.org/for-healthcare-professionals/clinical-perspectives/clinical-perspectives-story-archive/moffitt-at-speros-outpatient-center/", asOf: "2026-02-09" };
const fiu = { label: "FIU · Campus construction update", url: "https://news.fiu.edu/2026/fiu-in-the-future-new-buildings-under-construction-to-support-growth-and-innovation", asOf: "2026-03-31" };
const mayo = { label: "Mayo Clinic · Jacksonville campus buildings", url: "https://www.mayoclinic.org/patient-visitor-guide/florida/campus-buildings-maps", asOf: "2026-09-11" };
const danfoss = { label: "Danfoss · Tallahassee factory opening", url: "https://www.danfoss.com/en-us/about-danfoss/news/cf/danfoss-turbocor-holds-grand-opening-ceremony-for-new-turbocor-facility-in-tallahassee/", asOf: "2024-05-30" };
const uf = { label: "UF · 2025–2026 AI year in review", url: "https://ai.ufl.edu/news-archive/news/review-2026/", asOf: "2026-09-11" };
const ihmc = { label: "IHMC · Innovation in Action", url: "https://www.ihmc.us/innovation-in-action/", asOf: "2026-09-11" };
const fgcu = { label: "FGCU · Regional partnerships annual report", url: "https://www.fgcu.edu/about/officeofthepresident/annual-report/elevate-partnerships-for-regional-impact", asOf: "2026-09-11" };

// Public editorial research only. Review dates do not change the underlying milestone dates.
export const REGIONAL_PROFILES: RegionalProfile[] = [
  {
    id: "space-coast", title: "Space Coast", reviewedAt: "2026-09-11",
    description: "Launch facilities, aerospace production and a working port make Brevard a place where engineering moves into operations.",
    read: "The economic value of launch activity extends to the work required before and between missions: manufacturing, testing, maintenance and supplier services. Kennedy Space Center, commercial launch facilities and Port Canaveral give this region a distinct operating base. The question is how much of that work remains with Florida firms and workers as launch capacity expands.",
    watch: "Follow construction and commissioning at LC-36B, then hiring and supplier contracts. A pad under construction is not yet additional operating launch capacity.",
    employers: [{ name: "Blue Origin", detail: "New Glenn launch operations and additional launch infrastructure at Cape Canaveral. The company's August 2026 announcement describes a substantial Florida workforce and supplier network; neither is a Brevard-wide employment total.", source: blue }],
    research: [{ name: "Kennedy Space Center", detail: "NASA's multi-user spaceport combines launch infrastructure with research, engineering and technology development for government and commercial missions.", source: { label: "NASA · Kennedy Space Center", url: "https://www.nasa.gov/kennedy/", asOf: "2026-09-11" } }],
    projects: [{ name: "Launch Complex 36B", status: "Construction announced", milestone: "August 12, 2026", detail: "Blue Origin reports construction of LC-36B and supporting infrastructure for New Glenn. The announcement also describes a vertical integration facility and a payload processing facility. These are expansion plans and construction activity, not completed launch capacity.", source: blue }],
  },
  {
    id: "orlando-osceola", title: "Orlando–Osceola", reviewedAt: "2026-09-11",
    description: "Semiconductor facilities in Osceola and simulation expertise in Orlando connect specialized production with technical talent.",
    read: "NeoCity gives semiconductor companies access to physical facilities, while UCF's simulation research provides a separate concentration of engineering expertise. The Florida Semiconductor Engine adds a vehicle for translating research into products and workforce programs. These capabilities support diversification beyond the visitor economy, but funding commitments alone do not demonstrate commercial sales or sustained employment.",
    watch: "Track Phase 2 funding obligations, company participation, technician training and products reaching customers. Keep the Engine's statewide footprint separate from Orange and Osceola county statistics.",
    employers: [{ name: "SkyWater Florida", detail: "NeoCity identifies SkyWater Florida as the operator of the Center for Neovation, with microelectronics research and advanced packaging capabilities.", source: { label: "Osceola County · NeoCity current innovation", url: "https://www.neocityfl.com/current-innovation/", asOf: "2026-09-11" } }],
    research: [{ name: "UCF Institute for Simulation & Training", detail: "Research in modeling, simulation and training links the university with applications in defense and other technical fields.", source: { label: "UCF · Institute for Simulation & Training", url: "https://www.ist.ucf.edu/", asOf: "2026-09-11" } }],
    projects: [{ name: "Florida Semiconductor Engine, Phase 2", status: "Funding awarded", milestone: "March 23, 2026", detail: "The Engine announced advancement to Phase 2, with up to $15 million annually for three years, or up to $45 million. That ceiling is conditional program funding, not a statement that the full amount has been spent or invested in a single plant.", source: engine }],
  },
  {
    id: "tampa-bay", title: "Tampa Bay", reviewedAt: "2026-09-11",
    description: "Clinical research, defense technology and port commerce give Tampa Bay several routes into higher-value business activity.",
    read: "Moffitt and USF combine specialized care, research and commercialization capabilities. SOFWERX connects technical work with defense needs, while Port Tampa Bay serves a different but important production and distribution base. These are complementary sources of demand for technical workers, suppliers and professional services, rather than a single technology industry.",
    watch: "Separate the operating Speros outpatient center from later phases of the wider campus. Look for company activity, clinical research and supplier spending alongside additional construction.",
    employers: [{ name: "Moffitt Cancer Center", detail: "A clinical and research employer with an expanded presence in Pasco County. Its Speros outpatient center is serving patients; later campus components have separate delivery schedules.", source: moffitt }],
    research: [{ name: "USF Research & Innovation", detail: "Technology transfer and USF CONNECT support commercialization and early-stage businesses, including the Tampa Bay Technology Incubator.", source: { label: "University of South Florida · Research", url: "https://www.usf.edu/research-innovation/", asOf: "2026-09-11" } }],
    projects: [{ name: "Moffitt Speros Outpatient Center", status: "Opened", milestone: "January 2026; operating confirmed February 9, 2026", detail: "Moffitt confirms that its Pasco outpatient center is open. This is an operating milestone within the broader Speros development, not completion of the full campus or all planned treatment capabilities.", source: moffitt }],
  },
  {
    id: "south-florida", title: "South Florida", reviewedAt: "2026-09-11",
    description: "International commerce and university research connect Miami-Dade, Broward and Palm Beach to markets beyond Florida.",
    read: "South Florida's ports and logistics businesses connect the region to international customers. FIU's engineering facilities and the Research Park at FAU add research and company-development capacity. The development question is how those connections support local product development, specialized services and well-paid employment, alongside the region's established role in moving goods and capital.",
    watch: "Track how research facilities are used by faculty, students and companies. Keep FIU's completed first innovation building separate from the proposed second phase.",
    employers: [{ name: "Ryder System", detail: "The logistics and transportation company locates its corporate headquarters in Coral Gables, connecting management and professional services with a broader freight network.", source: { label: "Ryder · Corporate contact information", url: "https://prod.ryder.com/en-us/contact-us", asOf: "2026-09-11" } }],
    research: [{ name: "FIU Innovation Complex", detail: "Phase I's engineering and computing classrooms and laboratories opened for classes in 2025. FIU's March 2026 update describes plans for a second phase with additional research space.", source: fiu }],
    projects: [{ name: "FIU Innovation Complex, Phase II", status: "Planned", milestone: "Plans described March 31, 2026", detail: "FIU describes a proposed building of more than 77,000 square feet, including wet and dry laboratories. The published plan is distinct from the completed Phase I building and is not represented here as operating space.", source: fiu }],
  },
  {
    id: "northeast", title: "Jacksonville & Northeast Florida", reviewedAt: "2026-09-11",
    description: "Financial technology, specialized medicine and cargo logistics broaden Jacksonville's economic base.",
    read: "FIS, Mayo Clinic and JAXPORT bring different forms of outside demand into Northeast Florida. Financial technology requires technical and professional services; complex medical care supports clinical research and specialized suppliers; port activity connects the region to goods markets. This mix matters because the region's productive economy is wider than its freight network alone.",
    watch: "Follow Mayo's treatment commissioning separately from the opening of the building that houses it. A completed facility does not mean every planned technology is treating patients.",
    employers: [
      { name: "FIS", detail: "The financial technology company lists its Jacksonville address at 347 Riverside Avenue and supplies technology for banking, payments and investing.", source: { label: "FIS · Corporate contact information", url: "https://www.fisglobal.com/contact-us", asOf: "2026-09-11" } },
      { name: "Mayo Clinic in Florida", detail: "Mayo's Jacksonville campus provides complex care and research. The Duan Family Building expands cancer-care facilities within that campus.", source: mayo },
    ],
    research: [{ name: "Mayo Clinic cancer-care campus", detail: "Integrated care, clinical research and specialized facilities provide a base for medical innovation in Jacksonville.", source: mayo }],
    projects: [{ name: "Duan Family Building", status: "Opened", milestone: "2025 opening; treatment phases follow", detail: "Mayo announced the building opening in June 2025; its current campus guide dates the opening to July. The announcement separately scheduled proton therapy for 2027 and carbon ion therapy for 2028. Those future treatments are not counted as operating capabilities here.", source: { label: "Mayo Clinic · Duan Family Building opening", url: "https://newsnetwork.mayoclinic.org/discussion/mayo-clinic-takes-the-next-step-in-making-heavy-particle-therapy-available-in-the-western-hemisphere-for-patients-with-aggressive-cancers/", asOf: "2025-06-11" } }],
  },
  {
    id: "north-central", title: "Gainesville & Tallahassee", reviewedAt: "2026-09-11",
    description: "Research computing, life-science ventures and specialized manufacturing link two distinct university-centered economies.",
    read: "UF's computing and commercialization resources and Tallahassee's MagLab provide specialized capabilities that individual companies would struggle to reproduce. Danfoss Turbocor adds a documented manufacturing example in Tallahassee. These assets support knowledge transfer and technical employment, but their presence does not establish that every local business benefits or that the two cities form one labor market.",
    watch: "Look for research translated into licensed technology, growing firms and production. Gainesville and Tallahassee remain separate local economies; their county figures are shown separately below.",
    employers: [{ name: "Danfoss Turbocor", detail: "Danfoss manufactures oil-free, magnetic-bearing compressors in Tallahassee. Its 2024 factory expansion added 145,000 square feet and was described as doubling manufacturing capacity.", source: danfoss }],
    research: [{ name: "UF HiPerGator", detail: "UF's 2025–2026 review reports completion of the fourth-generation supercomputer installation in September 2025, providing shared computing capacity for research and teaching.", source: uf }],
    projects: [
      { name: "HiPerGator fourth-generation installation", status: "Opened", milestone: "Installation completed September 2025", detail: "UF reports that the upgraded system is in use by students, faculty and staff. Its contribution is access to research computing; it should not be described as commercial data-center capacity.", source: uf },
      { name: "Danfoss Turbocor factory expansion", status: "Opened", milestone: "May 29, 2024", detail: "The company's $62 million expansion is an established production investment. Its announced capacity increase is distinct from realized sales, output or employment growth.", source: danfoss },
    ],
  },
  {
    id: "panhandle", title: "Northwest Florida & the Panhandle", reviewedAt: "2026-09-11",
    description: "Human-performance research and financial services add depth to Northwest Florida's defense-linked economy.",
    read: "IHMC connects robotics and artificial intelligence with research on human performance. Navy Federal's Pensacola operations add a separate concentration of financial-services employment. Together they illustrate why the region should be assessed through both specialized research capabilities and its established employers, rather than tourism or defense activity alone.",
    watch: "Follow research awards and applied work at IHMC alongside private-sector hiring. Pensacola examples do not describe every community across the Panhandle.",
    employers: [{ name: "Navy Federal Credit Union", detail: "Navy Federal's corporate fact sheet lists 8,500 Pensacola employees. This is the institution's reported location count, not total financial-services employment in Escambia County.", source: { label: "Navy Federal · Corporate fact sheet", url: "https://www.navyfederal.org/about/corporate-fact-sheet.html", asOf: "2026-09-11" } }],
    research: [{ name: "Institute for Human & Machine Cognition", detail: "The Pensacola institute brings together robotics, computing and human-performance research. Its research infrastructure includes the Levin Center and the Healthspan, Resilience and Performance complex.", source: ihmc }],
    projects: [{ name: "IHMC Healthspan, Resilience & Performance Complex", status: "Opened", milestone: "Summer 2024", detail: "IHMC's 2024 newsletter records the ribbon cutting of its $40 million research complex. This is an established facility milestone, not a newly announced 2026 investment.", source: { label: "IHMC · 2024 newsletter, volume 19.3", url: "https://www.ihmc.us/wp-content/uploads/2024/10/Newsletter-v19.3-2024.pdf", asOf: "2024-10" } }],
  },
  {
    id: "southwest", title: "Southwest Florida", reviewedAt: "2026-09-11",
    description: "Medical-device production and applied water research give Southwest Florida strengths beyond population-driven construction and services.",
    read: "Arthrex connects medical-device development and manufacturing with surgeon education. FGCU's Water School addresses environmental systems that affect communities and businesses across Southwest Florida. These are distinct economic assets: one supports specialized production, the other builds knowledge relevant to water management and resilience. Their importance is clearer when the region is viewed beyond residential growth alone.",
    watch: "Follow FGCU's Babcock Ranch project from funding through construction and opening. The planned institute is in Charlotte County, separate from the university's existing Lee County campus.",
    employers: [{ name: "Arthrex", detail: "The medical-device company lists its global headquarters in Naples, manufacturing in Ave Maria and a logistics center in Fort Myers. These functions connect product development with production, distribution and medical education.", source: { label: "Arthrex · Corporate locations", url: "https://www.arthrex.com/corporate/locations", asOf: "2026-09-11" } }],
    research: [{ name: "FGCU Water School", detail: "Research addresses freshwater and coastal systems, ecosystem health, restoration and related environmental questions in Southwest Florida.", source: { label: "FGCU · The Water School", url: "https://www.fgcu.edu/thewaterschool/", asOf: "2026-09-11" } }],
    projects: [{ name: "FGCU at Babcock Ranch", status: "Planned", milestone: "First-phase funding in the 2025–2026 state budget", detail: "FGCU reports $21.7 million in state support for the first phase of a planned 125,000-square-foot learning, research and outreach institute in Charlotte County. This is planned capacity, not an open campus.", source: fgcu }],
  },
];

export function regionalPath(id: string, base = "/"): string { return `${base}regions/${id}/`; }
export function regionIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/regions\/([a-z-]+)\/?$/);
  return match && REGIONAL_PROFILES.some((profile) => profile.id === match[1]) ? match[1] : null;
}
