import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import type { Config } from "../config/schema.js";
import { idsOf } from "../curate/filter.js";
import type { Item } from "../types.js";

export const CACHE_DIR = ".merge-stickers/cache";
const SIZE = 120;
const BUDGET = 15 * 1024; // 스티커 1장당 이미지 용량 예산 (plan 3.4)

/** 원본 URL 하나당 캐시 파일 하나. 레포가 같으면 URL이 같아 자연히 레포 단위 캐시가 된다. */
const cachePath = (url: string, ext: string) => join(CACHE_DIR, createHash("sha1").update(url).digest("hex").slice(0, 16) + "." + ext);
const toUri = (buf: Buffer, mime: string) => `data:${mime};base64,${buf.toString("base64")}`;

/** 정사각 크롭 후 예산 안에 들 때까지 PNG(팔레트) → JPEG 품질을 낮춰 본다. */
export async function shrink(input: Buffer): Promise<{ buf: Buffer; ext: "png" | "jpg" }> {
  const base = () => sharp(input).resize(SIZE, SIZE, { fit: "cover" });
  let buf = await base().png({ palette: true, quality: 80, colours: 128 }).toBuffer();
  if (buf.length <= BUDGET) return { buf, ext: "png" };
  for (const q of [75, 60, 45]) {
    buf = await base().flatten({ background: "#fff" }).jpeg({ quality: q }).toBuffer();
    if (buf.length <= BUDGET) break;
  }
  return { buf, ext: "jpg" };
}

/** 캐시에서만 읽는다. 오프라인 render용. */
export function cached(url: string | null): string | null {
  if (!url) return null;
  for (const [ext, mime] of [["png", "image/png"], ["jpg", "image/jpeg"]] as const) {
    const p = cachePath(url, ext);
    if (existsSync(p)) return toUri(readFileSync(p), mime);
  }
  return null;
}

/** 아직 캐시에 없는 URL만 받는다. 실패는 null (폴백 스티커로 대체). */
export async function download(url: string): Promise<"hit" | "new" | "fail"> {
  if (cached(url)) return "hit";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "merge-stickers" } });
    if (!res.ok) return "fail";
    const { buf, ext } = await shrink(Buffer.from(await res.arrayBuffer()));
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath(url, ext), buf);
    return "new";
  } catch {
    return "fail";
  }
}

/** 어떤 이미지를 쓸지: stickers 지정 → social → avatar → (없으면 폴백) (plan 3.4) */
export function imageSource(item: Item, cfg: Config): { url: string | null; local: string | null } {
  const local = cfg.stickers[idsOf(item).find((k) => cfg.stickers[k]?.image) ?? ""]?.image ?? null;
  if (local) return { url: null, local };
  const mode = cfg.sticker.image;
  if (mode === "language") return { url: null, local: null };
  const url = mode === "avatar" ? item.avatarUrl : item.imageUrl ?? item.avatarUrl;
  return { url: url || null, local: null };
}

/** 로컬 이미지는 캐시 없이 그때그때 가공한다 (render는 네트워크 없이 동작). */
export async function loadLocal(path: string): Promise<string | null> {
  try {
    const { buf, ext } = await shrink(readFileSync(path));
    return toUri(buf, ext === "png" ? "image/png" : "image/jpeg");
  } catch {
    return null;
  }
}

export async function imageFor(item: Item, cfg: Config): Promise<string | null> {
  const s = imageSource(item, cfg);
  return s.local ? loadLocal(s.local) : cached(s.url);
}

/** 병렬 6개씩 받는다. 반환: 새로 받은 수, 실패한 수 */
export async function downloadAll(urls: string[]) {
  const todo = [...new Set(urls)];
  const stat = { new: 0, fail: 0, hit: 0 };
  for (let i = 0; i < todo.length; i += 6) {
    for (const r of await Promise.all(todo.slice(i, i + 6).map(download))) stat[r]++;
  }
  return stat;
}
