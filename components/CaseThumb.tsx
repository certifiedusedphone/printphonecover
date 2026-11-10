"use client";
import { useEffect, useRef, useState } from "react";
import { drawCase, loadTemplate, type Template } from "@/lib/design/render";

type Draw = (c: CanvasRenderingContext2D, W: number, H: number) => void;

/** Small mock-up of a case using the machine's mask. Loads the mask itself if only a URL is given. */
export function CaseThumb({ mask, template, finish, content, width, height }: {
  mask?: string | null; template?: Template | null; finish: "solid" | "clear"; content: Draw; width: number; height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [T, setT] = useState<Template | null>(template ?? null);
  useEffect(() => {
    if (template) { setT(template); return; }
    if (!mask) return;
    let live = true;
    loadTemplate(mask).then((t) => live && setT(t)).catch(() => null);
    return () => { live = false; };
  }, [mask, template]);
  useEffect(() => {
    const cv = ref.current; if (!cv || !T) return;
    const d = window.devicePixelRatio || 1;
    cv.width = width * d; cv.height = height * d;
    const c = cv.getContext("2d")!; c.clearRect(0, 0, cv.width, cv.height);
    const s = Math.min((width - 4) / T.W, (height - 4) / T.H);
    c.setTransform(d * s, 0, 0, d * s, (d * (width - T.W * s)) / 2, (d * (height - T.H * s)) / 2);
    drawCase(c, T, finish, content, 0);
  }, [T, finish, content, width, height]);
  return <canvas ref={ref} style={{ width, height }} aria-hidden="true" />;
}

export function StickerThumb({ draw, color }: { draw: (c: CanvasRenderingContext2D, col: string) => void; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const d = window.devicePixelRatio || 1; cv.width = 64 * d; cv.height = 64 * d;
    const c = cv.getContext("2d")!; c.setTransform((d * 64) / 330, 0, 0, (d * 64) / 330, d * 32, d * 32); draw(c, color);
  }, [draw, color]);
  return <canvas ref={ref} style={{ width: 64, height: 64 }} aria-hidden="true" />;
}
