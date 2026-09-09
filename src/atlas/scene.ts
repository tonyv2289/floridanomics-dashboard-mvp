import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { REGIONS, regionMatches } from "./data";
import type { Sector } from "./data";
import { crispPixelRatio, snapToDevicePixel } from "./regional-identity";
import { buildFloridaMap, mapCameraPose, setPieceProgress } from "./regional-map";
import { LAND_HEIGHT, smoothStep } from "./regional-geography";

type SceneState = { regionId: string | null; assetId: string | null; sector: Sector; motion: boolean };
type SceneOptions = {
  host: HTMLDivElement;
  labels: Map<string, HTMLButtonElement>;
  onAsset: (regionId: string, assetId: string) => void;
  onFailure: () => void;
};

export function createAtlasScene({ host, labels, onAsset, onFailure }: SceneOptions) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(crispPixelRatio(window.devicePixelRatio || 1));
  renderer.setClearColor(0x02060d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xd6eafa, 0x26302c, 2.6));
  const key = new THREE.DirectionalLight(0xfff2da, 3.4);
  key.position.set(-6, 16, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12; key.shadow.camera.right = 12;
  key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
  key.shadow.camera.near = 1; key.shadow.camera.far = 45;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x92cbe5, 1.5);
  rim.position.set(9, 6, -7);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 60;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2.25;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.6;

  const grid = new THREE.GridHelper(50, 50, 0x192b38, 0x0c1925);
  grid.position.y = -0.32;
  scene.add(grid);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x04101a, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);

  const pieces = buildFloridaMap();
  const hitTargets: THREE.Object3D[] = [];
  for (const map of pieces) {
    scene.add(map.root);
    map.root.traverse((object) => { if (object instanceof THREE.Mesh) hitTargets.push(object); });
  }

  let state: SceneState = { regionId: null, assetId: null, sector: "All sectors", motion: true };
  let frameId = 0;
  let disposed = false;
  let animationTime = 0;
  let lastTime = 0;
  let traveling = false;
  let travelStarted = 0;
  let assembling = false;
  let assemblyStarted = 0;
  let assemblyFrom = pieces.map(() => 0);
  let width = 1;
  let height = 1;
  const fromPosition = new THREE.Vector3();
  const toPosition = new THREE.Vector3();
  const fromTarget = new THREE.Vector3();
  const toTarget = new THREE.Vector3();
  const middlePosition = new THREE.Vector3();
  const middleTarget = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const resetPose = () => {
    const pose = mapCameraPose(pieces, state.regionId, width / height);
    toTarget.copy(pose.target);
    toPosition.copy(pose.position);
    const middle = mapCameraPose(pieces, state.regionId, width / height, false);
    middleTarget.copy(middle.target);
    middlePosition.copy(middle.position);
  };
  const frame = (now: number) => {
    frameId = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (state.motion) animationTime += dt;
    if (traveling) {
      const progress = state.motion ? Math.min((now - travelStarted) / 2400, 1) : 1;
      if (state.regionId && progress < 0.55) {
        const ease = smoothStep(progress / 0.55);
        camera.position.lerpVectors(fromPosition, middlePosition, ease);
        controls.target.lerpVectors(fromTarget, middleTarget, ease);
      } else {
        const ease = smoothStep(state.regionId ? (progress - 0.55) / 0.45 : progress);
        camera.position.lerpVectors(state.regionId ? middlePosition : fromPosition, toPosition, ease);
        controls.target.lerpVectors(state.regionId ? middleTarget : fromTarget, toTarget, ease);
      }
      if (progress === 1) traveling = false;
    }
    const assemblyProgress = state.motion ? Math.min((now - assemblyStarted) / 1650, 1) : 1;
    for (const [index, map] of pieces.entries()) {
      const focused = state.regionId === map.piece.id;
      const region = REGIONS[index];
      const matches = regionMatches(region, state.sector);
      if (assembling) {
        const ease = smoothStep(assemblyProgress);
        setPieceProgress(map, THREE.MathUtils.lerp(assemblyFrom[index], focused ? 1 : 0, ease));
      }
      // The state never disappears, even while a region is lifted or filtered.
      map.landMaterial.color.copy(map.color).multiplyScalar(matches ? state.regionId && !focused ? 0.68 : 1 : 0.38);
      map.borderMaterial.opacity = focused ? 1 : 0.72;
      map.world.root.visible = matches;
      if (matches) {
        for (const [id, assetGroup] of map.world.assets) {
          const asset = region.assets.find((a) => a.id === id);
          assetGroup.visible = state.sector === "All sectors" || asset?.sector === state.sector;
        }
        map.world.animated.forEach((update) => update(animationTime));
      }
    }
    if (assemblyProgress === 1) assembling = false;
    controls.update();
    camera.updateMatrixWorld();
    REGIONS.forEach((region) => {
      const label = labels.get(region.id);
      if (!label) return;
      const map = pieces.find((p) => p.piece.id === region.id)!;
      projected.copy(map.root.position);
      projected.y += LAND_HEIGHT + 0.12;
      projected.z += map.piece.radius * 0.92;
      projected.project(camera);
      const visible = !state.regionId && regionMatches(region, state.sector) && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.94 && Math.abs(projected.y) < 0.88;
      label.style.visibility = visible ? "visible" : "hidden";
      const ratio = window.devicePixelRatio || 1;
      const x = snapToDevicePixel((projected.x * 0.5 + 0.5) * width, ratio);
      const y = snapToDevicePixel((-projected.y * 0.5 + 0.5) * height, ratio);
      label.style.transform = "translate(" + x + "px, " + y + "px)";
    });
    renderer.render(scene, camera);
    if (state.motion || traveling || assembling) requestFrame();
  };
  function requestFrame() { if (!frameId && !disposed && !document.hidden) frameId = requestAnimationFrame(frame); }
  function travel() {
    resetPose();
    fromPosition.copy(camera.position);
    fromTarget.copy(controls.target);
    travelStarted = performance.now();
    traveling = true;
    requestFrame();
  }
  const resize = (refit = true) => {
    width = host.clientWidth || 1;
    height = host.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(crispPixelRatio(window.devicePixelRatio || 1));
    renderer.setSize(width, height);
    if (refit) travel();
    requestFrame();
  };
  resize(false);
  resetPose();
  camera.position.copy(toPosition);
  controls.target.copy(toTarget);
  controls.update();
  const observer = new ResizeObserver(() => resize());
  observer.observe(host);
  const controlsStart = () => { traveling = false; };
  controls.addEventListener("start", controlsStart);
  controls.addEventListener("change", requestFrame);

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const activePointers = new Set<number>();
  let isGesture = false;
  let down = { x: 0, y: 0 };
  const pointerDown = (event: PointerEvent) => {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) isGesture = true;
    down = { x: event.clientX, y: event.clientY };
  };
  const pointerUp = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (isGesture) { if (activePointers.size === 0) isGesture = false; return; }
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitTargets, false).find(({ object }) => {
      let ancestor: THREE.Object3D | null = object;
      while (ancestor) { if (!ancestor.visible) return false; ancestor = ancestor.parent; }
      return true;
    });
    if (hit) {
      const region = REGIONS.find((r) => r.id === hit.object.userData.regionId)!;
      const selected = hit.object.userData.assetId as string | null;
      const fallback = region.assets.find((a) => state.sector === "All sectors" || a.sector === state.sector);
      if (fallback) onAsset(region.id, selected ?? fallback.id);
    }
  };
  const pointerCancel = () => { activePointers.clear(); isGesture = false; };
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  const visibility = () => { lastTime = performance.now(); requestFrame(); };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  renderer.domElement.addEventListener("pointercancel", pointerCancel);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", visibility);
  requestFrame();
  return {
    update(next: SceneState) {
      const regionChanged = state.regionId !== next.regionId;
      state = next;
      if (regionChanged) {
        assemblyFrom = pieces.map((map) => map.progress);
        assemblyStarted = performance.now();
        assembling = true;
        travel();
      }
      requestFrame();
    },
    reset() { travel(); },
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
      renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", visibility);
      pieces.forEach((map) => { map.root.remove(map.world.root); map.world.dispose(); });
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
export type AtlasSceneController = ReturnType<typeof createAtlasScene>;
