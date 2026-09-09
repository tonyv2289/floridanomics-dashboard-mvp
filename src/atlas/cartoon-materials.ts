import * as T from "three";

export const CARTOON_INK = 0x163446;

// Four discrete lighting bands give the miniatures a cel-painted appearance.
// This four-pixel data ramp is a shader lookup, not a raster illustration.
export function createCartoonPalette() {
  const ramp = new T.DataTexture(new Uint8Array([80, 155, 215, 255]), 4, 1, T.RedFormat);
  ramp.minFilter = T.NearestFilter;
  ramp.magFilter = T.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  const colors = new Map<number, T.MeshToonMaterial>();
  const ink = new T.MeshBasicMaterial({ color: CARTOON_INK, side: T.BackSide });
  const material = (color: number) => {
    if (!colors.has(color)) {
      const shade = new T.Color(color);
      const hsl = shade.getHSL({ h: 0, s: 0, l: 0 }, T.SRGBColorSpace);
      // Retain navy details and whites; give midtones a sunnier painted finish.
      if (hsl.l > 0.18 && hsl.l < 0.8) shade.setHSL(hsl.h, Math.min(0.85, hsl.s * 1.3), Math.min(0.78, hsl.l + 0.055), T.SRGBColorSpace);
      colors.set(color, new T.MeshToonMaterial({ color: shade, gradientMap: ramp }));
    }
    return colors.get(color)!;
  };
  return { material, ink, dispose: () => { colors.forEach((color) => color.dispose()); ink.dispose(); ramp.dispose(); } };
}

// Inverted hulls follow the actual 3D forms and animate with their owner. They
// deliberately ignore tiny wires/windows to avoid noisy outlines at state scale.
export function addCartoonOutline(object: T.Mesh, ink: T.MeshBasicMaterial) {
  object.geometry.computeBoundingBox();
  const size = object.geometry.boundingBox!.getSize(new T.Vector3());
  if (Math.min(size.x, size.y, size.z) < 0.055 || Math.max(size.x, size.y, size.z) < 0.22) return;
  const outline = new T.Mesh(object.geometry, ink);
  outline.name = "cartoon-outline";
  outline.userData.decoration = true;
  outline.scale.set(1 + 0.018 / size.x, 1 + 0.018 / size.y, 1 + 0.018 / size.z);
  // Geometry is shared with the original mesh and disposed by its owner once.
  object.add(outline);
}
