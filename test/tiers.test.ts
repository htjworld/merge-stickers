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

test("같은 레포는 PR이 달라도 같은 스티커 (같은 단계일 때)", () => {
  const c = configSchema.parse({});
  expect(renderSticker(item("1"), c, "s", null, 3, 3)).toBe(renderSticker(item("2"), c, "s", null, 3, 3));
  expect(renderSticker(item("1"), c, "s", null, 3, 3)).not.toBe(renderSticker(item("1", "o/other"), c, "s", null, 3, 3));
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

test("레포마다 고유한 고정 색: 사용자/시드와 무관, 레포가 다르면 다른 색, 설정으로 덮어쓰기", async () => {
  const { repoColor } = await import("../src/render/tiers.js");
  expect(repoColor("python/cpython")).toBe(repoColor("python/cpython"));
  expect(repoColor("python/cpython")).toMatch(/^#[0-9A-F]{6}$/);
  const colors = new Set(Array.from({ length: 1000 }, (_, i) => repoColor(`owner${i}/repo${i}`)));
  expect(colors.size).toBe(1000);

  const c = configSchema.parse({});
  const border = (repo: string, seed: string, o = c) => renderSticker(item("1", repo), o, seed, null, 2, 2);
  expect(border("a/x", "alice")).toContain(repoColor("a/x")); // 컬러 단계 테두리 = 레포 고유색
  expect(border("a/x", "alice")).toBe(border("a/x", "alice"));
  expect(border("a/x", "alice")).toContain(repoColor("a/x") + '" stroke="' + repoColor("a/x"));
  expect(border("a/y", "alice")).not.toContain(repoColor("a/x"));
  expect(border("a/x", "bob")).toContain(repoColor("a/x")); // 시드가 달라도 같은 색
  expect(border("a/x", "alice", configSchema.parse({ stickers: { "a/x": { color: "#123456" } } }))).toContain("#123456");
});
