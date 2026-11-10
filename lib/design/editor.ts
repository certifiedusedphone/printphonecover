// Canvas editor: draws the print-bed preview and handles drag / resize / rotate.
// React components subscribe to changes and call the action methods.

import {
  Design, Geometry, ImageStore, Layer, TextLayer, StickerLayer,
  dims, drawCase, drawDesign, layerSize, measureText, px, STICKERS, FontKey,
} from "./render";

type Listener = () => void;

export class Editor {
  design: Design = { bg: { kind: "pattern", id: "dusk" }, layers: [] };
  images: ImageStore = {};
  sel: number | null = null;
  geometry: Geometry;
  finish: "solid" | "clear" = "solid";
  private uid = 1;
  private hist: string[] = [];
  private hi = -1;
  private listeners = new Set<Listener>();
  private cv: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private view = { s: 1, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1 };
  private drag: null | { mode: "move"; L: Layer; x0: number; y0: number; p0: { x: number; y: number } }
    | { mode: "xf"; L: Layer; s0: number; r0: number; d0: number; a0: number } = null;
  private ro: ResizeObserver | null = null;
  private cleanup: (() => void)[] = [];

  constructor(geometry: Geometry) { this.geometry = geometry; }

  /* ---------- subscription ---------- */
  version = 0;
  subscribe = (fn: Listener) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private emit() { this.version++; this.listeners.forEach((f) => f()); }

