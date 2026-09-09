import * as T from "three";

export const REGIONAL_SEAM = 0xb4bf9b;

// Four discrete lighting bands keep the voxel faces readable at state scale.
// This four-pixel data ramp is a shader lookup, not a raster illustration.
export function createCartoonPalette() {
  const ramp = new T.DataTexture(new Uint8Array([80, 155, 215, 255]), 4, 1, T.RedFormat);
  ramp.minFilter = T.NearestFilter;
  ramp.magFilter = T.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  const colors = new Map<number, T.MeshToonMaterial>();
  const material = (color: number) => {
    if (!colors.has(color)) {
      const shade = new T.Color(color);
      const hsl = shade.getHSL({ h: 0, s: 0, l: 0 }, T.SRGBColorSpace);
      // Saturated scene accents, quiet structural neutrals, no pastel wash.
      if (hsl.l > 0.18 && hsl.l < 0.8) shade.setHSL(hsl.h, Math.min(0.95, hsl.s * 1.16), hsl.l, T.SRGBColorSpace);
      colors.set(color, new T.MeshToonMaterial({ color: shade, gradientMap: ramp }));
    }
    return colors.get(color)!;
  };
  return { material, dispose: () => { colors.forEach((color) => color.dispose()); ramp.dispose(); } };
}
