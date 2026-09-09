import * as T from "three";
import type { Region } from "./data";
import { createCartoonPalette } from "./cartoon-materials";
import { voxelColumn, voxelOrb, voxelPath } from "./voxel-geometry";

type V3 = readonly [number, number, number];
export type RegionalWorld = { root: T.Group; animated: Array<(time: number) => void>; assets: Map<string, T.Group>; dispose: () => void };
const IVORY = 0xf3f4e9;
const INK = 0x1e252c;
const COPPER = 0xffb322;
const GLASS = 0x43cbd4;

// Original, procedural 3D maquettes. These are regional visual metaphors, not
// surveyed buildings. No downloaded logos, image textures or private data.
export function buildRegionalWorld(region: Region): RegionalWorld {
  const root = new T.Group();
  root.name = `world-${region.id}`;
  const assets = new Map<string, T.Group>();
  const animated: Array<(time: number) => void> = [];
  const palette = createCartoonPalette();
  const geometries = new Set<T.BufferGeometry>();
  const extras = new Set<T.Material>();
  const material = (color: number, _metal = 0.12) => { void _metal; return palette.material(color); };
  const mesh = (parent: T.Group, geometry: T.BufferGeometry, color: number, pos: V3 = [0, 0, 0], metal = 0.12) => {
    geometries.add(geometry);
    const object = new T.Mesh(geometry, material(color, metal));
    object.position.set(...pos);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (p: T.Group, size: V3, pos: V3, color = IVORY, metal = 0.12) => mesh(p, new T.BoxGeometry(...size), color, pos, metal);
  const cyl = (p: T.Group, r: number, h: number, pos: V3, color = IVORY, r2 = r, sides = 24) => {
    const geometry = Math.max(r, r2) < .06 ? new T.CylinderGeometry(r, r2, h, 4) : voxelColumn(r, h, r2);
    void sides; // Existing landmark proportions survive the change in art direction.
    return mesh(p, geometry, color, pos);
  };
  const orb = (p: T.Group, r: number, pos: V3, color = IVORY) => mesh(p, voxelOrb(r), color, pos);
  const tube = (p: T.Group, points: V3[], radius: number, color: number, closed = false) => {
    const curve = new T.CatmullRomCurve3(points.map((point) => new T.Vector3(...point)), closed);
    return mesh(p, voxelPath(curve, radius), color);
  };
  const beam = (p: T.Group, start: V3, end: V3, radius: number, color: number) => {
    const a = new T.Vector3(...start), b = new T.Vector3(...end);
    const object = cyl(p, radius, a.distanceTo(b), [0, 0, 0], color, radius, 6);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  };
  const torus = (p: T.Group, radius: number, thickness: number, pos: V3, color: number) => mesh(p, new T.TorusGeometry(radius, thickness, 4, 16), color, pos, 0.5);
  const asset = (id: string, pos: V3 = [0, 0, 0]) => {
    const group = new T.Group();
    group.name = id;
    group.userData.assetId = id;
    group.position.set(...pos);
    assets.set(id, group);
    root.add(group);
    return group;
  };
  const tree = (p: T.Group, x: number, z: number, scale = 1, palm = false) => {
    const g = new T.Group(); g.position.set(x, 0.08, z); g.scale.setScalar(scale); p.add(g);
    if (palm) {
      tube(g, [[0, 0, 0], [0.025, 0.33, 0], [0.12, 0.62, 0]], 0.029, 0x937254);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        tube(g, [[0.12, 0.62, 0], [0.12 + Math.cos(a) * 0.16, 0.72, Math.sin(a) * 0.16], [0.12 + Math.cos(a) * 0.34, 0.52, Math.sin(a) * 0.34]], 0.036, 0x48775b);
      }
    } else {
      cyl(g, 0.03, 0.25, [0, 0.125, 0], 0x7b6651, 0.045, 7);
      orb(g, 0.19, [0, 0.36, 0], 0x69ad53);
      orb(g, 0.13, [-0.09, 0.29, 0.06], 0x367d45);
    }
  };
  const windows = (p: T.Group, w: number, h: number, d: number, x: number, z: number, floors = 4) => {
    box(p, [w, h, d], [x, 0.13 + h / 2, z]);
    for (let i = 0; i < floors; i++) box(p, [w + 0.015, 0.035, d + 0.015], [x, 0.2 + i * ((h - 0.13) / floors), z], GLASS, 0.4);
  };
  const ship = (parent: T.Group, position: V3, length = 0.9) => {
    const g = new T.Group(); g.position.set(...position); parent.add(g);
    const hull = new T.Shape(); hull.moveTo(-0.15, -length / 2); hull.lineTo(0.15, -length / 2); hull.lineTo(0.15, length * 0.3); hull.lineTo(0, length / 2); hull.lineTo(-0.15, length * 0.3); hull.closePath();
    const geo = new T.ExtrudeGeometry(hull, { depth: 0.1, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    mesh(g, geo, INK);
    box(g, [0.21, 0.15, 0.16], [0, 0.17, -length * 0.3]);
    for (let i = 0; i < 3; i++) box(g, [0.23, 0.09, 0.13], [0, 0.15, i * 0.15 - 0.1], i % 2 ? 0x65a7b8 : COPPER);
    return g;
  };
  const crane = (p: T.Group, x: number, z: number, scale = 1) => {
    const g = new T.Group(); g.position.set(x, 0.08, z); g.scale.setScalar(scale); p.add(g);
    for (const side of [-1, 1]) {
      beam(g, [side * 0.18, 0, -0.1], [side * 0.13, 0.83, 0], 0.035, COPPER);
      beam(g, [side * 0.18, 0, 0.2], [side * 0.13, 0.83, 0], 0.035, COPPER);
    }
    box(g, [0.38, 0.045, 1.07], [0, 0.83, -0.28], COPPER);
    beam(g, [0, 1.05, 0.1], [0, 0.85, -0.78], 0.013, IVORY);
    beam(g, [0, 0.85, -0.61], [0, 0.42, -0.61], 0.011, IVORY);
    box(g, [0.22, 0.08, 0.14], [0, 0.4, -0.61], INK);
  };


  if (region.id === "space-coast") {
    const launch = asset("kennedy", [-0.53, 0.13, -0.13]);
    cyl(launch, 0.53, 0.08, [0, 0.06, 0], INK, 0.53, 32);
    const launchRing = torus(launch, 0.45, 0.026, [0, 0.11, 0], COPPER); launchRing.rotation.x = Math.PI / 2;
    const rocket = new T.Group(); launch.add(rocket);
    rocket.scale.set(1.14, 1, 1.14);
    cyl(rocket, 0.14, 1.05, [0, 0.79, 0], IVORY, 0.14, 32);
    cyl(rocket, 0, 0.29, [0, 1.46, 0], IVORY, 0.14, 32);
    cyl(rocket, 0.145, 0.13, [0, 0.76, 0], INK, 0.145, 32);
    cyl(rocket, 0.145, 0.07, [0, 1.16, 0], COPPER, 0.145, 32);
    orb(rocket, 0.068, [0, 1.025, 0.126], GLASS);
    torus(rocket, 0.075, 0.017, [0, 1.025, 0.161], INK);
    for (const side of [-1, 1]) {
      cyl(rocket, 0.067, 0.76, [side * 0.19, 0.61, 0], IVORY, 0.067, 16);
      cyl(rocket, 0, 0.15, [side * 0.19, 1.06, 0], IVORY, 0.067, 16);
      const fin = box(rocket, [0.2, 0.24, 0.055], [side * 0.17, 0.3, 0], INK); fin.rotation.z = -side * 0.4;
    }
    const flame = cyl(rocket, 0.12, 0.45, [0, 0.035, 0], COPPER, 0, 12);
    const vapor = new T.Group(); vapor.name = "launch-vapor"; launch.add(vapor);
    for (const [x, z, radius] of [[-0.3, 0.17, 0.14], [0.28, 0.12, 0.17], [0.08, 0.32, 0.13]]) orb(vapor, radius, [x, 0.14, z], IVORY);
    animated.push((t) => { vapor.scale.set(1 + Math.sin(t * 0.7) * 0.06, 0.65 + Math.sin(t * 0.7) * 0.035, 1 + Math.sin(t * 0.7) * 0.06); });
    const gantry = new T.Group(); gantry.position.set(-0.43, 0, -0.12); launch.add(gantry);
    for (const x of [-0.1, 0.1]) for (const z of [-0.1, 0.1]) box(gantry, [0.04, 1.55, 0.04], [x, 0.8, z], 0x95a4a6);
    for (let i = 0; i < 6; i++) {
      box(gantry, [0.25, 0.035, 0.25], [0, 0.12 + i * 0.25, 0], IVORY);
      beam(gantry, [-0.1, 0.12 + i * 0.25, 0.1], [0.1, 0.34 + i * 0.25, 0.1], 0.018, COPPER);
    }
    box(gantry, [0.5, 0.065, 0.08], [0.17, 1.18, 0], COPPER);
    box(launch, [0.65, 0.26, 0.34], [-0.2, 0.16, 0.65], IVORY);
    for (let i = 0; i < 3; i++) box(launch, [0.035, 0.23, 0.35], [-0.37 + i * 0.16, 0.17, 0.65], GLASS);
    const orbital = new T.Group(); orbital.position.set(0, 1.77, 0); launch.add(orbital);
    const orbit = torus(orbital, 0.66, 0.009, [0, 0, 0], GLASS); orbit.rotation.x = 1.17;
    const satellite = new T.Group(); orbital.add(satellite);
    box(satellite, [0.14, 0.13, 0.12], [0, 0, 0], COPPER);
    for (const side of [-1, 1]) { box(satellite, [0.29, 0.015, 0.17], [side * 0.24, 0, 0], 0x377a9e, 0.5); for (let i = 0; i < 3; i++) box(satellite, [0.012, 0.017, 0.175], [side * 0.24 - 0.085 + i * 0.085, 0, 0], IVORY); }
    animated.push((t) => { const phase = t * 0.25; satellite.position.set(Math.cos(phase) * 0.66, Math.sin(phase) * 0.26, Math.sin(phase) * 0.6); satellite.rotation.y = -phase; rocket.position.y = 0.05 + Math.sin(t * 0.45) * 0.025; flame.scale.y = 0.8 + Math.sin(t * 6) * 0.15; });
    const harbor = asset("canaveral", [0.75, 0.1, 0.15]);
    box(harbor, [0.3, 0.13, 0.94], [-0.3, 0, 0], 0x809497);
    crane(harbor, -0.27, 0.2, 0.55);
    const vessel = ship(harbor, [0.23, 0.02, -0.06]);
    animated.push((t) => { vessel.position.z = -0.06 + Math.sin(t * 0.3) * 0.2; });
    for (let i = 0; i < 4; i++) tree(root, -1.25 + i * 0.15, -0.66, 0.45);
  } else if (region.id === "orlando-osceola") {
    const neo = asset("neocity", [-0.52, 0.13, 0.02]);
    const wafer = cyl(neo, 0.68, 0.065, [0, 0.14, 0], 0x263f5e, 0.68, 64);
    wafer.material = material(0x315474, 0.75);
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z < 11) box(neo, [0.14, 0.009, 0.14], [x * 0.17, 0.181, z * 0.17], (x + z) % 2 ? 0x619aad : 0xb1c8cf, 0.7);
    const silicon = asset("skywater", [-0.52, 0.5, 0.02]);
    box(silicon, [0.47, 0.09, 0.47], [0, 0, 0], INK, 0.6);
    box(silicon, [0.31, 0.035, 0.31], [0, 0.062, 0], COPPER, 0.6);
    for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
      box(silicon, [0.11, 0.025, 0.023], [side * 0.29, 0, -0.18 + i * 0.072], IVORY);
      box(silicon, [0.023, 0.025, 0.11], [-0.18 + i * 0.072, 0, side * 0.29], IVORY);
    }
    for (let i = 0; i < 5; i++) tube(root, [[-0.55, 0.11, 0.67], [-0.55, 0.11, 0.78 + i * 0.05], [0.7 + i * 0.09, 0.11, 0.78 + i * 0.05]], 0.012, i % 2 ? COPPER : GLASS);
    const sim = asset("ucf-ist", [0.73, 0.15, -0.33]);
    cyl(sim, 0.51, 0.12, [0, 0.05, 0], INK, 0.51, 32);
    const dome = mesh(sim, voxelOrb(0.46, true), 0x87bccb, [0, 0.12, 0], 0.6);
    const wireMat = new T.LineBasicMaterial({ color: IVORY, transparent: true, opacity: 0.48 }); extras.add(wireMat);
    const wireGeo = new T.EdgesGeometry(dome.geometry); geometries.add(wireGeo); const wire = new T.LineSegments(wireGeo, wireMat); wire.position.copy(dome.position); sim.add(wire);
    const scan = torus(sim, 0.49, 0.017, [0, 0.21, 0], COPPER); scan.rotation.x = Math.PI / 2;
    box(neo, [0.64, 0.31, 0.37], [0.35, 0.14, -0.86]);
    box(neo, [0.65, 0.07, 0.38], [0.35, 0.25, -0.86], GLASS);
    for (let i = 0; i < 3; i++) cyl(neo, 0.06, 0.1, [0.16 + i * 0.16, 0.34, -0.86], INK, 0.06, 12);
    animated.push((t) => { silicon.position.y = 0.5 + Math.sin(t * 0.6) * 0.07; silicon.rotation.y = Math.sin(t * 0.18) * 0.12; scan.position.y = 0.23 + (Math.sin(t * 0.6) + 1) * 0.12; });
  } else if (region.id === "tampa-bay") {
    const port = asset("port-tampa", [-0.55, 0.1, 0.1]);
    box(port, [1.5, 0.1, 0.43], [0, 0.02, 0.17], 0x8c8d7b);
    crane(port, -0.37, 0.12, 0.85); crane(port, 0.39, 0.12, 0.85);
    for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) box(port, [0.27, 0.12, 0.13], [-0.48 + x * 0.3, 0.13, -0.17 - z * 0.16], (x + z) % 2 ? COPPER : GLASS);
    const cargo = ship(port, [0, 0.02, 0.66], 1.1); cargo.rotation.y = Math.PI / 2;
    animated.push((t) => { cargo.position.x = Math.sin(t * 0.27) * 0.22; });
    const defense = asset("sofwerx", [0.77, 0.13, -0.35]);
    const pavilion = cyl(defense, 0.39, 0.35, [0, 0.19, 0], INK, 0.49, 6);
    pavilion.rotation.y = Math.PI / 6;
    const roof = cyl(defense, 0.47, 0.06, [0, 0.4, 0], COPPER, 0.47, 6); roof.rotation.y = Math.PI / 6;
    const radar = new T.Group(); radar.position.y = 0.49; defense.add(radar);
    cyl(radar, 0.026, 0.25, [0, 0.08, 0], IVORY);
    const dish = mesh(radar, voxelOrb(0.23, true), GLASS, [0, 0.22, 0]); dish.rotation.x = Math.PI; dish.rotation.z = 0.4;
    animated.push((t) => { radar.rotation.y = t * 0.23; });
    const research = asset("usf", [-0.6, 0.13, -0.65]);
    windows(research, 0.6, 0.42, 0.34, 0, 0, 3);
    box(research, [0.66, 0.04, 0.4], [0, 0.57, 0], 0x6e9674);
    tree(root, -1.17, -0.68, 0.7); tree(root, 0.02, -0.94, 0.58);
  } else if (region.id === "south-florida") {
    const skyline = asset("fau-park", [-0.24, 0.11, -0.35]);
    const heights = [0.58, 1.06, 1.42, 0.84];
    heights.forEach((h, i) => {
      const x = -0.73 + i * 0.42;
      windows(skyline, 0.32, h, 0.36, x, 0, Math.round(h * 6));
      box(skyline, [0.35, 0.035, 0.39], [x, h + 0.15, 0], i % 2 ? 0xf0b297 : IVORY);
      if (i === 2) { box(skyline, [0.19, 0.18, 0.23], [x, h + 0.25, 0], IVORY); cyl(skyline, 0.009, 0.23, [x, h + 0.44, 0], COPPER, 0.009, 8); }
    });
    const deco = new T.Group(); deco.position.set(-0.6, 0.1, 0.25); skyline.add(deco);
    for (let i = 0; i < 3; i++) box(deco, [0.56 - i * 0.09, 0.1, 0.32], [0, 0.1 + i * 0.1, 0], i % 2 ? 0xf1aa87 : IVORY);
    for (const x of [-1.12, -0.3, 0.52, 1.06]) tree(root, x, 0.31, 0.83, true);
    const gateway = asset("portmiami", [0.69, 0.15, 0.45]);
    const vessel = ship(gateway, [0.2, 0, 0.24], 0.84); vessel.rotation.y = Math.PI / 2;
    crane(gateway, 0.12, -0.33, 0.48);
    const globe = torus(gateway, 0.34, 0.017, [0.12, 1.22, -0.25], COPPER);
    const meridian = torus(gateway, 0.34, 0.015, [0.12, 1.22, -0.25], GLASS); meridian.rotation.y = Math.PI / 2;
    const equator = torus(gateway, 0.34, 0.014, [0.12, 1.22, -0.25], IVORY); equator.rotation.x = Math.PI / 2;
    animated.push((t) => { globe.rotation.y = t * 0.14; meridian.rotation.y = Math.PI / 2 + t * 0.14; vessel.position.x = 0.2 + Math.sin(t * 0.22) * 0.25; });
  } else if (region.id === "northeast") {
    const freight = asset("jaxport");
    const bridge = new T.Group(); bridge.position.set(0, 0.14, -0.2); freight.add(bridge);
    box(bridge, [2.5, 0.085, 0.35], [0, 0.54, 0], 0x7d9da7);
    for (const x of [-0.61, 0.61]) {
      for (const z of [-0.15, 0.15]) beam(bridge, [x, 0, z], [x, 1.3, z * 0.2], 0.042, IVORY);
      box(bridge, [0.1, 0.07, 0.39], [x, 0.57, 0], COPPER);
      for (let i = 1; i < 5; i++) for (const direction of [-1, 1]) for (const z of [-0.15, 0.15]) beam(bridge, [x, 1.22, z * 0.2], [x + direction * i * 0.12, 0.6, z], 0.009, 0xc1d9df);
    }
    for (let i = 0; i < 8; i++) box(bridge, [0.11, 0.01, 0.02], [-1.05 + i * 0.3, 0.59, 0], IVORY);
    const yard = new T.Group(); yard.position.set(0.87, 0.13, 0.54); freight.add(yard);
    box(yard, [0.61, 0.03, 0.7], [0, 0, 0], INK);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const car = box(yard, [0.1, 0.045, 0.13], [-0.21 + i * 0.2, 0.05, -0.25 + j * 0.17], (i + j) % 3 ? IVORY : COPPER); box(yard, [0.07, 0.026, 0.07], [car.position.x, 0.083, car.position.z], GLASS); }
    for (const x of [-1.07, -0.94]) box(freight, [0.015, 0.02, 1.6], [x, 0.15, 0], 0xa4b8bb);
    const train = new T.Group(); freight.add(train);
    for (let i = 0; i < 3; i++) box(train, [0.15, 0.1, 0.24], [-1, 0.22, -0.55 + i * 0.3], i === 0 ? COPPER : 0x6ca5bb);
    const vessel = ship(freight, [-0.07, 0.12, 0.62], 0.65);
    animated.push((t) => { train.position.z = Math.sin(t * 0.27) * 0.17; vessel.position.z = 0.62 + Math.sin(t * 0.31) * 0.12; });
    windows(freight, 0.48, 0.28, 0.47, 0.89, -0.6, 2);
    tree(freight, 0.28, -0.92, 0.55); tree(freight, 0.77, -0.99, 0.55);
  } else if (region.id === "north-central") {
    const uf = asset("uf-innovate", [-0.58, 0.12, 0.14]);
    box(uf, [0.84, 0.32, 0.53], [0, 0.2, 0], 0x9e7157);
    box(uf, [0.93, 0.075, 0.61], [0, 0.4, 0], IVORY);
    for (const x of [-0.3, -0.1, 0.1, 0.3]) box(uf, [0.075, 0.2, 0.015], [x, 0.22, 0.274], GLASS);
    const helix = new T.Group(); helix.position.set(-0.17, 0.47, 0.06); uf.add(helix);
    const strands: V3[][] = [[], []];
    for (let i = 0; i < 25; i++) {
      const a = i / 24 * Math.PI * 3, h = i / 24 * 1.12;
      for (const side of [0, 1]) strands[side].push([Math.cos(a + side * Math.PI) * 0.22, h, Math.sin(a + side * Math.PI) * 0.22]);
      if (i % 3 === 0) beam(helix, strands[0][i], strands[1][i], 0.012, IVORY);
    }
    tube(helix, strands[0], 0.026, COPPER); tube(helix, strands[1], 0.026, 0x8fc8b1);
    animated.push((t) => { helix.rotation.y = t * 0.18; });
    const maglab = asset("maglab", [0.72, 0.15, -0.26]);
    cyl(maglab, 0.48, 0.13, [0, 0.07, 0], INK, 0.48, 32);
    cyl(maglab, 0.27, 0.56, [0, 0.36, 0], IVORY, 0.27, 32);
    for (let i = 0; i < 6; i++) { const coil = torus(maglab, 0.3, 0.035, [0, 0.18 + i * 0.085, 0], COPPER); coil.rotation.x = Math.PI / 2; }
    const field = new T.Group(); field.position.y = 0.42; maglab.add(field);
    for (let i = 0; i < 3; i++) { const loop = torus(field, 0.51, 0.011, [0, 0, 0], 0x8fc8b1); loop.rotation.y = i * Math.PI / 3; }
    animated.push((t) => { field.rotation.y = -t * 0.12; });
    for (const [x, z] of [[-1.13, -0.59], [-0.67, -0.84], [-0.17, -0.8], [1.12, 0.61], [0.62, 0.91], [-0.51, 0.86]]) tree(root, x, z, 0.75);
    box(root, [1.2, 0.025, 0.18], [0, 0.13, 0.58], 0xb3a58b);
  } else if (region.id === "panhandle") {
    const robotics = asset("ihmc");
    cyl(robotics, 0.61, 0.08, [-0.42, 0.15, 0.04], INK, 0.61, 32);
    const robot = new T.Group(); robot.position.set(-0.42, 0.23, 0.04); robotics.add(robot);
    const legs: T.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(side * 0.13, 0.6, 0); robot.add(leg); legs.push(leg);
      beam(leg, [0, 0, 0], [0, -0.28, 0.035], 0.057, IVORY); orb(leg, 0.065, [0, -0.29, 0.035], 0x527785);
      beam(leg, [0, -0.3, 0.035], [0, -0.56, 0], 0.045, IVORY); box(leg, [0.15, 0.06, 0.25], [0, -0.59, 0.065], INK);
    }
    box(robot, [0.29, 0.29, 0.19], [0, 0.78, 0], IVORY);
    box(robot, [0.21, 0.14, 0.03], [0, 0.8, 0.105], GLASS);
    orb(robot, 0.16, [0, 1.065, 0], IVORY); box(robot, [0.22, 0.085, 0.045], [0, 1.075, 0.129], INK);
    const eyes = new T.Group(); eyes.name = "robot-eyes"; eyes.position.set(0, 1.084, 0.157); robot.add(eyes);
    for (const side of [-1, 1]) orb(eyes, 0.023, [side * 0.056, 0, 0], 0x71f1d7);
    cyl(robot, 0.011, 0.12, [0, 1.25, 0], INK); orb(robot, 0.035, [0, 1.32, 0], COPPER);
    animated.push((t) => { const phase = t % 5.2; eyes.scale.y = phase > 4.8 && phase < 4.96 ? 0.16 : 1; });
    for (const side of [-1, 1]) { orb(robot, 0.07, [side * 0.23, 0.87, 0], COPPER); beam(robot, [side * 0.23, 0.85, 0], [side * 0.31, 0.58, 0.08], 0.047, IVORY); orb(robot, 0.059, [side * 0.31, 0.56, 0.08], INK); }
    const arm = new T.Group(); arm.position.set(0.83, 0.13, 0.08); robotics.add(arm);
    cyl(arm, 0.23, 0.14, [0, 0.06, 0], INK, 0.27, 16);
    beam(arm, [0, 0.14, 0], [-0.08, 0.52, 0], 0.08, COPPER); orb(arm, 0.095, [-0.08, 0.53, 0], IVORY);
    const forearm = new T.Group(); forearm.position.set(-0.08, 0.53, 0); arm.add(forearm);
    beam(forearm, [0, 0, 0], [-0.36, 0.17, 0], 0.059, COPPER); for (const z of [-0.05, 0.05]) beam(forearm, [-0.36, 0.17, z], [-0.4, 0.04, z], 0.019, IVORY);
    windows(robotics, 0.83, 0.31, 0.45, 0.51, -0.64, 2);
    for (let i = 0; i < 4; i++) tree(root, -1.08 + i * 0.4, -0.71, 0.7);
    animated.push((t) => { legs[0].rotation.x = Math.sin(t * 1.05) * 0.12; legs[1].rotation.x = -Math.sin(t * 1.05) * 0.12; forearm.rotation.z = Math.sin(t * 0.45) * 0.18; });
  } else if (region.id === "southwest") {
    const lab = asset("fgcu-water");
    for (const x of [0.3, 0.94]) for (const z of [-0.61, -0.04]) cyl(lab, 0.028, 0.44, [x, 0.34, z], IVORY, 0.028, 8);
    box(lab, [0.95, 0.055, 0.81], [0.62, 0.51, -0.33], 0xc1b99d);
    box(lab, [0.77, 0.3, 0.54], [0.62, 0.7, -0.4], IVORY);
    box(lab, [0.79, 0.12, 0.56], [0.62, 0.74, -0.4], GLASS);
    const roof = box(lab, [0.96, 0.045, 0.72], [0.62, 0.91, -0.4], 0x334f58); roof.rotation.z = -0.09;
    for (let i = 0; i < 4; i++) box(lab, [0.18, 0.01, 0.54], [0.29 + i * 0.21, 0.949 - i * 0.019, -0.4], 0x6fabb5, 0.6);
    box(lab, [0.18, 0.045, 1.47], [0.2, 0.27, 0.12], 0xb8a685);
    const islands = [[-0.84, -0.63], [-0.89, 0.13], [-0.56, 0.7], [0.86, 0.7]];
    islands.forEach(([x, z], i) => {
      cyl(lab, 0.3, 0.035, [x, 0.185, z], 0x789765, 0.37, 9);
      for (let j = 0; j < 3; j++) {
        const a = j * 2.1 + i;
        const tx = x + Math.cos(a) * 0.11, tz = z + Math.sin(a) * 0.1;
        for (const direction of [-1, 1]) beam(lab, [tx + direction * 0.13, 0.2, tz + 0.08], [tx, 0.42, tz], 0.02, 0x76694c);
        orb(lab, 0.21, [tx, 0.58, tz], j % 2 ? 0x5f9773 : 0x366f60);
      }
    });
    const skiff = new T.Group(); skiff.position.set(-0.24, 0.2, -0.3); lab.add(skiff);
    box(skiff, [0.17, 0.065, 0.44], [0, 0, 0], IVORY); box(skiff, [0.12, 0.09, 0.12], [0, 0.065, -0.03], COPPER);
    cyl(skiff, 0.009, 0.24, [0, 0.2, -0.05], INK, 0.009, 8);
    const sensors: T.Mesh[] = [];
    for (const [x, z] of [[-0.3, -0.83], [0.83, 0.19]]) {
      cyl(lab, 0.055, 0.06, [x, 0.23, z], COPPER, 0.08, 12);
      cyl(lab, 0.01, 0.15, [x, 0.31, z], IVORY, 0.01, 8);
      const ripple = torus(lab, 0.19, 0.009, [x, 0.187, z], 0x9dcbb5); ripple.rotation.x = Math.PI / 2; sensors.push(ripple);
    }
    animated.push((t) => { skiff.position.z = -0.3 + Math.sin(t * 0.32) * 0.15; skiff.rotation.y = Math.sin(t * 0.25) * 0.1; sensors.forEach((sensor, i) => sensor.scale.setScalar(0.8 + (Math.sin(t * 0.6 + i * 2) + 1) * 0.3)); });
  }

  root.traverse((object) => {
    let owner: T.Object3D | null = object;
    while (owner && !owner.userData.assetId) owner = owner.parent;
    object.userData = { ...object.userData, regionId: region.id, assetId: owner?.userData.assetId ?? null };
  });
  animated.forEach((update) => update(0));
  return { root, animated, assets, dispose: () => { geometries.forEach((g) => g.dispose()); palette.dispose(); extras.forEach((m) => m.dispose()); } };
}
