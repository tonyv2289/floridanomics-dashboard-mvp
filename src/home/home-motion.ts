import geo from "../data/florida.geo.json";
import type { HomeModel, HomeRegion } from "./home-model";
import { ordinal } from "../v3/state-investment";

// Scroll-driven motion for the homepage. Every movement carries place (the camera travels region to region) or time
// (the years advance); nothing plays on its own after the first paint. With reduced motion, everything rests in its
// final state and the map stays statewide.

type Point = [number, number];
type Camera = { x: number; y: number; s: number; fx: number; fy: number };
type Light = { x: number; y: number; r: number; k: number; region: HomeRegion; pins: Array<{ name: string; p: Point; side: "l" | "r" }> };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
// Equirectangular projection scaled for Florida's latitude.
const K = Math.cos((27.8 * Math.PI) / 180);
const project = ([lon, lat]: Point): Point => [lon * K, -lat];
const holdFloat = (p: number, n: number, hold: number) => {
  const s = p * n;
  const i = Math.min(Math.floor(s), n - 1);
  return i + easeInOut(clamp((s - i - hold) / (1 - 2 * hold), 0, 1));
};

function outlineRings(): Point[][] {
  const geometry = (geo as unknown as { geometry: { type: string; coordinates: number[][][][] | number[][][] } }).geometry;
  const polygons = geometry.type === "MultiPolygon" ? (geometry.coordinates as number[][][][]) : [geometry.coordinates as number[][][]];
  return polygons.map((polygon) => polygon[0].map(([lon, lat]) => project([lon, lat])));
}

