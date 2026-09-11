import { useEffect } from "react";
import economy from "../../public/data/regional-economy.json";
import { REGIONAL_PROFILES, regionIdFromPath } from "./profiles";
import { RegionProfile } from "./RegionProfile";
import "./regions.css";

export default function RegionRoute() {
  const id = regionIdFromPath(window.location.pathname);
  const profile = REGIONAL_PROFILES.find((region) => region.id === id);
  useEffect(() => { if (profile) document.title = `${profile.title} | Floridanomics`; }, [profile]);
  return profile ? <RegionProfile profile={profile} economy={economy} base={import.meta.env.BASE_URL} /> : <main id="region-main" className="region-page"><h1>Regional profile not found</h1><a href={`${import.meta.env.BASE_URL}?view=atlas`}>Explore the eight regions</a></main>;
}
