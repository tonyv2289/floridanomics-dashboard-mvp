import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import florida from "../data/florida.geo.json";
import { REGIONS, TOUR, overviewPose, projectLocation, regionMatches } from "./data";
import type { Asset, Sector } from "./data";

type SceneState = { regionId: string | null; assetId: string | null; sector: Sector; motion: boolean };
type SceneOptions = {
  host: HTMLDivElement;
  labels: Map<string, HTMLButtonElement>;
  onAsset: (regionId: string, assetId: string) => void;
  onFailure: () => void;
};

const COLORS = { land: 0x172b3d, side: 0x0b1826, orange: 0xff8f3f, blue: 0x56c2ff, white: 0xe8eef9, steel: 0x607f95 };
const TOP = 0.34;

export function createAtlasScene({ host, labels, onAsset, onFailure }: SceneOptions) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x02060d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xc1defb, 0x061020, 2.4));
  const key = new THREE.DirectionalLight(0xffe0bf, 3.1);
  key.position.set(-5, 12, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x56c2ff, 2.4);
  rim.position.set(8, 4, -6);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 32;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI / 2.25;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.6;
  const materialCache = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.18, flatShading: true }));
    return materialCache.get(color)!;
  };
  const box = (group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, color = COLORS.white) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const cylinder = (group: THREE.Group, top: number, bottom: number, height: number, x: number, y: number, z: number, color = COLORS.white, sides = 12) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), mat(color));
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const lineMat = new THREE.LineBasicMaterial({ color: COLORS.orange, transparent: true, opacity: 0.55 });
  for (const polygon of florida.geometry.coordinates) {
    const shape = new THREE.Shape();
    polygon.forEach((ring, ringIndex) => {
      const path = ringIndex === 0 ? shape : new THREE.Path();
      ring.forEach((coordinate, index) => {
        const [x, z] = projectLocation(coordinate);
        if (index === 0) path.moveTo(x, -z); else path.lineTo(x, -z);
      });
      path.closePath();
      if (ringIndex > 0) shape.holes.push(path as THREE.Path);
      const coastPoints = ring.map((coordinate) => { const [x, z] = projectLocation(coordinate); return new THREE.Vector3(x, TOP + 0.014, z); });
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(coastPoints), lineMat));
    });
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: TOP, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    scene.add(new THREE.Mesh(geometry, [mat(COLORS.land), mat(COLORS.side)]));
  }
  const grid = new THREE.GridHelper(44, 44, 0x203245, 0x101c2b);
  grid.position.y = -0.3;
  scene.add(grid);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ color: 0x030911 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.32;
  scene.add(ocean);

  // Dotted guide joins the three editorial chapters. It is not a measured flow.
  const routePoints = TOUR.map((r) => { const [x, z] = projectLocation(r.coordinates); return new THREE.Vector3(x, TOP + 0.025, z); });
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePoints), new THREE.LineDashedMaterial({ color: COLORS.orange, dashSize: 0.085, gapSize: 0.055, opacity: 0.5, transparent: true }));
  route.computeLineDistances();
  scene.add(route);

  const animated: Array<{ update: (time: number) => void }> = [];
  const models: Array<{ group: THREE.Group; regionId: string; asset: Asset; anchor: THREE.Vector3; focus: THREE.Vector3; leader: THREE.Line }> = [];
  const rings: Array<{ mesh: THREE.Mesh; regionId: string }> = [];
  const assetMeshes: THREE.Object3D[] = [];

  function makeModel(asset: Asset): THREE.Group {
    const g = new THREE.Group();
    box(g, 0.95, 0.055, 0.85, 0, 0.026, 0, 0x314554);
    if (asset.model === "rocket") {
      cylinder(g, 0.45, 0.45, 0.035, 0, 0.075, 0, COLORS.steel, 24);
      const rocket = new THREE.Group();
      g.add(rocket);
      cylinder(rocket, 0.09, 0.11, 0.86, 0, 0.57, 0);
      cylinder(rocket, 0, 0.09, 0.25, 0, 1.125, 0, COLORS.white);
      cylinder(rocket, 0.093, 0.093, 0.1, 0, 0.76, 0, COLORS.orange);
      cylinder(rocket, 0.065, 0.13, 0.14, 0, 0.095, 0, COLORS.orange);
      for (const side of [-1, 1]) {
        const fin = box(rocket, 0.18, 0.24, 0.035, side * 0.1, 0.22, 0, COLORS.steel);
        fin.rotation.z = side * -0.32;
      }
      box(g, 0.085, 1.12, 0.085, -0.31, 0.62, -0.17, COLORS.steel);
      box(g, 0.3, 0.06, 0.07, -0.2, 0.87, -0.17, COLORS.orange);
      for (let i = 0; i < 5; i++) box(g, 0.1, 0.025, 0.12, -0.31, 0.2 + i * 0.2, -0.17, COLORS.orange);
      const flame = cylinder(rocket, 0.065, 0, 0.23, 0, -0.065, 0, COLORS.orange);
      animated.push({ update: (t) => { rocket.position.y = 0.045 + (Math.sin(t * 0.6) + 1) * 0.11; flame.scale.y = 0.85 + Math.sin(t * 7) * 0.15; } });
      const satellite = new THREE.Group();
      box(satellite, 0.1, 0.1, 0.1, 0, 0, 0);
      box(satellite, 0.21, 0.02, 0.12, -0.17, 0, 0, COLORS.blue);
      box(satellite, 0.21, 0.02, 0.12, 0.17, 0, 0, COLORS.blue);
      g.add(satellite);
      animated.push({ update: (t) => { satellite.position.set(Math.cos(t * 0.22) * 0.66, 1.48, Math.sin(t * 0.22) * 0.45); satellite.rotation.y = -t * 0.22; } });
    } else if (asset.model === "port") {
      box(g, 0.5, 0.06, 0.85, 0.18, 0.05, 0, 0x4b6372);
      for (let i = 0; i < 2; i++) {
        const x = i * 0.42 - 0.15;
        for (const z of [-0.25, 0.25]) box(g, 0.04, 0.55, 0.04, x, 0.32, z, COLORS.orange);
        box(g, 0.05, 0.045, 0.9, x, 0.6, -0.1, COLORS.orange);
        box(g, 0.035, 0.15, 0.035, x, 0.52, -0.53, COLORS.steel);
      }
      const ship = new THREE.Group();
      g.add(ship);
      box(ship, 0.32, 0.13, 0.85, -0.51, 0.11, 0, 0x23415a);
      box(ship, 0.27, 0.14, 0.13, -0.51, 0.24, 0.26);
      for (let i = 0; i < 3; i++) box(ship, 0.23, 0.1, 0.16, -0.51, 0.22, i * 0.18 - 0.3, i % 2 ? COLORS.blue : COLORS.orange);
      animated.push({ update: (t) => { ship.position.z = Math.sin(t * 0.45) * 0.045; } });
    } else if (asset.model === "chip") {
      box(g, 0.68, 0.24, 0.6, 0, 0.18, 0, COLORS.steel);
      const chip = box(g, 0.42, 0.085, 0.42, 0, 0.4, 0, 0x0b1826);
      box(g, 0.2, 0.012, 0.2, 0, 0.45, 0, COLORS.orange);
      for (let i = 0; i < 5; i++) {
        const n = i * 0.08 - 0.16;
        for (const sign of [-1, 1]) {
          box(g, 0.12, 0.025, 0.024, sign * 0.26, 0.4, n, COLORS.blue);
          box(g, 0.024, 0.025, 0.12, n, 0.4, sign * 0.26, COLORS.blue);
        }
      }
      animated.push({ update: (t) => { chip.position.y = 0.4 + Math.sin(t * 0.7) * 0.008; } });
    } else if (asset.model === "dish") {
      cylinder(g, 0.13, 0.23, 0.18, 0, 0.15, 0, COLORS.steel);
      box(g, 0.075, 0.35, 0.075, 0, 0.38, 0, COLORS.orange);
      const dish = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: COLORS.white, side: THREE.DoubleSide, flatShading: true }));
      bowl.rotation.x = Math.PI;
      dish.add(bowl);
      cylinder(dish, 0.012, 0.015, 0.35, 0, 0.06, 0, COLORS.orange);
      dish.position.y = 0.61;
      dish.rotation.z = -0.5;
      g.add(dish);
      box(g, 0.25, 0.2, 0.3, 0.31, 0.17, 0.22, COLORS.steel);
      animated.push({ update: (t) => { dish.rotation.y = Math.sin(t * 0.2) * 0.6; } });
    } else if (asset.model === "water") {
      cylinder(g, 0.23, 0.23, 0.25, -0.18, 0.18, 0, COLORS.blue, 24);
      cylinder(g, 0.19, 0.19, 0.025, -0.18, 0.32, 0, COLORS.white, 24);
      box(g, 0.25, 0.32, 0.5, 0.26, 0.2, 0, COLORS.steel);
      for (let i = 0; i < 3; i++) box(g, 0.255, 0.035, 0.48, 0.26, 0.14 + i * 0.09, 0, COLORS.blue);
    } else {
      for (let i = 0; i < 3; i++) {
        const x = i * 0.27 - 0.27;
        const h = [0.35, 0.58, 0.42][i];
        box(g, 0.22, h, 0.47, x, h / 2 + 0.05, 0, i === 1 ? COLORS.white : COLORS.steel);
        for (let j = 0; j < 3; j++) box(g, 0.225, 0.025, 0.015, x, 0.14 + j * 0.09, 0.241, COLORS.blue);
        box(g, 0.24, 0.025, 0.49, x, h + 0.055, 0, COLORS.orange);
      }
    }
    return g;
  }

  REGIONS.forEach((region) => {
    const [rx, rz] = projectLocation(region.coordinates);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.245, 48), new THREE.MeshBasicMaterial({ color: COLORS.orange, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rx, TOP + 0.015, rz);
    scene.add(ring);
    rings.push({ mesh: ring, regionId: region.id });
    region.assets.forEach((asset, i) => {
      const group = makeModel(asset);
      const [ax, az] = projectLocation(asset.coordinates);
      const anchor = new THREE.Vector3(ax, TOP + 0.03, az);
      // Deliberately spread miniatures in a focused chapter. The real geographic
      // point remains connected by a leader and is never redefined as exact.
      const focus = region.detailed ? new THREE.Vector3(rx + (i - (region.assets.length - 1) / 2) * 1.3, TOP + 0.03, rz + (i % 2 ? -0.6 : 0.35)) : anchor.clone();
      group.position.copy(anchor);
      group.scale.setScalar(0.46);
      group.traverse((object) => { object.userData = { assetId: asset.id, regionId: region.id }; if (object instanceof THREE.Mesh) assetMeshes.push(object); });
      scene.add(group);
      const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([anchor, focus]), new THREE.LineDashedMaterial({ color: COLORS.blue, transparent: true, opacity: 0.4, dashSize: 0.04, gapSize: 0.04 }));
      leader.computeLineDistances();
      leader.visible = false;
      scene.add(leader);
      models.push({ group, regionId: region.id, asset, anchor, focus, leader });
    });
  });

  let state: SceneState = { regionId: null, assetId: null, sector: "All sectors", motion: true };
  let frameId = 0;
  let disposed = false;
  let animationTime = 0;
  let lastTime = 0;
  let traveling = false;
  let travelStarted = 0;
  const fromPosition = new THREE.Vector3();
  const toPosition = new THREE.Vector3();
  const fromTarget = new THREE.Vector3();
  const toTarget = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const scaleTarget = new THREE.Vector3();
  let width = 1;
  let height = 1;
  const initialCamera = () => {
    const pose = overviewPose(width / height);
    toTarget.fromArray(pose.target);
    toPosition.fromArray(pose.position);
  };
  const frame = (now: number) => {
    frameId = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (state.motion) animationTime += dt;
    if (traveling) {
      const progress = state.motion ? Math.min((now - travelStarted) / 1150, 1) : 1;
      const ease = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(fromPosition, toPosition, ease);
      controls.target.lerpVectors(fromTarget, toTarget, ease);
      if (progress === 1) traveling = false;
    }
    for (const model of models) {
      const focused = state.regionId === model.regionId;
      model.group.position.lerp(focused ? model.focus : model.anchor, state.motion ? 0.12 : 1);
      const scale = focused ? (state.assetId === model.asset.id ? 1.16 : 1) : state.regionId ? 0.32 : 0.46;
      model.group.scale.lerp(scaleTarget.setScalar(scale), state.motion ? 0.12 : 1);
      model.group.visible = state.sector === "All sectors" || model.asset.sector === state.sector;
      model.leader.visible = focused && model.group.visible;
    }
    animated.forEach((item) => item.update(animationTime));
    rings.forEach(({ mesh, regionId }) => {
      const selected = regionId === state.regionId;
      mesh.scale.setScalar(selected ? 1.5 + Math.sin(animationTime * 1.3) * 0.1 : 1);
      mesh.visible = regionMatches(REGIONS.find((r) => r.id === regionId)!, state.sector);
    });
    controls.update();
    camera.updateMatrixWorld();
    REGIONS.forEach((region) => {
      const label = labels.get(region.id);
      if (!label) return;
      const [x, z] = projectLocation(region.coordinates);
      projected.set(x, TOP + (state.regionId === region.id ? 1.9 : 0.55), z).project(camera);
      const visible = (!state.regionId || state.regionId === region.id) && regionMatches(region, state.sector) && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.95 && Math.abs(projected.y) < 0.88;
      label.style.visibility = visible ? "visible" : "hidden";
      label.style.transform = `translate(${(projected.x * 0.5 + 0.5) * width}px, ${(-projected.y * 0.5 + 0.5) * height}px)`;
    });
    renderer.render(scene, camera);
    if (state.motion || traveling) requestFrame();
  };
  function requestFrame() { if (!frameId && !disposed && !document.hidden) frameId = requestAnimationFrame(frame); }
  function travel(reset = false) {
    const region = REGIONS.find((r) => r.id === state.regionId);
    if (!region || reset) initialCamera();
    else {
      const [x, z] = projectLocation(region.coordinates);
      toTarget.set(x, 0.6, z);
      const distance = region.id === "north-central" ? 1.65 : width / height < 0.9 ? 1.25 : 1;
      toPosition.set(x + 3.3 * distance, 5.1 * distance, z + 6.8 * distance);
    }
    fromPosition.copy(camera.position);
    fromTarget.copy(controls.target);
    travelStarted = performance.now();
    traveling = true;
    requestFrame();
  }
  const resize = () => {
    width = host.clientWidth || 1;
    height = host.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    requestFrame();
  };
  resize();
  initialCamera();
  camera.position.copy(toPosition);
  controls.target.copy(toTarget);
  controls.update();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const controlsStart = () => { traveling = false; };
  controls.addEventListener("start", controlsStart);
  controls.addEventListener("change", requestFrame);
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let down = { x: 0, y: 0 };
  const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; };
  const pointerUp = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(assetMeshes, false).find(({ object }) => {
      let ancestor: THREE.Object3D | null = object;
      while (ancestor) { if (!ancestor.visible) return false; ancestor = ancestor.parent; }
      return true;
    });
    if (hit) onAsset(hit.object.userData.regionId as string, hit.object.userData.assetId as string);
  };
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  const visibility = () => { lastTime = performance.now(); requestFrame(); };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", visibility);
  requestFrame();
  return {
    update(next: SceneState) {
      const regionChanged = state.regionId !== next.regionId;
      state = next;
      if (regionChanged) travel();
      requestFrame();
    },
    reset() { travel(!state.regionId); },
    zoom(direction: 1 | -1) {
      traveling = false;
      const offset = camera.position.clone().sub(controls.target);
      const length = THREE.MathUtils.clamp(offset.length() * (direction === 1 ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(length));
      controls.update();
      requestFrame();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.removeEventListener("start", controlsStart);
      controls.removeEventListener("change", requestFrame);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", visibility);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export type AtlasSceneController = ReturnType<typeof createAtlasScene>;
