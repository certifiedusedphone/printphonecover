// Shared drawing code for the customizer preview, thumbnails and the print file.
// Everything is drawn in "print pixels": 300 dpi over the device's print area.

export const DPI = 300;
export const px = (mm: number) => (mm / 25.4) * DPI;

export type Device = { id: string; brand_id: string; name: string; series: string | null };
export type Product = { id: string; code: string; name: string; description: string; finish: "solid" | "clear" };
export type Variant = { id: string; device_id: string; product_id: string; price_cents: number; stock: number; mask: string | null };
export type Brand = { id: string; name: string; active: boolean };
export type Catalog = { brands: Brand[]; devices: Device[]; products: Product[]; variants: Variant[] };

export type Background = { kind: "color"; value: string } | { kind: "pattern"; id: string };
type Base = { id: number; x: number; y: number; s: number; base: number; rot: number; flip: boolean };
export type ImageLayer = Base & { type: "image"; imgId: string };
export type TextLayer = Base & { type: "text"; text: string; font: FontKey; color: string; size: number; w: number; h: number };
export type StickerLayer = Base & { type: "sticker"; kind: string; color: string };
export type Layer = ImageLayer | TextLayer | StickerLayer;
export type Design = { bg: Background; layers: Layer[] };

type Ctx = CanvasRenderingContext2D;

export const COLORS = ["#FFFFFF", "#17141C", "#E4007C", "#00A0E9", "#FFD400", "#FF6A13", "#2BB673", "#7B3FE4", "#F6B8CF", "#BFE3F2"];

export type FontKey = "bold" | "script" | "poster" | "clean";
export const FONTS: Record<FontKey, { label: string; css: string; weight: number }> = {
  bold: { label: "Bold", css: '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif', weight: 800 },
  script: { label: "Script", css: 'Pacifico, "Brush Script MT", cursive', weight: 400 },
  poster: { label: "Poster", css: '"Bebas Neue", Impact, sans-serif', weight: 400 },
  clean: { label: "Clean", css: "Inter, system-ui, sans-serif", weight: 600 },
};
export const fontStr = (L: TextLayer) => `${FONTS[L.font].weight} ${L.size}px ${FONTS[L.font].css}`;

let mctx: Ctx | null = null;
export function measureText(L: TextLayer) {
  if (!mctx) mctx = document.createElement("canvas").getContext("2d");
  if (!mctx) return;
  mctx.font = fontStr(L);
  const m = mctx.measureText(L.text || " ");
  L.w = Math.max(60, m.width + 24);
  L.h = L.size * 1.35;
}

/* ---------- Original background designs ---------- */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const PATTERNS: Record<string, { name: string; draw: (c: Ctx, W: number, H: number) => void }> = {
  dusk: { name: "Dusk", draw(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2B1055"); g.addColorStop(0.5, "#D3197A"); g.addColorStop(0.8, "#FF8A3D"); g.addColorStop(1, "#FFD25E"); c.fillStyle = g; c.fillRect(0, 0, W, H); } },
  halftone: { name: "Halftone", draw(c, W, H) { c.fillStyle = "#00A0E9"; c.fillRect(0, 0, W, H); const s = W / 12; c.fillStyle = "#E4007C"; for (let y = 0, row = 0; y < H + s; y += s * 0.866, row++) { for (let x = (row % 2) * s / 2; x < W + s; x += s) { const r = s * 0.06 + s * 0.42 * (y / H); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); } } } },
  waves: { name: "Waves", draw(c, W, H) { c.fillStyle = "#0E2A47"; c.fillRect(0, 0, W, H); const cols = ["#FFD400", "#FF6A13", "#E4007C", "#7B3FE4", "#00A0E9", "#2BB673", "#FFD400", "#FF6A13", "#E4007C"]; cols.forEach((col, i) => { const y0 = (H * (i + 0.6)) / cols.length; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += W / 40) c.lineTo(x, y0 + Math.sin((x / W) * Math.PI * 3 + i) * W * 0.05); c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill(); }); } },
  checker: { name: "Checker", draw(c, W, H) { const s = W / 5; for (let y = 0; y * s < H; y++) for (let x = 0; x * s < W; x++) { c.fillStyle = (x + y) % 2 ? "#17141C" : "#FFD400"; c.fillRect(x * s, y * s, s + 1, s + 1); } } },
  terrazzo: { name: "Terrazzo", draw(c, W, H) { c.fillStyle = "#EFEAF2"; c.fillRect(0, 0, W, H); const r = rng(7), cols = ["#E4007C", "#00A0E9", "#FFB000", "#2BB673", "#17141C"]; for (let i = 0; i < 170; i++) { const x = r() * W, y = r() * H, s = W * (0.015 + r() * 0.045); c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r() * 0.6, d = s * (0.5 + r() * 0.6); if (k) c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } c.closePath(); c.fillStyle = cols[i % cols.length]; c.fill(); } } },
  sunburst: { name: "Sunburst", draw(c, W, H) { const cx = W / 2, cy = H * 0.42, n = 28, R = H * 1.2; for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); c.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); c.closePath(); c.fillStyle = i % 2 ? "#FF8A1F" : "#FFD400"; c.fill(); } } },
};

