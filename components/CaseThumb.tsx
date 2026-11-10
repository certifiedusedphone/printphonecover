"use client";
import { useEffect, useRef } from "react";
import { drawCase, dims, px, type Geometry } from "@/lib/design/render";

type Draw = (c: CanvasRenderingContext2D, W: number, H: number) => void;

/** Small canvas mock-up of a case, used in the phone, case and design pickers. */
export function CaseThumb({ geometry, finish, content, width, height }: { geometry: Geometry; finish: "solid" | "clear"; content: Draw; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const d = window.devicePixelRatio || 1;
    cv.width = width * d; cv.height = height * d;
    const c = cv.getContext("2d")!; c.clearRect(0, 0, cv.width, cv.height);
    const { W, H } = dims(geometry), f = px(1.6), s = Math.min((width - 6) / (W + 2 * f), (height - 6) / (H + 2 * f));
    c.setTransform(d * s, 0, 0, d * s, (d * (width - W * s)) / 2, (d * (height - H * s)) / 2);
    drawCase(c, geometry, finish, content, 0);
  }, [geometry, finish, content, width, height]);
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
