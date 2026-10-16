import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import type { Config } from "../config/schema.js";
import { styleKeys } from "../curate/filter.js";
import type { Item } from "../types.js";

export const CACHE_DIR = ".merge-stickers/cache";
const SIZE = 120;
// README/소셜 이미지는 스티커(정사각형)로 크롭되므로 로고처럼 정사각형에 가까운 것만 쓴다.
// 스크린샷(16:9)이나 배너(2:1)는 잘리면 의미가 없어서 건너뛰고 다음 후보(아바타)로 간다.
export const MIN_ASPECT = 0.6;
export const MAX_ASPECT = 1.6;
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

/** 아직 캐시에 없는 URL만 받는다. 실패나 부적합(strict에서 비율 초과)은 "fail", 부적합은 .skip 표시로 다시 받지 않는다. */
export async function download(url: string, strict = false): Promise<"hit" | "new" | "fail"> {
  if (cached(url)) return "hit";
  const skip = cachePath(url, "skip");
  if (strict && existsSync(skip)) return "fail";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "merge-stickers" } });
    if (!res.ok) return "fail";
    const raw = Buffer.from(await res.arrayBuffer());
    if (strict) {
      const m = await sharp(raw).metadata();
      const r = (m.width ?? 1) / (m.height ?? 1);
      if (r < MIN_ASPECT || r > MAX_ASPECT) {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(skip, "");
        return "fail";
      }
    }
    const { buf, ext } = await shrink(raw);
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath(url, ext), buf);
    return "new";
  } catch {
    return "fail";
  }
}

/**
 * 어떤 이미지를 쓸지, 우선순위 순 후보 (plan 3.4).
 * auto: stickers 지정 > README 첫 이미지 > 커스텀 소셜 프리뷰 > 오너 아바타 > (없으면 폴백 스티커)
 */
export function imageSource(item: Item, cfg: Config): { urls: string[]; strict: string[]; local: string | null } {
  const local = cfg.stickers[styleKeys(item).find((k) => cfg.stickers[k]?.image) ?? ""]?.image ?? null;
  if (local) return { urls: [], strict: [], local };
  const by = { readme: item.readmeImage, social: item.imageUrl, avatar: item.avatarUrl };
  const order = { auto: ["readme", "social", "avatar"], readme: ["readme", "avatar"], social: ["social", "avatar"], avatar: ["avatar"], language: [] } as const;
  const keys = order[cfg.sticker.image];
  return {
    urls: keys.flatMap((k) => by[k] || []),
    strict: keys.filter((k) => k !== "avatar").flatMap((k) => by[k] || []), // 아바타는 항상 정사각형이라 검사 불필요
    local: null,
  };
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
  if (s.local) return loadLocal(s.local);
  for (const u of s.urls) {
    const c = cached(u);
    if (c) return c;
  }
  return null;
}

/** 후보 목록마다 앞에서부터 하나 받아질 때까지 시도. 병렬 6개씩. 반환: 새로 받은 수, 캐시 적중, 전부 실패한 수 */
export async function downloadAll(srcs: { urls: string[]; strict: string[] }[]) {
  const stat = { new: 0, fail: 0, hit: 0 };
  const one = async ({ urls, strict }: { urls: string[]; strict: string[] }) => {
    for (const u of urls) {
      const r = await download(u, strict.includes(u));
      if (r !== "fail") return r;
    }
    return urls.length ? "fail" : null;
  };
  const uniq = [...new Map(srcs.map((l) => [l.urls.join("|"), l])).values()];
  for (let i = 0; i < uniq.length; i += 6) {
    for (const r of await Promise.all(uniq.slice(i, i + 6).map(one))) if (r) stat[r]++;
  }
  return stat;
}