/* ---------- Original stickers (300 × 300 box, centred on 0,0) ---------- */
function poly(c: Ctx, pts: number[][]) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
function starPts(n: number, ro: number, ri: number) { const p: number[][] = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? ri : ro; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
function outlineFill(c: Ctx, color: string) { c.lineJoin = "round"; c.lineWidth = 18; c.strokeStyle = "#FFFFFF"; c.stroke(); c.fillStyle = color; c.fill(); }
export const STICKERS: Record<string, { name: string; color: string; draw: (c: Ctx, col: string) => void }> = {
  star: { name: "Star", color: "#FFD400", draw(c, col) { poly(c, starPts(5, 140, 62)); outlineFill(c, col); } },
  heart: { name: "Heart", color: "#E4007C", draw(c, col) { c.beginPath(); c.moveTo(0, 125); c.bezierCurveTo(-190, 0, -115, -150, 0, -62); c.bezierCurveTo(115, -150, 190, 0, 0, 125); c.closePath(); outlineFill(c, col); } },
  bolt: { name: "Bolt", color: "#FF6A13", draw(c, col) { poly(c, [[35, -140], [-95, 25], [-12, 25], [-40, 140], [95, -35], [12, -35], [55, -140]]); outlineFill(c, col); } },
  sparkle: { name: "Sparkle", color: "#00A0E9", draw(c, col) { poly(c, starPts(4, 140, 34)); outlineFill(c, col); } },
  flower: { name: "Flower", color: "#F6B8CF", draw(c, col) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.moveTo(Math.cos(a) * 78 + 58, Math.sin(a) * 78); c.arc(Math.cos(a) * 78, Math.sin(a) * 78, 58, 0, Math.PI * 2); } outlineFill(c, col); c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.fillStyle = "#FFD400"; c.fill(); } },
  smile: { name: "Smile", color: "#FFD400", draw(c, col) { c.beginPath(); c.arc(0, 0, 132, 0, Math.PI * 2); outlineFill(c, col); c.fillStyle = "#17141C"; [-46, 46].forEach((x) => { c.beginPath(); c.ellipse(x, -34, 14, 22, 0, 0, Math.PI * 2); c.fill(); }); c.beginPath(); c.arc(0, 10, 72, 0.18 * Math.PI, 0.82 * Math.PI); c.lineWidth = 16; c.lineCap = "round"; c.strokeStyle = "#17141C"; c.stroke(); } },
};

/* ---------- Design rendering ---------- */
export type ImageStore = Record<string, HTMLImageElement>;

export function layerSize(L: Layer, images: ImageStore): [number, number] {
  if (L.type === "image") { const im = images[L.imgId]; return im ? [im.naturalWidth, im.naturalHeight] : [1, 1]; }
  if (L.type === "text") return [L.w, L.h];
  return [300, 300];
}

export function drawBg(c: Ctx, bg: Background, W: number, H: number) {
  if (bg.kind === "color") { c.fillStyle = bg.value; c.fillRect(0, 0, W, H); }
  else PATTERNS[bg.id]?.draw(c, W, H);
}

export function drawLayer(c: Ctx, L: Layer, images: ImageStore) {
  c.save();
  c.translate(L.x, L.y); c.rotate(L.rot); c.scale(L.s * (L.flip ? -1 : 1), L.s);
  if (L.type === "image") { const im = images[L.imgId]; if (im) c.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2); }
  else if (L.type === "text") { c.font = fontStr(L); c.fillStyle = L.color; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(L.text, 0, 0); }
  else STICKERS[L.kind]?.draw(c, L.color);
  c.restore();
}

export function drawDesign(c: Ctx, d: Design, images: ImageStore, W: number, H: number) {
  drawBg(c, d.bg, W, H);
  d.layers.forEach((L) => drawLayer(c, L, images));
}

/* ---------- Machine masks ----------
 * Each case uses the vending machine's own mask image (same pixel size as its print layout):
 *  - opaque pixels = camera, frame and edges drawn on top of the design
 *  - transparent pixels = where the design prints
 *  - white pixels touching the image edge = outside the case
 */
