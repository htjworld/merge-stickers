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
