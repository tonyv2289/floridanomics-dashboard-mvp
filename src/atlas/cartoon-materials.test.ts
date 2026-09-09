import { describe, expect, it } from "vitest";
import { BackSide, Mesh, MeshToonMaterial, NearestFilter } from "three";
import { createCartoonPalette } from "./cartoon-materials";
import { REGIONS } from "./data";
import { buildRegionalWorld } from "./regional-worlds";

describe("cartoon atlas treatment", () => {
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

  it.each(REGIONS.map((r) => [r.id, r] as const))("gives %s rounded forms and outlines that keep the original profile mapping", (_id, region) => {
    const world = buildRegionalWorld(region);
    let rounded = 0, outlines = 0, triangles = 0;
    world.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      if (object.geometry.type === "RoundedBoxGeometry") rounded++;
      if (object.userData.decoration) {
        outlines++;
        expect(object.material.side).toBe(BackSide);
        expect(object.parent).toBeInstanceOf(Mesh);
        expect(object.geometry).toBe((object.parent as Mesh).geometry);
        expect(object.userData.assetId).toBe(object.parent!.userData.assetId);
        expect(object.castShadow).toBe(false);
      } else expect(object.material).toBeInstanceOf(MeshToonMaterial);
    });
    expect(rounded).toBeGreaterThan(3);
    expect(outlines).toBeGreaterThan(5);
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
