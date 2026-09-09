import { BufferGeometry, Float32BufferAttribute, type Curve, Vector3 } from "three";

type Cell = readonly [number, number, number];
const key = ([x, y, z]: Cell) => `${x},${y},${z}`;
const faces: Array<{ normal: Cell; corners: Cell[] }> = [
  { normal: [1, 0, 0], corners: [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]] },
  { normal: [-1, 0, 0], corners: [[-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-.5, -.5, -.5]] },
  { normal: [0, 1, 0], corners: [[-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], [-.5, .5, -.5]] },
  { normal: [0, -1, 0], corners: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]] },
  { normal: [0, 0, 1], corners: [[.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5], [-.5, -.5, .5]] },
  { normal: [0, 0, -1], corners: [[-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5], [.5, -.5, -.5]] },
];

// A single surface mesh, not a separate draw call for every cube. Neighboring
// cells share no hidden faces; axis-aligned normals keep the silhouette crisp.
export function voxelGeometry(cells: Cell[], size: Cell): BufferGeometry {
  const occupied = new Map(cells.map((cell) => [key(cell), cell]));
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  for (const cell of occupied.values()) for (const face of faces) {
    if (occupied.has(key([cell[0] + face.normal[0], cell[1] + face.normal[1], cell[2] + face.normal[2]]))) continue;
    const start = positions.length / 3;
    for (const corner of face.corners) {
      positions.push(...cell.map((value, axis) => (value + corner[axis]) * size[axis]));
      normals.push(...face.normal);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.userData.voxel = true;
  geometry.userData.cellCount = occupied.size;
  return geometry;
}

export function voxelOrb(radius: number, hemisphere = false) {
  const cells: Cell[] = [];
  const step = radius * 2 / 7;
  for (let x = -3; x <= 3; x++) for (let y = hemisphere ? 0 : -3; y <= 3; y++) for (let z = -3; z <= 3; z++) {
    if (Math.hypot(x, y, z) <= 3.4) cells.push([x, y, z]);
  }
  const geometry = voxelGeometry(cells, [step, step, step]);
  if (hemisphere) geometry.translate(0, step / 2, 0);
  return geometry;
}

export function voxelColumn(topRadius: number, height: number, bottomRadius = topRadius) {
  const radius = Math.max(topRadius, bottomRadius);
  const step = radius * 2 / 7;
  const levels = Math.max(1, Math.min(20, Math.ceil(height / step)));
  const cells: Cell[] = [];
  for (let y = 0; y < levels; y++) {
    const levelRadius = bottomRadius + (topRadius - bottomRadius) * (y + .5) / levels;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      if (Math.hypot(x * step, z * step) <= levelRadius) cells.push([x, y, z]);
    }
  }
  return voxelGeometry(cells, [step, height / levels, step]).translate(0, -height / 2 + height / levels / 2, 0);
}

export function voxelPath(curve: Curve<Vector3>, radius: number) {
  const step = Math.max(.024, radius * 1.6);
  const samples = Math.min(500, Math.max(8, Math.ceil(curve.getLength() / step * 3)));
  const cells: Cell[] = [];
  const point = new Vector3();
  for (let i = 0; i <= samples; i++) {
    curve.getPoint(i / samples, point);
    cells.push([Math.round(point.x / step), Math.round(point.y / step), Math.round(point.z / step)]);
  }
  return voxelGeometry(cells, [step, step, step]);
}
