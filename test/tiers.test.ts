import { expect, test } from "vitest";
import { configSchema } from "../src/config/schema.js";
import { renderSticker } from "../src/render/sticker.js";
import { tierFor } from "../src/render/tiers.js";
import type { Item } from "../src/types.js";

const th = configSchema.parse({}).sticker.thresholds;
const item = (id: string, repo = "o/r"): Item => ({
  id, key: `${repo}#${id}`, repo, owner: "o", title: "t", url: "u", mergedAt: "2024-01-01", isPrivate: false,
  stars: 0, language: { name: "Go", color: "#00ADD8" }, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false,
});

test("단계: 1 흰색, 2~9 컬러, 10 동, 20 은, 30 금, 40 플래티넘, 50 다이아", () => {
  const t = [1, 2, 9, 10, 19, 20, 30, 40, 50, 99].map((n) => tierFor(n, th));
  expect(t).toEqual(["white", "color", "color", "bronze", "bronze", "silver", "gold", "platinum", "diamond", "diamond"]);
});

test("같은 레포는 PR이 달라도 같은 모양, 각도, 위치 (색만 다름)", () => {
  const c = configSchema.parse({});
  const geo = (svg: string) => [svg.match(/<g transform="[^"]*" filter/)![0], svg.match(/<clipPath id="c"><path d="([^"]*)"/)![1]];
  const a = renderSticker(item("1"), c, "s", null, 1, 3), b = renderSticker(item("2"), c, "s", null, 1, 3);
  expect(geo(a)).toEqual(geo(b));
  expect(a).not.toBe(b); // 컬러 단계 테두리색은 스티커마다 다르다
  expect(geo(renderSticker(item("1"), c, "s", null, 1, 3))).not.toEqual(geo(renderSticker(item("1", "o/other"), c, "s", null, 1, 3)));
});

test("메탈 단계는 글로우와 반짝임, animate:false면 애니메이션 없음", () => {
  const svg = renderSticker(item("1"), configSchema.parse({}), "s", null, 10, 10);
  expect(svg).toContain('id="glow"');
  expect(svg).toContain("@keyframes");
  const still = renderSticker(item("1"), configSchema.parse({ sticker: { animate: false } }), "s", null, 10, 10);
  expect(still).not.toContain("@keyframes");
  expect(renderSticker(item("1"), configSchema.parse({}), "s", null, 5, 5)).not.toContain('id="glow"');
});

test("설정으로 전체/레포별/PR별 단계를 강제하고, 기준 개수를 바꿀 수 있다", () => {
  const all = configSchema.parse({ sticker: { tier: "diamond" } });
  expect(renderSticker(item("1"), all, "s", null, 1, 1)).toContain("#66E0FF");
  const repo = configSchema.parse({ stickers: { "o/r": { tier: "gold" } } });
  expect(renderSticker(item("1"), repo, "s", null, 1, 1)).toContain("#FFD54A");
  expect(renderSticker(item("1", "o/x"), repo, "s", null, 1, 1)).not.toContain("#FFD54A");
  expect(tierFor(3, configSchema.parse({ sticker: { thresholds: { bronze: 3 } } }).sticker.thresholds)).toBe("bronze");
});

test("스티커마다 고유한 고정 색: 같은 레포의 다른 PR도 다른 색, 같은 PR은 항상 같은 색, 시드 무관, 설정으로 덮어쓰기", async () => {
  const { stickerColor } = await import("../src/render/tiers.js");
  expect(stickerColor("PR_1")).toBe(stickerColor("PR_1"));
  expect(stickerColor("PR_1")).toMatch(/^#[0-9A-F]{6}$/);
  expect(new Set(Array.from({ length: 1000 }, (_, i) => stickerColor(`PR_kwDO${i}`))).size).toBe(1000);

  const c = configSchema.parse({});
  const sticker = (id: string, repo: string, seed = "alice", o = c) => renderSticker(item(id, repo), o, seed, null, 1, 2);
  expect(sticker("1", "python/cpython")).toContain(stickerColor("1")); // 컬러 단계 테두리 = PR 고유색
  expect(sticker("1", "python/cpython")).not.toContain(stickerColor("2"));
  expect(sticker("1", "python/cpython")).toContain(stickerColor("1") + '" stroke="' + stickerColor("1"));
  expect(sticker("2", "python/cpython")).toContain(stickerColor("2")); // 같은 레포, 다른 PR = 다른 색
  expect(sticker("1", "spring-projects/spring-boot")).toContain(stickerColor("1"));
  expect(sticker("1", "python/cpython", "bob")).toContain(stickerColor("1")); // 시드가 달라도 같은 색
  expect(sticker("1", "python/cpython", "alice", configSchema.parse({ stickers: { "python/cpython": { color: "#123456" } } }))).toContain("#123456");
  // 1번째(흰색)와 메탈 단계는 고유색을 쓰지 않는다
  expect(renderSticker(item("1"), c, "s", null, 1, 1)).not.toContain(stickerColor("1"));
  expect(renderSticker(item("1"), c, "s", null, 1, 10)).not.toContain(stickerColor("1"));
});
