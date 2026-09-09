import { describe, expect, it } from "vitest";
import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Pair } from "polygon-clipping";
import { Box3, Mesh, PerspectiveCamera, Vector3 } from "three";
import { REGIONS } from "./data";
import { FLORIDA_LAND, LAND_HEIGHT, REGION_PIECES, containsLand, pieceTransform, regionMapPath } from "./regional-geography";
import { buildFloridaMap, mapCameraPose, setPieceProgress } from "./regional-map";

const ringArea = (ring: Pair[]) => Math.abs(ring.reduce((sum, a, index) => { const b = ring[(index + 1) % ring.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
const area = (polygons: MultiPolygon) => polygons.reduce((sum, [outer, ...holes]) => sum + ringArea(outer) - holes.reduce((total, hole) => total + ringArea(hole), 0), 0);

describe("a whole Florida made of regional land pieces", () => {
  it("preserves the entire coastline with eight non-overlapping pieces", () => {
    expect(REGION_PIECES.map((p) => p.id)).toEqual(REGIONS.map((r) => r.id));
    const total = REGION_PIECES.reduce((sum, piece) => sum + area(piece.polygons), 0);
    expect(total).toBeCloseTo(area(FLORIDA_LAND), 8);
    for (let i = 0; i < REGION_PIECES.length; i++) for (let j = i + 1; j < REGION_PIECES.length; j++) {
      expect(area(polygonClipping.intersection(REGION_PIECES[i].polygons, REGION_PIECES[j].polygons))).toBeLessThan(1e-8);
    }
    expect(area(polygonClipping.xor(FLORIDA_LAND, polygonClipping.union(...REGION_PIECES.map((p) => p.polygons))))).toBeLessThan(1e-8);
  });

  it.each(REGION_PIECES.map((p) => [p.id, p] as const))("keeps %s attached to Florida until selected", (_id, piece) => {
    expect(containsLand(piece.center, piece.polygons)).toBe(true);
    expect(piece.radius).toBeGreaterThan(0.2);
    expect(regionMapPath(piece)).toMatch(/^M.*Z$/);
    expect(pieceTransform(piece, 0)).toEqual({ position: [piece.center[0], 0, piece.center[1]], scale: 1 });
    expect(pieceTransform(piece, 1).position[1]).toBeGreaterThan(LAND_HEIGHT);
    expect(pieceTransform(piece, 1).scale).toBeGreaterThan(1);
    expect(pieceTransform(piece, 0.25).scale).toBe(1);
    for (const phase of [0, 0.1, 0.5, 0.9, 1, 0.5, 0]) {
      const pose = pieceTransform(piece, phase);
      expect([...pose.position, pose.scale].every(Number.isFinite)).toBe(true);
    }
  });

  it("grounds every bespoke miniature on its region and keeps valid hit targets", () => {
    const pieces = buildFloridaMap();
    for (const map of pieces) {
      expect(map.world.root.parent).toBe(map.root);
      expect(map.world.root.position.y).toBe(LAND_HEIGHT);
      expect([...map.world.assets.keys()].sort()).toEqual(REGIONS.find((r) => r.id === map.piece.id)!.assets.map((a) => a.id).sort());
      map.root.traverse((object) => { if (object instanceof Mesh) expect(object.userData.regionId).toBe(map.piece.id); });
      setPieceProgress(map, 1);
      expect(map.root.visible).toBe(true);
      setPieceProgress(map, 0);
      expect(map.root.position.toArray()).toEqual([map.piece.center[0], 0, map.piece.center[1]]);
      expect(map.root.scale.toArray()).toEqual([1, 1, 1]);
      map.world.dispose();
    }
  });
});

describe("state overview → region breakout → strengths close-up", () => {
  it.each([0.42, 0.64, 0.9, 1.4, 2])("frames the whole state and focused strengths at aspect %s", (aspect) => {
    const pieces = buildFloridaMap();
    const camera = new PerspectiveCamera(40, aspect, 0.1, 120);
    const check = (point: Vector3, label: string) => {
      const projected = point.clone().project(camera);
      expect(Math.abs(projected.x), label + " horizontal").toBeLessThan(0.98);
      expect(Math.abs(projected.y), label + " vertical").toBeLessThan(0.83);
    };
    for (const regionId of [null, ...REGIONS.map((r) => r.id)]) for (const close of [false, true]) {
      for (const map of pieces) setPieceProgress(map, map.piece.id === regionId ? 1 : 0);
      const pose = mapCameraPose(pieces, regionId, aspect, close);
      camera.position.copy(pose.position);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld(true);
      for (const map of pieces.filter((map) => !regionId || map.piece.id === regionId)) {
        map.root.updateMatrixWorld(true);
        if (!close || !regionId) for (const [x, z] of map.piece.polygons.flat(2)) {
          check(new Vector3(x - map.piece.center[0], LAND_HEIGHT, z - map.piece.center[1]).applyMatrix4(map.root.matrixWorld), map.piece.id + " coastline");
        }
        for (const time of [0, 8, 40]) {
          map.world.animated.forEach((update) => update(time));
          map.root.updateMatrixWorld(true);
          const bounds = new Box3().setFromObject(map.world.root, true);
          for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) check(new Vector3(x, y, z), map.piece.id + " miniature");
        }
      }
    }
    for (const map of pieces) map.world.dispose();
  });
});