export type Template = {
  url: string; W: number; H: number;
  overlay: HTMLCanvasElement;   // mask with the outside made transparent
  inside: HTMLCanvasElement;    // opaque where the case is
  printable: HTMLCanvasElement; // opaque where ink goes
};

const cache = new Map<string, Promise<Template>>();

export function loadTemplate(url: string): Promise<Template> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<Template>((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { try { resolve(buildTemplate(url, im)); } catch (e) { reject(e); } };
      im.onerror = () => reject(new Error("Could not load the case outline. Check your connection and try again."));
      im.src = url;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

const canvas = (W: number, H: number) => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };

function buildTemplate(url: string, im: HTMLImageElement): Template {
  const W = im.naturalWidth, H = im.naturalHeight, N = W * H;
  const src = canvas(W, H), sx = src.getContext("2d", { willReadFrequently: true })!;
  sx.drawImage(im, 0, 0);
  const img = sx.getImageData(0, 0, W, H), d = img.data;

  // Flood-fill the white area that touches the image edge: that is outside the case.
  const out = new Uint8Array(N), stack = new Int32Array(N); let sp = 0;
  const white = (i: number) => d[i * 4 + 3] > 150 && d[i * 4] > 225 && d[i * 4 + 1] > 225 && d[i * 4 + 2] > 225;
  const push = (i: number) => { if (!out[i] && white(i)) { out[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (sp) {
    const i = stack[--sp], x = i % W;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
    if (i >= W) push(i - W); if (i < N - W) push(i + W);
  }

  const ov = new ImageData(new Uint8ClampedArray(d), W, H);
  const ins = new ImageData(W, H), pr = new ImageData(W, H);
  for (let i = 0; i < N; i++) {
    const j = i * 4;
    if (out[i]) { ov.data[j + 3] = 0; continue; }
    ins.data[j + 3] = 255;
    if (d[j + 3] < 128) pr.data[j + 3] = 255;
  }
  const put = (data: ImageData) => { const c = canvas(W, H); c.getContext("2d")!.putImageData(data, 0, 0); return c; };
  return { url, W, H, overlay: put(ov), inside: put(ins), printable: put(pr) };
}

let work: HTMLCanvasElement | null = null;
function workCanvas(W: number, H: number) {
  if (!work) work = canvas(W, H);
  if (work.width !== W || work.height !== H) { work.width = W; work.height = H; }
  return work;
}

/** Realistic case mock-up in template pixels: case base, design, then the machine overlay. */
export function drawCase(c: Ctx, T: Template, finish: "solid" | "clear", content: (c: Ctx, W: number, H: number) => void, shadow = 0) {
  const w = workCanvas(T.W, T.H), x = w.getContext("2d")!;
  x.globalCompositeOperation = "source-over";
  x.clearRect(0, 0, T.W, T.H);
  x.fillStyle = finish === "solid" ? "#FFFFFF" : "rgba(226,231,237,0.8)";
  x.fillRect(0, 0, T.W, T.H);
  x.save(); content(x, T.W, T.H); x.restore();
  x.globalCompositeOperation = "destination-in"; x.drawImage(T.inside, 0, 0);
  x.globalCompositeOperation = "source-over"; x.drawImage(T.overlay, 0, 0);
  c.save();
  if (shadow) { c.shadowColor = "rgba(12,6,24,.30)"; c.shadowBlur = shadow * 30; c.shadowOffsetY = shadow * 12; }
  c.drawImage(w, 0, 0);
  c.restore();
}

/** Print-ready PNG at the machine's layout size; ink only where the mask is open. */
export function renderPrintFile(T: Template, d: Design, images: ImageStore): Promise<Blob> {
  const cv = canvas(T.W, T.H), c = cv.getContext("2d")!;
  drawDesign(c, d, images, T.W, T.H);
  c.globalCompositeOperation = "destination-in"; c.drawImage(T.printable, 0, 0);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Could not create print file"))), "image/png"));
}

/** Small mock-up JPG for the admin list and the customer's order page. */
export function renderPreview(T: Template, finish: "solid" | "clear", d: Design, images: ImageStore): Promise<Blob> {
  const scale = 600 / T.H;
  const cv = canvas(Math.round(T.W * scale) + 20, 620), c = cv.getContext("2d")!;
  c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, cv.width, cv.height);
  c.translate(10, 10); c.scale(scale, scale);
  drawCase(c, T, finish, (cc, w, h) => drawDesign(cc, d, images, w, h));
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Could not create preview"))), "image/jpeg", 0.88));
}