  /* ---------- canvas wiring ---------- */
  attach(cv: HTMLCanvasElement) {
    this.cv = cv; this.ctx = cv.getContext("2d");
    const box = cv.parentElement!;
    this.ro = new ResizeObserver(() => { this.size(); this.render(); });
    this.ro.observe(box);
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, t: K, h: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(t, h as EventListener); this.cleanup.push(() => el.removeEventListener(t, h as EventListener));
    };
    on(cv, "pointerdown", (e) => this.down(e));
    on(cv, "pointermove", (e) => this.move(e));
    on(cv, "pointerup", () => this.up());
    on(cv, "pointercancel", () => this.up());
    on(cv, "keydown", (e) => this.key(e));
    const mq = matchMedia("(prefers-color-scheme: dark)"); const rerender = () => this.render();
    mq.addEventListener("change", rerender); this.cleanup.push(() => mq.removeEventListener("change", rerender));
    this.size(); this.render();
  }
  detach() { this.ro?.disconnect(); this.cleanup.forEach((f) => f()); this.cleanup = []; this.cv = null; }

  private size() {
    if (!this.cv) return;
    const r = this.cv.parentElement!.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    Object.assign(this.view, { cw: r.width, ch: r.height, dpr });
    this.cv.width = Math.max(1, Math.round(r.width * dpr)); this.cv.height = Math.max(1, Math.round(r.height * dpr));
  }

  render() {
    const c = this.ctx; if (!c || !this.cv) return;
    const { cw, ch, dpr } = this.view, g = this.geometry, { W, H } = dims(g), f = px(1.6);
    const css = getComputedStyle(this.cv);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = css.getPropertyValue("--bed").trim() || "#E6E3EA"; c.fillRect(0, 0, cw, ch);
    const s = Math.min((cw - 48) / (W + 2 * f), (ch - 60) / (H + 2 * f));
    const ox = (cw - W * s) / 2, oy = (ch - H * s) / 2 - 6;
    Object.assign(this.view, { s, ox, oy });
    // 10 mm platen grid
    const step = px(10) * s;
    c.strokeStyle = css.getPropertyValue("--bedline").trim() || "rgba(0,0,0,.07)"; c.lineWidth = 1; c.beginPath();
    for (let x = ox % step; x < cw; x += step) { c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, ch); }
    for (let y = oy % step; y < ch; y += step) { c.moveTo(0, Math.round(y) + 0.5); c.lineTo(cw, Math.round(y) + 0.5); }
    c.stroke();
    c.save(); c.translate(ox, oy); c.scale(s, s);
    drawCase(c, g, this.finish, (cc, w, h) => drawDesign(cc, this.design, this.images, w, h), dpr);
    const L = this.selected();
    if (L) this.drawSelection(c, L, s, css.getPropertyValue("--accent").trim() || "#C8106E");
    c.restore();
  }

  private corners(L: Layer) {
    const [w, h] = layerSize(L, this.images), co = Math.cos(L.rot), sn = Math.sin(L.rot), hw = (w / 2) * L.s, hh = (h / 2) * L.s;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [L.x + x * co - y * sn, L.y + x * sn + y * co]);
  }
  private drawSelection(c: CanvasRenderingContext2D, L: Layer, s: number, accent: string) {
    const p = this.corners(L);
    c.save(); c.lineWidth = 1.5 / s; c.setLineDash([6 / s, 4 / s]); c.strokeStyle = accent;
    c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.stroke();
    c.setLineDash([]);
    const [hx, hy] = p[2];
    c.beginPath(); c.arc(hx, hy, 11 / s, 0, Math.PI * 2); c.fillStyle = accent; c.fill();
    c.lineWidth = 2.5 / s; c.strokeStyle = "#FFFFFF"; c.stroke();
    c.beginPath(); c.arc(hx, hy, 5 / s, -0.3, Math.PI * 1.3); c.lineWidth = 1.6 / s; c.stroke();
    c.restore();
  }

  /* ---------- pointer ---------- */
  private toPrint(e: PointerEvent) { const r = this.cv!.getBoundingClientRect(); return { x: (e.clientX - r.left - this.view.ox) / this.view.s, y: (e.clientY - r.top - this.view.oy) / this.view.s }; }
  private hit(L: Layer, p: { x: number; y: number }) {
    const [w, h] = layerSize(L, this.images), dx = p.x - L.x, dy = p.y - L.y, co = Math.cos(L.rot), sn = Math.sin(L.rot);
    const lx = (dx * co + dy * sn) / L.s, ly = (-dx * sn + dy * co) / L.s;
    return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
  }
  private onHandle(L: Layer, p: { x: number; y: number }) { const [hx, hy] = this.corners(L)[2]; return Math.hypot(p.x - hx, p.y - hy) * this.view.s < 20; }

  private down(e: PointerEvent) {
    const p = this.toPrint(e), L = this.selected();
    if (L && this.onHandle(L, p)) {
      this.drag = { mode: "xf", L, s0: L.s, r0: L.rot, d0: Math.hypot(p.x - L.x, p.y - L.y), a0: Math.atan2(p.y - L.y, p.x - L.x) };
      this.cv!.setPointerCapture(e.pointerId); return;
    }
    const target = [...this.design.layers].reverse().find((l) => this.hit(l, p));
    this.sel = target ? target.id : null;
    if (target) { this.drag = { mode: "move", L: target, x0: target.x, y0: target.y, p0: p }; this.cv!.setPointerCapture(e.pointerId); }
    this.render(); this.emit();
  }
  private move(e: PointerEvent) {
    const p = this.toPrint(e);
    if (!this.drag) {
      const L = this.selected(); let cur = "default";
      if (L) cur = this.onHandle(L, p) ? "nwse-resize" : this.hit(L, p) ? "move" : "default";
      if (cur === "default" && this.design.layers.some((l) => this.hit(l, p))) cur = "pointer";
      this.cv!.style.cursor = cur; return;
    }
    const d = this.drag, L = d.L;
    if (d.mode === "move") { L.x = d.x0 + p.x - d.p0.x; L.y = d.y0 + p.y - d.p0.y; }
    else {
      const dist = Math.hypot(p.x - L.x, p.y - L.y), a = Math.atan2(p.y - L.y, p.x - L.x);
      L.s = Math.max(0.02, Math.min(30, (d.s0 * dist) / Math.max(1, d.d0)));
      let r = d.r0 + a - d.a0;
      const deg = ((((r * 180) / Math.PI) % 90) + 90) % 90;
      if (deg < 3 || deg > 87) r = Math.round(r / (Math.PI / 2)) * (Math.PI / 2);
      L.rot = r;
    }
    this.render(); this.emit();
  }
  private up() { if (this.drag) { this.drag = null; this.commit(); } }
  private key(e: KeyboardEvent) {
    const L = this.selected(); if (!L) return;
    const n = e.shiftKey ? px(5) : px(1);
    const k: Record<string, [number, number]> = { ArrowLeft: [-n, 0], ArrowRight: [n, 0], ArrowUp: [0, -n], ArrowDown: [0, n] };
    if (k[e.key]) { L.x += k[e.key][0]; L.y += k[e.key][1]; e.preventDefault(); this.changed(true); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); this.remove(); }
  }

  /* ---------- history ---------- */
  private snap() { return JSON.stringify(this.design); }
  commit() {
    const s = this.snap(); if (this.hist[this.hi] === s) return;
    this.hist = this.hist.slice(0, this.hi + 1); this.hist.push(s);
    if (this.hist.length > 80) this.hist.shift();
    this.hi = this.hist.length - 1; this.emit();
  }
  resetHistory() { this.hist = []; this.hi = -1; this.commit(); }
  get canUndo() { return this.hi > 0; }
  get canRedo() { return this.hi < this.hist.length - 1; }
  undo() { if (this.canUndo) { this.hi--; this.restore(this.hist[this.hi]); } }
  redo() { if (this.canRedo) { this.hi++; this.restore(this.hist[this.hi]); } }
  private restore(s: string) { this.design = JSON.parse(s); if (!this.selected()) this.sel = null; this.render(); this.emit(); }

  /* ---------- actions ---------- */
  selected(): Layer | null { return this.design.layers.find((l) => l.id === this.sel) ?? null; }
  /** Call after mutating the selected layer from the UI. */
  changed(commit = false) { this.render(); this.emit(); if (commit) this.commit(); }
  select(id: number | null) { this.sel = id; this.changed(); }

  setGeometry(g: Geometry) {
    const o = dims(this.geometry), n = dims(g);
    this.design.layers.forEach((L) => { L.x *= n.W / o.W; L.y *= n.H / o.H; });
    this.geometry = g; this.changed(true);
  }
  setFinish(f: "solid" | "clear") { this.finish = f; this.changed(); }
  setBg(bg: Design["bg"]) { this.design.bg = bg; this.changed(true); }

  private add(L: Layer) { this.design.layers.push(L); this.sel = L.id; this.changed(true); }
  coverScale(w: number, h: number) { const { W, H } = dims(this.geometry); return Math.max(W / w, H / h); }

  addImage(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("Please choose a JPG or PNG image."));
      const im = new Image();
      im.onload = () => {
        const id = "img" + this.uid++; this.images[id] = im;
        const { W, H } = dims(this.geometry), s = this.coverScale(im.naturalWidth, im.naturalHeight);
        this.add({ id: this.uid++, type: "image", imgId: id, x: W / 2, y: H / 2, s, base: s, rot: 0, flip: false });
        resolve();
      };
      im.onerror = () => reject(new Error("That file could not be opened as an image. Try a JPG or PNG."));
      im.src = URL.createObjectURL(file);
    });
  }
  addText(text: string, font: FontKey, color: string) {
    const { W, H } = dims(this.geometry);
    const L: TextLayer = { id: this.uid++, type: "text", text: text || "Your text", font, color, size: 150, w: 0, h: 0, x: W / 2, y: H * 0.6, s: 1, base: 1, rot: 0, flip: false };
    measureText(L); L.s = L.base = Math.min(1, (W * 0.85) / L.w); this.add(L);
  }
  addSticker(kind: string) {
    const { W, H } = dims(this.geometry);
    const L: StickerLayer = { id: this.uid++, type: "sticker", kind, color: STICKERS[kind].color, x: W / 2, y: H * 0.45, s: 0.9, base: 0.9, rot: 0, flip: false };
    this.add(L);
  }
  remove() { this.design.layers = this.design.layers.filter((l) => l.id !== this.sel); this.sel = null; this.changed(true); }
  center() { const L = this.selected(); if (!L) return; const { W, H } = dims(this.geometry); L.x = W / 2; L.y = H / 2; this.changed(true); }
  fill() {
    const L = this.selected(); if (!L || L.type !== "image") return;
    const im = this.images[L.imgId], { W, H } = dims(this.geometry);
    L.s = L.base = this.coverScale(im.naturalWidth, im.naturalHeight); L.rot = 0; L.x = W / 2; L.y = H / 2; this.changed(true);
  }
  reorder(dir: 1 | -1) {
    const L = this.selected(); if (!L) return;
    const arr = this.design.layers, i = arr.indexOf(L), j = i + dir;
    if (j < 0 || j >= arr.length) return;
    arr.splice(i, 1); arr.splice(j, 0, L); this.changed(true);
  }
  remeasureText() { this.design.layers.forEach((L) => { if (L.type === "text") measureText(L); }); this.render(); this.emit(); }

  seedSample() {
    const { W, H } = dims(this.geometry);
    const T: TextLayer = { id: this.uid++, type: "text", text: "Made by you", font: "script", color: "#FFFFFF", size: 150, w: 0, h: 0, x: W / 2, y: H * 0.66, s: 1, base: 1, rot: -0.08, flip: false };
    measureText(T); T.s = T.base = Math.min(1, (W * 0.82) / T.w);
    this.design = { bg: { kind: "pattern", id: "dusk" }, layers: [
      { id: this.uid++, type: "sticker", kind: "sparkle", color: "#FFD400", x: W * 0.7, y: H * 0.4, s: 0.8, base: 0.8, rot: 0, flip: false }, T] };
    this.sel = null;
  }

  /** Lowest effective dpi of any photo, for the blurry-print warning. */
  lowestPhotoDpi() {
    let min = Infinity;
    this.design.layers.forEach((L) => { if (L.type === "image") min = Math.min(min, 300 / L.s); });
    return min;
  }
}