export function mountHomeMotion(root: HTMLElement, model: HomeModel, reduce: boolean): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-home-map]");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return () => undefined;
  const css = getComputedStyle(root);
  const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const COLOR = { text: color("--home-text", "#e8eef9"), sun: color("--home-sun", "#ff8f3f") };
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const rings = outlineRings();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of rings) for (const [x, y] of ring) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const inside = (x: number, y: number) => {
    let hit = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  };
  // One point of light per ~8 km cell of the state outline.
  const STEP = 0.072;
  const dots: Array<{ x: number; y: number; d: number }> = [];
  for (let y = minY + STEP / 2; y < maxY; y += STEP) {
    for (let x = minX + STEP / 2; x < maxX; x += STEP) {
      if (inside(x, y)) dots.push({ x, y, d: ((x - minX) / (maxX - minX)) * 0.6 + ((y - minY) / (maxY - minY)) * 0.4 });
    }
  }
  const regions = model.regions.map((region) => ({
    region,
    p: project(region.center),
    pins: region.counties.map((county) => ({ name: county.name, p: project(county.lonLat), side: county.side })),
  }));

  const tour = root.querySelector<HTMLElement>("[data-home-tour]");
  const track = root.querySelector<HTMLElement>("[data-home-track]");
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-home-card]"));
  const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-home-stops] li"));
  const stopsList = root.querySelector<HTMLElement>("[data-home-stops]");
  const regionName = root.querySelector<HTMLElement>("[data-home-region-name]");
  const route = root.querySelector<HTMLElement>("[data-home-route]");
  const pin = root.querySelector<HTMLElement>("[data-home-pin]");
  const cardsBlock = root.querySelector<HTMLElement>("[data-home-cards]");
  const climb = root.querySelector<HTMLElement>("[data-home-climb]");
  const flows = Array.from(root.querySelectorAll<HTMLElement>("[data-home-flow]"));
  const ticks = Array.from(root.querySelectorAll<HTMLElement>("[data-home-ticks] i"));

  let W = 0, H = 0, wide = true, step = 430;
  let band = { top: 0, bottom: 0 };
  const stateCam = (): Camera => {
    const aw = wide ? W * 0.44 : W * 0.92, ah = wide ? H * 0.8 : H * 0.56;
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, s: Math.min(aw / (maxX - minX), ah / (maxY - minY)), fx: wide ? W * 0.66 : W * 0.5, fy: wide ? H * 0.55 : H * 0.66 };
  };
  const regionCam = (i: number): Camera => {
    const S = stateCam();
    const r = regions[i];
    const room = Math.max(band.bottom - band.top, 120);
    const s = clamp(Math.min(S.s * r.region.zoom, (0.42 * room) / r.region.radius, (0.36 * W) / r.region.radius), S.s * 1.2, S.s * r.region.zoom);
    return { x: r.p[0], y: r.p[1], s, fx: wide ? W * 0.6 : W * 0.5, fy: (band.top + band.bottom) / 2 };
  };
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const box = canvas.getBoundingClientRect();
    W = box.width; H = box.height; wide = W >= 880;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    step = cards[0] ? cards[0].getBoundingClientRect().width + 20 : 430;
    // The pinned tour stacks the route header at the top and the cards at the bottom; the map fills the band between.
    if (pin && route && cardsBlock) {
      const pad = getComputedStyle(pin);
      band = { top: parseFloat(pad.paddingTop) + route.offsetHeight + 12, bottom: H - parseFloat(pad.paddingBottom) - cardsBlock.offsetHeight - 12 };
    } else {
      band = { top: H * 0.2, bottom: H * 0.6 };
    }
  };

  let cam: Camera = { x: 0, y: 0, s: 1, fx: 0, fy: 0 };
  let lights: Light[] = [];
  let labelsAlpha = 1;
  let pointer: { x: number; y: number } | null = null;
  const revealStart = performance.now();
  const REVEAL = 1100;

  const draw = (now: number) => {
    ctx.clearRect(0, 0, W, H);
    const t = reduce ? 1 : clamp((now - revealStart) / REVEAL, 0, 1);
    const sx = (x: number) => cam.fx + (x - cam.x) * cam.s;
    const sy = (y: number) => cam.fy + (y - cam.y) * cam.s;
    ctx.globalAlpha = 0.9 * t;
    ctx.strokeStyle = "rgba(148,163,184,0.22)";
    ctx.lineWidth = 1;
    for (const ring of rings) {
      ctx.beginPath();
      ring.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
      ctx.closePath();
      ctx.stroke();
    }
    const radius = clamp(cam.s * 0.017, 0.8, 3.6);
    const hot: Array<[number, number, number, number]> = [];
    ctx.fillStyle = COLOR.text;
    for (const p of dots) {
      const X = sx(p.x), Y = sy(p.y);
      if (X < -8 || X > W + 8 || Y < -8 || Y > H + 8) continue;
      const a = reduce ? 1 : easeOut(clamp((t * 1.6 - p.d) / 0.6, 0, 1));
      if (a <= 0) continue;
      let w = 0;
      for (const light of lights) {
        const dx = p.x - light.x, dy = p.y - light.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < light.r) w = Math.max(w, (1 - dd / light.r) * light.k);
      }
      let pw = 0;
      if (pointer) {
        const dx = X - pointer.x, dy = Y - pointer.y, dd = dx * dx + dy * dy;
        if (dd < 8100) pw = 1 - Math.sqrt(dd) / 90;
      }
      if (w > 0.04) { hot.push([X, Y, w, a]); continue; }
      ctx.globalAlpha = (0.17 + 0.3 * pw) * a;
      ctx.beginPath();
      ctx.arc(X, Y, radius * (1 + 0.5 * pw), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLOR.sun;
    for (const [X, Y, w, a] of hot) {
      ctx.globalAlpha = (0.22 + 0.7 * w) * a;
      ctx.beginPath();
      ctx.arc(X, Y, radius * (1 + 0.55 * w), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textBaseline = "middle";
    if (labelsAlpha > 0.02 && wide) {
      ctx.font = "600 12px Manrope, 'Avenir Next', sans-serif";
      for (const r of regions) {
        const X = sx(r.p[0]), Y = sy(r.p[1]);
        ctx.globalAlpha = labelsAlpha * t;
        ctx.fillStyle = COLOR.sun;
        ctx.beginPath(); ctx.arc(X, Y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLOR.text;
        ctx.globalAlpha = 0.82 * labelsAlpha * t;
        const width = ctx.measureText(r.region.short).width;
        let side = r.region.label;
        if (side === "r" && X + 9 + width > W - 8) side = "l";
        if (side === "l" && X - 9 - width < 8) side = "r";
        if (side === "t") { ctx.textAlign = "center"; ctx.fillText(r.region.short, X, Y - 13); }
        else { ctx.textAlign = side === "l" ? "right" : "left"; ctx.fillText(r.region.short, side === "l" ? X - 9 : X + 9, Y); }
      }
    }
    ctx.font = "700 12.5px Manrope, 'Avenir Next', sans-serif";
    for (const light of lights) {
      if (light.k < 0.05) continue;
      for (const county of light.pins) {
        const X = sx(county.p[0]), Y = sy(county.p[1]);
        ctx.globalAlpha = light.k;
        ctx.strokeStyle = COLOR.sun; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(X, Y, 8, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = COLOR.sun;
        ctx.beginPath(); ctx.arc(X, Y, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLOR.text;
        ctx.textAlign = county.side === "l" ? "right" : "left";
        ctx.fillText(county.name, county.side === "l" ? X - 14 : X + 14, Y);
      }
    }
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
    return t < 1;
  };

  // Climb chart state.
  const years = Array.from(root.querySelectorAll<HTMLElement>("[data-home-year]"));
  const rankEl = root.querySelector<HTMLElement>("[data-home-rank]");
  const countEl = root.querySelector<HTMLElement>("[data-home-count]");
  const perEl = root.querySelector<HTMLElement>("[data-home-per]");
  const flLine = root.querySelector<SVGPathElement>("[data-home-line='fl']");
  const medLine = root.querySelector<SVGPathElement>("[data-home-line='med']");
  const flDots = Array.from(root.querySelectorAll<SVGCircleElement>("[data-home-dot='fl']"));
  const medDots = Array.from(root.querySelectorAll<SVGCircleElement>("[data-home-dot='med']"));
  const guide = root.querySelector<SVGLineElement>("[data-home-guide]");
  const flLabel = root.querySelector<SVGTextElement>("[data-home-label='fl']");
  const medLabel = root.querySelector<SVGTextElement>("[data-home-label='med']");
  const flLen = flLine?.getTotalLength?.() ?? 0;
  const medLen = medLine?.getTotalLength?.() ?? 0;
  if (flLine && medLine) flLine.style.strokeDasharray = medLine.style.strokeDasharray = "2000";
  const climbModel = model.climb;
  let shownYear = -1;
  const setYear = (i: number) => {
    if (!climbModel || i === shownYear) return;
    shownYear = i;
    years.forEach((el, k) => el.classList.toggle("is-active", k === i));
    if (rankEl) rankEl.textContent = ordinal(climbModel.ranks[i]);
    if (countEl) countEl.textContent = climbModel.counts[i].toLocaleString("en-US");
    if (perEl) perEl.textContent = climbModel.florida[i].toFixed(1);
    const fl = flDots[i], med = medDots[i];
    if (guide && fl) { guide.setAttribute("x1", fl.getAttribute("cx") ?? "0"); guide.setAttribute("x2", fl.getAttribute("cx") ?? "0"); }
    if (flLabel && fl) { flLabel.setAttribute("x", fl.getAttribute("cx") ?? "0"); flLabel.setAttribute("y", String(Number(fl.getAttribute("cy")) + 26)); flLabel.textContent = `Florida ${climbModel.florida[i].toFixed(1)}`; }
    if (medLabel && med) { medLabel.setAttribute("x", med.getAttribute("cx") ?? "0"); medLabel.setAttribute("y", String(Number(med.getAttribute("cy")) - 14)); medLabel.textContent = `Median ${climbModel.median[i].toFixed(1)}`; }
  };
  const setChart = (t: number) => {
    if (flLine) flLine.style.strokeDashoffset = String(2000 - flLen * t);
    if (medLine) medLine.style.strokeDashoffset = String(2000 - medLen * t);
    const n = Math.max(flDots.length - 1, 1);
    flDots.forEach((d, i) => d.setAttribute("opacity", i / n <= t + 0.001 ? "1" : "0.25"));
    medDots.forEach((d, i) => d.setAttribute("opacity", i / n <= t + 0.001 ? "1" : "0.25"));
  };

  let shownRegion = -1;
  const update = () => {
    const vh = window.innerHeight;
    const N = regions.length;
    if (tour && track && N > 1) {
      const tr = tour.getBoundingClientRect();
      const pinned = !reduce && tr.height > vh * 1.5;
      const entry = pinned ? clamp(1 - tr.top / vh, 0, 1) : 0;
      const p = pinned ? clamp(-tr.top / (tr.height - vh), 0, 1) : 0;
      const r = holdFloat(p, N - 1, 0.28);
      const i = Math.min(Math.floor(r), N - 2), f = r - i;
      const A = regionCam(i), B = regionCam(i + 1), S = stateCam();
      const fly = 1 - 0.24 * Math.sin(Math.PI * f);
      const k = easeInOut(entry);
      const T = { x: lerp(A.x, B.x, f), y: lerp(A.y, B.y, f), s: lerp(A.s, B.s, f) * fly, fx: lerp(A.fx, B.fx, f), fy: lerp(A.fy, B.fy, f) };
      cam = { x: lerp(S.x, T.x, k), y: lerp(S.y, T.y, k), s: lerp(S.s, T.s, k), fx: lerp(S.fx, T.fx, k), fy: lerp(S.fy, T.fy, k) };
      labelsAlpha = 1 - k;
      lights = [i, i + 1].map((j) => ({ x: regions[j].p[0], y: regions[j].p[1], r: regions[j].region.radius, region: regions[j].region, pins: regions[j].pins, k: k * clamp(1 - Math.abs(r - j) * 1.6, 0, 1) }));
      if (pinned) track.style.transform = `translate3d(${-r * step}px, 0, 0)`;
      const active = Math.round(r);
      if (active !== shownRegion) {
        shownRegion = active;
        cards.forEach((card, j) => card.classList.toggle("is-active", j === active));
        stops.forEach((stop, j) => stop.classList.toggle("is-active", j === active));
        if (regionName) regionName.textContent = regions[active].region.title;
      }
      stops.forEach((stop, j) => stop.classList.toggle("is-done", j <= r + 0.001));
      stopsList?.style.setProperty("--p", String(r / (N - 1)));
    } else {
      cam = stateCam();
    }
    if (climb && climbModel) {
      const cr = climb.getBoundingClientRect();
      const pinned = !reduce && cr.height > vh * 1.5;
      const pc = pinned ? clamp(-cr.top / (cr.height - vh), 0, 1) : 1;
      const n = climbModel.years.length - 1;
      const yf = holdFloat(pc, n, 0.2);
      setYear(Math.round(yf));
      setChart(yf / n);
    }
    for (const el of flows) {
      const box = el.getBoundingClientRect();
      const v = reduce ? 1 : clamp((vh - box.top) / (vh * 0.8), 0, 1);
      if (el.dataset.homeFlow === "ticks") {
        const lit = Math.round(v * ticks.length);
        ticks.forEach((tick, j) => tick.classList.toggle("on", j < lit));
      } else {
        el.querySelectorAll<HTMLElement>(".home-bar u").forEach((u) => u.style.setProperty("--v", String(easeOut(v))));
      }
    }
  };

  let raf = 0;
  const frame = (now: number) => {
    raf = 0;
    update();
    if (draw(now)) request();
  };
  const request = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const onResize = () => { resize(); request(); };
  const onPointer = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    pointer = labelsAlpha > 0.9 ? { x: event.clientX - box.left, y: event.clientY - box.top } : null;
    request();
  };
  const onLeave = () => { pointer = null; request(); };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", onResize);
  if (finePointer && !reduce) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }
  let alive = true;
  document.fonts?.ready.then(() => { if (alive) onResize(); }).catch(() => undefined);
  resize();
  request();
  return () => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("scroll", request);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointer);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}

