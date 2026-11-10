import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { adminDenied } from "@/lib/server/require-admin";

// Copies the machine's mask images into our own public "masks" bucket, a few per call
// (Cloudflare limits outgoing requests per call). The admin page calls this until remaining = 0.
const BATCH = 6;

function pngSize(buf: ArrayBuffer) {
  const v = new DataView(buf);
  const sig = [0x89, 0x50, 0x4e, 0x47];
  if (buf.byteLength < 24 || sig.some((b, i) => v.getUint8(i) !== b)) throw new Error("Not a PNG file");
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

export async function POST() {
  const denied = await adminDenied(); if (denied) return denied;
  const s = db();
  const { data: rows, error } = await s.from("variants").select("id,mask_src").is("mask_url", null).not("mask_src", "is", null).limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const failed: string[] = [];
  for (const v of rows ?? []) {
    try {
      const res = await fetch(v.mask_src as string);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const buf = await res.arrayBuffer();
      const { w, h } = pngSize(buf);
      const path = `${v.id}.png`;
      const up = await s.storage.from("masks").upload(path, buf, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      const url = s.storage.from("masks").getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
      const r = await s.from("variants").update({ mask_url: url, mask_w: w, mask_h: h }).eq("id", v.id);
      if (r.error) throw r.error;
    } catch (e) {
      failed.push(`${v.id}: ${(e as Error).message}`);
    }
  }
  const { count } = await s.from("variants").select("id", { count: "exact", head: true }).is("mask_url", null).not("mask_src", "is", null);
  return NextResponse.json({ copied: (rows?.length ?? 0) - failed.length, failed, remaining: count ?? 0 });
}
