import { expect, test, vi } from "vitest";
import { join } from "node:path";
import sharp from "sharp";
import { shrink, imageSource } from "../src/assets/image.js";
import { configSchema } from "../src/config/schema.js";
import type { Item } from "../src/types.js";

test("큰 이미지도 120px 정사각, 용량 예산 안으로 줄어든다", async () => {
  // 노이즈가 섞인 큰 이미지 (PNG 팔레트로는 예산을 넘기기 쉬움)
  const raw = Buffer.alloc(800 * 400 * 3).map(() => Math.random() * 255);
  const input = await sharp(raw, { raw: { width: 800, height: 400, channels: 3 } }).png().toBuffer();
  const { buf } = await shrink(input);
  const m = await sharp(buf).metadata();
  expect([m.width, m.height]).toEqual([120, 120]);
  expect(buf.length).toBeLessThanOrEqual(15 * 1024);
});

test("이미지 선택: 지정 > README 첫 이미지 > 커스텀 소셜 > 아바타, 마스킹이면 없음", () => {
  const it = { id: "1", key: "o/r#1", repo: "o/r", aliases: [], readmeImage: "readme", imageUrl: "social", avatarUrl: "avatar" } as unknown as Item;
  const cfg = configSchema.parse({});
  expect(imageSource(it, cfg).urls).toEqual(["readme", "social", "avatar"]);
  expect(imageSource({ ...it, readmeImage: null, imageUrl: null }, cfg).urls).toEqual(["avatar"]);
  expect(imageSource(it, configSchema.parse({ sticker: { image: "social" } })).urls).toEqual(["social", "avatar"]);
  expect(imageSource(it, configSchema.parse({ stickers: { "o/r": { image: "./x.png" } } })).local).toBe("./x.png");
  expect(imageSource({ ...it, readmeImage: null, imageUrl: null, avatarUrl: "" }, cfg).urls).toEqual([]);
});

test("README/소셜 이미지는 정사각형에 가까울 때만 쓰고, 스크린샷은 건너뛴다 (다시 받지 않음)", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { download } = await import("../src/assets/image.js");
  const cwd = process.cwd();
  process.chdir(mkdtempSync(join(tmpdir(), "ms-img-")));
  const png = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: "#369" } }).png().toBuffer();
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (u: string) => {
    calls.push(u);
    return new Response(await png(u.includes("wide") ? 1920 : 800, u.includes("wide") ? 1080 : 900));
  });
  try {
    expect(await download("https://x/wide.png", true)).toBe("fail"); // 16:9 스크린샷
    expect(await download("https://x/wide.png", true)).toBe("fail");
    expect(calls).toHaveLength(1); // 두 번째는 .skip 표시 때문에 네트워크 없음
    expect(await download("https://x/logo.png", true)).toBe("new"); // 0.89 로고
    expect(await download("https://x/wide.png", false)).toBe("new"); // 아바타 같은 비검사 후보
  } finally {
    vi.unstubAllGlobals();
    process.chdir(cwd);
  }
});
