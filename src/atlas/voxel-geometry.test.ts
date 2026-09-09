import { describe, expect, it } from "vitest";
import { CatmullRomCurve3, Vector3 } from "three";
import { voxelColumn, voxelGeometry, voxelOrb, voxelPath } from "./voxel-geometry";

describe("original voxel miniature geometry", () => {
  it("culls internal faces, deduplicates cells and emits outward flat normals", () => {
    const geometry = voxelGeometry([[0, 0, 0], [1, 0, 0], [0, 0, 0]], [1, 1, 1]);
    expect(geometry.userData.cellCount).toBe(2);
    expect(geometry.index!.count).toBe(10 * 6);
    const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
    for (let i = 0; i < geometry.index!.count; i += 3) {
      const a = geometry.index!.getX(i), b = geometry.index!.getX(i + 1), c = geometry.index!.getX(i + 2);
      const pa = new Vector3().fromBufferAttribute(positions, a);
      const cross = new Vector3().fromBufferAttribute(positions, b).sub(pa).cross(new Vector3().fromBufferAttribute(positions, c).sub(pa)).normalize();
      expect(cross.dot(new Vector3().fromBufferAttribute(normals, a))).toBeCloseTo(1);
    }
    geometry.dispose();
  });

  it.each([.02, .14, .46])("keeps a stepped orb within its declared radius %s", (radius) => {
    const orb = voxelOrb(radius);
    orb.computeBoundingBox();
    expect(orb.boundingBox!.getCenter(new Vector3()).length()).toBeCloseTo(0);
    for (const value of [...orb.boundingBox!.min.toArray(), ...orb.boundingBox!.max.toArray()]) expect(Math.abs(value)).toBeLessThanOrEqual(radius + 1e-7);
    expect(orb.userData.cellCount).toBeGreaterThan(20);
    expect(orb.index!.count).toBeLessThan(orb.userData.cellCount * 36);
    orb.dispose();
  });

  it("keeps dome bottoms grounded and rocket towers centered", () => {
    const dome = voxelOrb(.46, true), tower = voxelColumn(0, 1.5, .15);
    dome.computeBoundingBox(); tower.computeBoundingBox();
    expect(dome.boundingBox!.min.y).toBeCloseTo(0);
    expect(tower.boundingBox!.min.y).toBeCloseTo(-.75);
    expect(tower.boundingBox!.max.y).toBeCloseTo(.75);
    dome.dispose(); tower.dispose();
  });

  it("samples curved foliage and DNA into one finite, bounded surface mesh", () => {
    const path = voxelPath(new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(.2, .4, .1), new Vector3(.5, .6, 0)]), .03);
    expect(path.getAttribute("position").array.every(Number.isFinite)).toBe(true);
    expect(path.getAttribute("normal").array.every(Number.isFinite)).toBe(true);
    expect(path.userData.cellCount).toBeLessThan(100);
    expect(path.index!.count).toBeGreaterThan(0);
    path.dispose();
  });
});
