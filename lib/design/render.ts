// Shared drawing code for the customizer preview, thumbnails and the print file.
// Everything is drawn in "print pixels": 300 dpi over the device's print area.

export const DPI = 300;
export const px = (mm: number) => (mm / 25.4) * DPI;

export type Geometry = {
  w: number; h: number; r: number;
  cam: { x: number; y: number; w: number; h: number; r: number; lenses: [number, number, number][]; flash?: [number, number, number] | null };
};
export type Device = { id: string; brand_id: string; name: string; geometry: Geometry };
export type Product = { id: string; code: string; name: string; description: string; finish: "solid" | "clear" };
export type Variant = { id: string; device_id: string; product_id: string; price_cents: number; stock: number };
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

export const dims = (g: Geometry) => ({ W: Math.round(px(g.w)), H: Math.round(px(g.h)) });

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

export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}

export function printPath(c: Ctx, g: Geometry) {
  const { W, H } = dims(g), k = g.cam;
  c.beginPath();
  rr(c, 0, 0, W, H, px(g.r));
  rr(c, px(k.x), px(k.y), px(k.w), px(k.h), px(k.r));
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

export function drawCamera(c: Ctx, g: Geometry, finish: "solid" | "clear") {
  const k = g.cam;
  c.beginPath(); rr(c, px(k.x - 1), px(k.y - 1), px(k.w + 2), px(k.h + 2), px(k.r + 1));
  c.fillStyle = finish === "solid" ? "#1C1B20" : "rgba(220,228,236,.7)"; c.fill();
  c.beginPath(); rr(c, px(k.x), px(k.y), px(k.w), px(k.h), px(k.r));
  const g2 = c.createLinearGradient(px(k.x), px(k.y), px(k.x + k.w), px(k.y + k.h));
  g2.addColorStop(0, "#4A4850"); g2.addColorStop(1, "#2E2C33"); c.fillStyle = g2; c.fill();
  k.lenses.forEach(([lx, ly, lr]) => {
    const x = px(k.x + lx), y = px(k.y + ly), r = px(lr);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = "#1A1A1F"; c.fill();
    c.beginPath(); c.arc(x, y, r * 0.78, 0, Math.PI * 2); c.fillStyle = "#3D3C44"; c.fill();
    const lg = c.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.05, x, y, r * 0.6);
    lg.addColorStop(0, "#3B5A8C"); lg.addColorStop(1, "#07080D");
    c.beginPath(); c.arc(x, y, r * 0.6, 0, Math.PI * 2); c.fillStyle = lg; c.fill();
    c.beginPath(); c.arc(x - r * 0.22, y - r * 0.22, r * 0.1, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,.55)"; c.fill();
  });
  if (k.flash) { const [fx, fy, fr] = k.flash; c.beginPath(); c.arc(px(k.x + fx), px(k.y + fy), px(fr), 0, Math.PI * 2); c.fillStyle = "#EFE7D2"; c.fill(); }
}

/** Realistic case mock-up: body, printed surface, gloss, camera ring. */
export function drawCase(c: Ctx, g: Geometry, finish: "solid" | "clear", content: (c: Ctx, W: number, H: number) => void, shadow = 0) {
  const { W, H } = dims(g), f = px(1.6);
  c.save();
  if (shadow) { c.shadowColor = "rgba(12,6,24,.32)"; c.shadowBlur = shadow * 30; c.shadowOffsetY = shadow * 12; }
  c.beginPath(); rr(c, -f, -f, W + 2 * f, H + 2 * f, px(g.r) + f);
  c.fillStyle = finish === "solid" ? "#1C1B20" : "rgba(214,222,230,.6)"; c.fill();
  c.restore();
  if (finish === "clear") { c.lineWidth = f * 0.4; c.strokeStyle = "rgba(255,255,255,.85)"; c.stroke(); }
  c.save(); printPath(c, g); c.clip("evenodd");
  if (finish === "solid") { c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, H); }
  else { const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#D2CCC2"); gr.addColorStop(1, "#A7A196"); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  content(c, W, H);
  const gl = c.createLinearGradient(0, 0, W * 0.7, H * 0.45);
  gl.addColorStop(0, "rgba(255,255,255,.22)"); gl.addColorStop(0.5, "rgba(255,255,255,.04)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gl; c.fillRect(0, 0, W, H);
  c.restore();
  drawCamera(c, g, finish);
}

/** Print-ready PNG: exact print area at 300 dpi, camera cutout transparent. */
export function renderPrintFile(g: Geometry, d: Design, images: ImageStore): Promise<Blob> {
  const { W, H } = dims(g);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!;
  c.save(); printPath(c, g); c.clip("evenodd"); drawDesign(c, d, images, W, H); c.restore();
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Could not create print file"))), "image/png"));
}

/** Small mock-up JPG for the admin list and emails. */
export function renderPreview(g: Geometry, finish: "solid" | "clear", d: Design, images: ImageStore): Promise<Blob> {
  const { W, H } = dims(g), f = px(1.6), scale = 600 / (H + 2 * f);
  const cv = document.createElement("canvas"); cv.width = Math.round((W + 2 * f) * scale) + 20; cv.height = 620;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, cv.width, cv.height);
  c.translate(10 + f * scale, 10 + f * scale); c.scale(scale, scale);
  drawCase(c, g, finish, (cc, w, h) => drawDesign(cc, d, images, w, h));
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Could not create preview"))), "image/jpeg", 0.88));
}
