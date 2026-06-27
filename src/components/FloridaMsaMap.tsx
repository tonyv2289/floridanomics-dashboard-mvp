import { geoAlbersUsa, geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import floridaGeo from "../data/florida.geo.json";

type MetroForMap = {
  id: string;
  name: string;
  laborForce: { sparkline: Array<{ value: number }> };
  unemploymentRate: { latest: { value: number } };
};

type FloridaMsaMapProps = {
  metros: MetroForMap[];
  selectedMetroId: string;
  onSelectMetro: (metroId: string) => void;
};

const MAP_WIDTH = 560;
const MAP_HEIGHT = 460;

const METRO_COORDS: Record<string, { lat: number; lon: number; dx?: number; dy?: number }> = {
  miami: { lat: 25.7617, lon: -80.1918, dx: 12, dy: 6 },
  tampa: { lat: 27.9506, lon: -82.4572, dx: -12, dy: 6 },
  orlando: { lat: 28.5383, lon: -81.3792, dx: 12, dy: -10 },
  jacksonville: { lat: 30.3322, lon: -81.6557, dx: 12, dy: -10 },
};

type MomentumTone = "hot" | "warm" | "flat" | "cooling";
const MOMENTUM_COLORS: Record<MomentumTone, string> = {
  hot: "#3ee8b0",
  warm: "#56c2ff",
  flat: "#94a3b8",
  cooling: "#ff70a8",
};
const TONE_LABEL: Record<MomentumTone, string> = {
  hot: "Accelerating",
  warm: "Growing",
  flat: "Flat",
  cooling: "Cooling",
};

function laborForceMomentumPct(sparkline: Array<{ value: number }>): number | null {
  if (!sparkline || sparkline.length < 2) {
    return null;
  }
  const first = sparkline[0].value;
  const last = sparkline[sparkline.length - 1].value;
  if (!first) {
    return null;
  }
  return ((last - first) / first) * 100;
}

function momentumTone(pct: number | null): MomentumTone {
  if (pct == null) {
    return "flat";
  }
  if (pct >= 2.5) {
    return "hot";
  }
  if (pct >= 0.5) {
    return "warm";
  }
  if (pct <= -0.5) {
    return "cooling";
  }
  return "flat";
}

export function FloridaMsaMap({ metros, selectedMetroId, onSelectMetro }: FloridaMsaMapProps) {
  const florida = floridaGeo as unknown as Feature<MultiPolygon | Polygon>;
  if (!florida) {
    return null;
  }

  const projection = geoAlbersUsa().fitSize([MAP_WIDTH, MAP_HEIGHT], florida);
  const pathGenerator = geoPath(projection);
  const floridaPath = pathGenerator(florida) ?? "";

  const pins = metros
    .map((metro) => {
      const coords = METRO_COORDS[metro.id];
      const projected = coords ? projection([coords.lon, coords.lat]) : null;
      if (!coords || !projected) {
        return null;
      }
      const tone = momentumTone(laborForceMomentumPct(metro.laborForce.sparkline));
      return {
        id: metro.id,
        name: metro.name.replace(" MSA", ""),
        x: projected[0],
        y: projected[1],
        dx: coords.dx ?? 12,
        dy: coords.dy ?? -10,
        tone,
        unemployment: metro.unemploymentRate.latest.value,
      };
    })
    .filter((pin): pin is NonNullable<typeof pin> => Boolean(pin));

  return (
    <section className="v3-frame">
      <p className="v3-kicker">Metro momentum</p>
      <div className="v3-panel-head">
        <div>
          <h2>Where Florida&apos;s metros are heading.</h2>
          <p>Colored by labor-force momentum. Click a metro to focus the read on it.</p>
        </div>
        <div className="v3-map-legend">
          {(["hot", "warm", "flat", "cooling"] as MomentumTone[]).map((tone) => (
            <span key={tone}>
              <i style={{ background: MOMENTUM_COLORS[tone] }} aria-hidden="true" />
              {TONE_LABEL[tone]}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="v3-florida-map"
        role="img"
        aria-label="Florida metros colored by labor-force momentum, clickable"
      >
        <path d={floridaPath} fill="rgba(86,194,255,0.10)" stroke="rgba(148,163,184,0.35)" strokeWidth={1} />
        {pins.map((pin) => {
          const selected = pin.id === selectedMetroId;
          const color = MOMENTUM_COLORS[pin.tone];
          return (
            <g
              key={pin.id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectMetro(pin.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectMetro(pin.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${pin.name}: ${TONE_LABEL[pin.tone]}, unemployment ${pin.unemployment.toFixed(1)} percent`}
            >
              <circle cx={pin.x} cy={pin.y} r={selected ? 14 : 9} fill={color} fillOpacity={selected ? 0.28 : 0.18} />
              <circle cx={pin.x} cy={pin.y} r={selected ? 7 : 5.5} fill={color} stroke="#02060d" strokeWidth={1.5} />
              <text
                x={pin.x + pin.dx}
                y={pin.y + pin.dy}
                fill="#e8eef9"
                fontSize={12}
                fontWeight={600}
                textAnchor={pin.dx < 0 ? "end" : "start"}
              >
                {pin.name}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
