import { geoAlbersUsa, geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import floridaGeo from "../data/florida.geo.json";

type Metro = {
  id: string;
  name: string;
};

type FloridaMsaMapProps = {
  metros: Metro[];
  selectedMetroId: string;
  onSelectMetro: (metroId: string) => void;
};

const MAP_WIDTH = 560;
const MAP_HEIGHT = 460;

const METRO_COORDS: Record<string, { lat: number; lon: number; dx?: number; dy?: number }> = {
  miami: { lat: 25.7617, lon: -80.1918, dx: 10, dy: 4 },
  tampa: { lat: 27.9506, lon: -82.4572, dx: 10, dy: 4 },
  orlando: { lat: 28.5383, lon: -81.3792, dx: 10, dy: -10 },
  jacksonville: { lat: 30.3322, lon: -81.6557, dx: 10, dy: -10 },
};

function metroShortName(name: string): string {
  return name.replace(" MSA", "");
}

export function FloridaMsaMap({ metros, selectedMetroId, onSelectMetro }: FloridaMsaMapProps) {
  const florida = floridaGeo as unknown as Feature<MultiPolygon | Polygon>;

  if (!florida) {
    return (
      <div className="map-fallback">
        <p>Florida map is unavailable.</p>
      </div>
    );
  }

  const projection = geoAlbersUsa().fitSize([MAP_WIDTH, MAP_HEIGHT], florida);
  const pathGenerator = geoPath(projection);
  const floridaPath = pathGenerator(florida) ?? "";

  const pins = metros
    .map((metro) => {
      const coords = METRO_COORDS[metro.id];
      if (!coords) {
        return null;
      }

      const projected = projection([coords.lon, coords.lat]);
      if (!projected) {
        return null;
      }

      return {
        ...metro,
        x: projected[0],
        y: projected[1],
        dx: coords.dx ?? 10,
        dy: coords.dy ?? -10,
      };
    })
    .filter((pin): pin is { id: string; name: string; x: number; y: number; dx: number; dy: number } => Boolean(pin));

  return (
    <div className="panel florida-map-panel">
      <header className="map-header">
        <div>
          <p className="kicker">Florida MSA Map</p>
          <h3>Click a metro to focus the dashboard</h3>
        </div>
      </header>

      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="florida-map" role="img" aria-label="Florida map with clickable metro markers">
        <defs>
          <linearGradient id="floridaFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
            <stop offset="100%" stopColor="rgba(113, 153, 255, 0.3)" />
          </linearGradient>
          <filter id="pinGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(249, 115, 22, 0.7)" />
          </filter>
        </defs>

        <path d={floridaPath} className="florida-shape" />

        {pins.map((pin) => {
          const selected = pin.id === selectedMetroId;

          return (
            <g
              key={pin.id}
              className={`metro-pin ${selected ? "metro-pin-selected" : ""}`}
              onClick={() => onSelectMetro(pin.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectMetro(pin.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${pin.name}`}
            >
              <line x1={pin.x} y1={pin.y} x2={pin.x + pin.dx - 3} y2={pin.y + pin.dy + 2} className="pin-line" />
              <circle cx={pin.x} cy={pin.y} r={selected ? 13 : 10} className="pin-halo" />
              <circle cx={pin.x} cy={pin.y} r={selected ? 7.5 : 6} className="pin-dot" />
              <text x={pin.x + pin.dx} y={pin.y + pin.dy} className="pin-label">
                {metroShortName(pin.name)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
