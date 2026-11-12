"use client";
import { PATTERNS, STICKERS } from "@/lib/design/render";
import { CaseThumb } from "./CaseThumb";

const sample = (c: CanvasRenderingContext2D, W: number, H: number) => {
  PATTERNS.dusk.draw(c, W, H);
  c.save(); c.translate(W * 0.68, H * 0.42); c.scale(W / 900, W / 900); STICKERS.sparkle.draw(c, "#FFD400"); c.restore();
};
const clear = (c: CanvasRenderingContext2D, W: number, H: number) => {
  c.save(); c.translate(W / 2, H * 0.58); c.scale(W / 520, W / 520); STICKERS.heart.draw(c, "#E4007C"); c.restore();
};

/** Real machine-mask preview of a case, for the SEO model pages. */
export function ModelPreview({ mask, finish, width = 200, height = 340 }: { mask: string | null; finish: "solid" | "clear"; width?: number; height?: number }) {
  return <CaseThumb mask={mask} finish={finish} content={finish === "solid" ? sample : clear} width={width} height={height} />;
}
