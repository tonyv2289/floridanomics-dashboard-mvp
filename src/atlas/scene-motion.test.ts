import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Scene, Camera } from "three";
import { createAtlasScene, type AtlasSceneController } from "./scene";

const rendered = vi.hoisted(() => ({ frames: [] as Array<{ camera: number[]; land: number[]; scale: number; vapor: number }> }));
vi.mock("three", async (original) => {
  const actual = await original<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    shadowMap = {};
    domElement = { setAttribute() {}, addEventListener() {}, removeEventListener() {}, remove() {} };
    setPixelRatio() {} setClearColor() {} setSize() {} dispose() {}
    render(scene: Scene, camera: Camera) {
      const land = scene.getObjectByName("land-space-coast")!;
      rendered.frames.push({ camera: camera.position.toArray(), land: land.position.toArray(), scale: land.scale.x, vapor: scene.getObjectByName("launch-vapor")!.scale.y });
    }
  } };
});
vi.mock("three/addons/controls/OrbitControls.js", async () => {
  const { Vector3 } = await import("three");
  return { OrbitControls: class {
    target = new Vector3();
    update() {} addEventListener() {} removeEventListener() {} dispose() {}
  } };
});

describe("atlas pause and resume", () => {
  let now = 1000;
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  let controller: AtlasSceneController;
  const tick = (ms = 20) => {
    now += ms;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(now));
  };
  const latest = () => rendered.frames.at(-1)!;
  const update = (motion: boolean, regionId: string | null = "space-coast") => controller.update({ regionId, assetId: null, sector: "All sectors", motion });
  beforeEach(() => {
    now = 1000; nextFrame = 0; frames.clear(); rendered.frames.length = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("document", { hidden: false, addEventListener() {}, removeEventListener() {} });
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    controller = createAtlasScene({ host: { clientWidth: 800, clientHeight: 600, prepend() {} } as unknown as HTMLDivElement, labels: new Map(), onAsset() {}, onFailure() {} });
    tick();
  });
  afterEach(() => { controller.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("freezes both regional lift and camera zoom mid-transition, then resumes without a time jump", () => {
    update(true);
    for (let i = 0; i < 40; i++) tick();
    const beforePause = latest();
    update(false); tick();
    expect(latest()).toEqual(beforePause);
    expect(frames.size).toBe(0);
    tick(30_000);
    expect(latest()).toEqual(beforePause);
    update(true); tick();
    expect(latest().scale).toBeGreaterThan(beforePause.scale);
    expect(latest().scale - beforePause.scale).toBeLessThan(0.05);
    for (let i = 0; i < 150; i++) tick();
    expect(latest().camera).not.toEqual(beforePause.camera);
    expect(latest().scale).toBeGreaterThan(beforePause.scale);
  });

  it("stops and restarts landmark animation after the regional transition finishes", () => {
    update(true);
    for (let i = 0; i < 150; i++) tick();
    const beforePause = latest();
    update(false); tick(); tick(10_000);
    expect(latest()).toEqual(beforePause);
    expect(frames.size).toBe(0);
    update(true); tick();
    expect(latest().vapor).not.toBe(beforePause.vapor);
    expect(latest().camera).toEqual(beforePause.camera);
  });

  it("keeps explicit region selection usable without animation while paused", () => {
    update(false, null); tick();
    const whole = latest();
    update(false); tick();
    expect(latest().camera).not.toEqual(whole.camera);
    expect(latest().scale).toBeGreaterThan(whole.scale);
    const selected = latest();
    tick(10_000);
    expect(latest()).toEqual(selected);
    expect(frames.size).toBe(0);
  });
});
