import * as T from "three";
import { REGIONS } from "./data";
import { REGIONAL_IDENTITIES } from "./regional-identity";
import { LAND_HEIGHT, REGION_PIECES, pieceTransform } from "./regional-geography";
import type { RegionPiece } from "./regional-geography";
import { buildRegionalWorld } from "./regional-worlds";

export function buildRegionPiece(piece: RegionPiece) {
  const region = REGIONS.find((r) => r.id === piece.id)!;
  const identity = REGIONAL_IDENTITIES[piece.id];
  const root = new T.Group();
  root.name = `land-${piece.id}`;
  root.position.set(piece.center[0], 0, piece.center[1]);
  const color = new T.Color(identity.ground).lerp(new T.Color(identity.accent), 0.22);
  const landMaterial = new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.08 });
  const sideMaterial = new T.MeshStandardMaterial({ color: new T.Color(identity.ground).multiplyScalar(0.55), roughness: 0.82 });
  const borderMaterial = new T.LineBasicMaterial({ color: 0xe8dbc0, transparent: true, opacity: 0.82 });
  for (const polygon of piece.polygons) {
    const shape = new T.Shape();
    polygon.forEach((ring, ringIndex) => {
      const path = ringIndex ? new T.Path() : shape;
      ring.forEach(([x, z], index) => {
        const localX = x - piece.center[0], localZ = -(z - piece.center[1]);
        if (index) path.lineTo(localX, localZ); else path.moveTo(localX, localZ);
      });
      path.closePath();
      if (ringIndex) shape.holes.push(path);
      const points = ring.map(([x, z]) => new T.Vector3(x - piece.center[0], LAND_HEIGHT + 0.012, z - piece.center[1]));
      root.add(new T.Line(new T.BufferGeometry().setFromPoints(points), borderMaterial));
    });
    const geometry = new T.ExtrudeGeometry(shape, { depth: LAND_HEIGHT, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    const land = new T.Mesh(geometry, [landMaterial, sideMaterial]);
    land.userData = { regionId: piece.id, assetId: null };
    land.castShadow = true;
    land.receiveShadow = true;
    root.add(land);
  }
  const world = buildRegionalWorld(region);
  // Ground each miniature on its region. A minimum legible scale lets coastal
  // infrastructure overhang the shoreline, as an explicitly illustrative model.
  const modelScale = Math.max(0.28, Math.min(0.62, piece.radius / 1.65));
  world.root.scale.setScalar(modelScale);
  world.root.position.y = LAND_HEIGHT;
  world.animated.forEach((update) => update(0));
  const modelBounds = new T.Box3().setFromObject(world.root, true).expandByScalar(0.16);
  root.add(world.root);
  return { root, world, piece, landMaterial, borderMaterial, color, modelScale, modelBounds, progress: 0 };
}
export type MapPiece = ReturnType<typeof buildRegionPiece>;

export function setPieceProgress(map: MapPiece, progress: number) {
  map.progress = progress;
  const transform = pieceTransform(map.piece, progress);
  map.root.position.set(...transform.position);
  map.root.scale.setScalar(transform.scale);
}

export function mapCameraPose(pieces: MapPiece[], regionId: string | null, aspect: number, close = true) {
  const selected = pieces.find((piece) => piece.piece.id === regionId);
  const points: T.Vector3[] = [];
  for (const map of selected ? [selected] : pieces) {
    const { piece } = map;
    const transform = pieceTransform(piece, selected ? 1 : 0);
    if (!selected || !close) {
      for (const [x, z] of piece.polygons.flat(2)) {
        points.push(new T.Vector3((x - piece.center[0]) * transform.scale + transform.position[0], transform.position[1], (z - piece.center[1]) * transform.scale + transform.position[2]));
      }
    }
    const bounds = map.modelBounds;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      points.push(new T.Vector3(x, y, z).multiplyScalar(transform.scale).add(new T.Vector3(...transform.position)));
    }
  }
  const box = new T.Box3().setFromPoints(points);
  const target = box.getCenter(new T.Vector3());
  const back = new T.Vector3(selected ? 0.28 : 0.06, 1, selected ? 0.7 : 0.48).normalize();
  const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), back).normalize();
  const up = new T.Vector3().crossVectors(back, right).normalize();
  const tan = Math.tan(T.MathUtils.degToRad(20));
  let distance = selected && close ? 2.8 : 3.7;
  for (const point of points) {
    const offset = point.clone().sub(target);
    const near = offset.dot(back);
    distance = Math.max(distance, near + Math.abs(offset.dot(right)) / (tan * Math.max(aspect, 0.2) * 0.88), near + Math.abs(offset.dot(up)) / (tan * 0.73));
  }
  return { position: target.clone().addScaledVector(back, distance), target };
}

export function buildFloridaMap() { return REGION_PIECES.map(buildRegionPiece); }
