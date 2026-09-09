import { describe, expect, it } from "vitest";
import { Mesh, MeshToonMaterial, NearestFilter } from "three";
import { createCartoonPalette } from "./cartoon-materials";
import { REGIONS } from "./data";
import { buildRegionalWorld } from "./regional-worlds";

describe("voxel atlas treatment", () => {
  it("uses a crisp four-band ramp, cached painted materials, and releases the texture", () => {
    const palette = createCartoonPalette();
    const material = palette.material(0x69b7a1);
    expect(material).toBeInstanceOf(MeshToonMaterial);
    expect(material).toBe(palette.material(0x69b7a1));
    expect(material.gradientMap!.minFilter).toBe(NearestFilter);
    expect(material.gradientMap!.magFilter).toBe(NearestFilter);
    expect(material.gradientMap!.generateMipmaps).toBe(false);
    expect(Array.from(material.gradientMap!.image.data)).toEqual([80, 155, 215, 255]);
    let textureDisposals = 0;
    material.gradientMap!.addEventListener("dispose", () => { textureDisposals++; });
    palette.dispose();
    expect(textureDisposals).toBe(1);
  });

  it.each(REGIONS.map((r) => [r.id, r] as const))("gives %s crisp block forms while retaining its original profile mapping", (_id, region) => {
    const world = buildRegionalWorld(region);
    let boxes = 0, voxels = 0, triangles = 0;
    world.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      if (object.geometry.type === "BoxGeometry") boxes++;
      if (object.geometry.userData.voxel) voxels++;
      expect(object.geometry.type).not.toBe("RoundedBoxGeometry");
      expect(object.geometry.type).not.toBe("SphereGeometry");
      expect(object.material).toBeInstanceOf(MeshToonMaterial);
      expect(object.userData.regionId).toBe(region.id);
      if (object.userData.assetId) expect(world.assets.has(object.userData.assetId)).toBe(true);
    });
    expect(boxes).toBeGreaterThan(3);
    expect(voxels).toBeGreaterThan(0);
    expect(triangles).toBeLessThan(100_000);
    world.dispose();
  });

  it("adds expressive details without new anchor claims", () => {
    const launch = buildRegionalWorld(REGIONS[0]);
    const robot = buildRegionalWorld(REGIONS.find((r) => r.id === "panhandle")!);
    expect(launch.root.getObjectByName("launch-vapor")).toBeDefined();
    const eyes = robot.root.getObjectByName("robot-eyes")!;
    robot.animated.forEach((update) => update(4.88));
    expect(eyes.scale.y).toBeLessThan(1);
    robot.animated.forEach((update) => update(5.1));
    expect(eyes.scale.y).toBe(1);
    expect(robot.assets.size).toBe(1);
    launch.dispose(); robot.dispose();
  });
});
