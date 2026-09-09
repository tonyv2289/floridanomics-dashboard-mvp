import { describe, expect, it } from "vitest";
import { Box3, Mesh, Vector3 } from "three";
import { REGIONS } from "./data";
import { REGIONAL_IDENTITIES, crispPixelRatio, snapToDevicePixel } from "./regional-identity";
import { buildRegionalWorld } from "./regional-worlds";

describe("bespoke regional worlds", () => {
  it("gives all eight regions a distinct identity, material palette", () => {
    expect(Object.keys(REGIONAL_IDENTITIES).sort()).toEqual(REGIONS.map((r) => r.id).sort());
    expect(new Set(Object.values(REGIONAL_IDENTITIES).map((identity) => identity.title)).size).toBe(8);
    expect(new Set(Object.values(REGIONAL_IDENTITIES).map((identity) => identity.material)).size).toBe(8);
    expect(new Set(Object.values(REGIONAL_IDENTITIES).map((identity) => identity.accent)).size).toBe(8);
    for (const identity of Object.values(REGIONAL_IDENTITIES)) expect(identity.strengths).toHaveLength(3);
  });

  it.each(REGIONS.map((r) => [r.id, r] as const))("builds %s with real profile targets and finite animated geometry", (_id, region) => {
    const world = buildRegionalWorld(region);
    expect([...world.assets.keys()].sort()).toEqual(region.assets.map((a) => a.id).sort());
    expect(world.animated.length).toBeGreaterThan(0);
    let meshCount = 0;
    world.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      meshCount++;
      expect(object.userData.regionId).toBe(region.id);
      if (object.userData.assetId) expect(region.assets.map((a) => a.id)).toContain(object.userData.assetId);
      const positions = object.geometry.getAttribute("position");
      expect(positions.count).toBeGreaterThan(0);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    });
    expect(meshCount).toBeGreaterThan(35);
    for (const time of [0, 1, 20, 120]) {
      world.animated.forEach((update) => update(time));
      world.root.updateMatrixWorld(true);
      const box = new Box3().setFromObject(world.root);
      expect([...box.min, ...box.max].every(Number.isFinite)).toBe(true);
      expect(box.getSize(new Vector3()).length()).toBeLessThan(8);
    }
    world.dispose();
  });


});

describe("high-density display rendering", () => {
  it("preserves Retina detail and caps unusually dense displays", () => {
    expect(crispPixelRatio(2)).toBe(2);
    expect(crispPixelRatio(3)).toBe(2.5);
    expect(crispPixelRatio(NaN)).toBe(1);
  });
  it("snaps moving labels to physical pixel boundaries", () => {
    expect(snapToDevicePixel(10.23, 2)).toBe(10);
    expect(snapToDevicePixel(10.28, 2)).toBe(10.5);
    expect(snapToDevicePixel(11.4, 1)).toBe(11);
  });
});
