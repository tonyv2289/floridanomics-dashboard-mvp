import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Pair } from "polygon-clipping";
import florida from "../data/florida.geo.json";
import { REGIONS, projectLocation } from "./data";

// Editorial regions, not county or administrative boundaries. Nearest-anchor
// cells partition the existing coastline without gaps, overlaps or invented land.
const snap = ([x, z]: Pair): Pair => [Math.round(x * 1e9) / 1e9, Math.round(z * 1e9) / 1e9];
export const FLORIDA_LAND: MultiPolygon = florida.geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map((point) => snap(projectLocation(point)))));
export const LAND_HEIGHT = 0.3;

function clipCell(ring: Pair[], seed: Pair, other: Pair): Pair[] {
  const nx = other[0] - seed[0], nz = other[1] - seed[1];
  const offset = (other[0] ** 2 + other[1] ** 2 - seed[0] ** 2 - seed[1] ** 2) / 2;
  const side = ([x, z]: Pair) => x * nx + z * nz - offset;
  const result: Pair[] = [];
  ring.forEach((end, i) => {
    const start = ring[(i + ring.length - 1) % ring.length];
    const a = side(start), b = side(end);
    if ((a <= 0) !== (b <= 0)) {
      const t = a / (a - b);
      result.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
    }
    if (b <= 0) result.push(end);
  });
  return result;
}

export function insideRing([x, z]: Pair, ring: Pair[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

export function containsLand(point: Pair, polygons: MultiPolygon) {
  return polygons.some(([outer, ...holes]) => insideRing(point, outer) && !holes.some((hole) => insideRing(point, hole)));
}

function edgeDistance(point: Pair, polygons: MultiPolygon) {
  let distance = Infinity;
  for (const polygon of polygons) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    distance = Math.min(distance, Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dz));
  }
  return containsLand(point, polygons) ? distance : -distance;
}

// A stable interior placement with enough clearance for each miniature. These
// are illustrative placements within a region, not the facilities' coordinates.
function interiorPlacement(polygons: MultiPolygon) {
  const points = polygons.flat(2);
  const minX = Math.min(...points.map((p) => p[0])), maxX = Math.max(...points.map((p) => p[0]));
  const minZ = Math.min(...points.map((p) => p[1])), maxZ = Math.max(...points.map((p) => p[1]));
  let center: Pair = [(minX + maxX) / 2, (minZ + maxZ) / 2], radius = -Infinity;
  let span = Math.max(maxX - minX, maxZ - minZ);
  for (let pass = 0; pass < 4; pass++) {
    const origin: Pair = [center[0] - span / 2, center[1] - span / 2];
    for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) {
      const point: Pair = [origin[0] + span * x / 24, origin[1] + span * z / 24];
      const clearance = edgeDistance(point, polygons);
      if (clearance > radius) { radius = clearance; center = point; }
    }
    span /= 8;
  }
  return { center, radius, bounds: { minX, maxX, minZ, maxZ } };
}

const seeds = REGIONS.map((region) => projectLocation(region.coordinates));
export const REGION_PIECES = REGIONS.map((region, index) => {
  let cell: Pair[] = [[-20, -20], [20, -20], [20, 20], [-20, 20]];
  seeds.forEach((seed, other) => { if (other !== index) cell = clipCell(cell, seeds[index], seed); });
  // Canonicalize shared intersection vertices so adjacent pieces share the
  // exact same seam, rather than diverging by floating-point epsilon.
  const polygons = polygonClipping.intersection(FLORIDA_LAND, [cell]).map((polygon) => polygon.map((ring) => ring.map(snap)));
  const placement = interiorPlacement(polygons);
  const [x, z] = placement.center;
  const length = Math.hypot(x - 0.7, z) || 1;
  return { id: region.id, polygons, ...placement, breakout: [(x - 0.7) / length * 0.8, 1.7, z / length * 0.8] as const };
});
export type RegionPiece = typeof REGION_PIECES[number];

export function regionMapPath(piece: RegionPiece) {
  return piece.polygons.flatMap((polygon) => polygon.map((ring) => ring.map(([x, z], i) => `${i ? "L" : "M"}${(x + 6) * 40},${(z + 5) * 40}`).join(" ") + "Z")).join(" ");
}

export const smoothStep = (t: number) => { const p = Math.max(0, Math.min(1, t)); return p * p * (3 - 2 * p); };
export function pieceTransform(piece: RegionPiece, progress: number) {
  // Lift before expanding so adjoining pieces never shear through each other.
  const lift = smoothStep(progress / 0.58), expand = smoothStep((progress - 0.32) / 0.68);
  return { position: [piece.center[0] + piece.breakout[0] * lift, piece.breakout[1] * lift, piece.center[1] + piece.breakout[2] * lift] as const, scale: 1 + expand * 0.65 };
}
