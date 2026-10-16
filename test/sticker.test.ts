import { expect, test } from "vitest";
import { configSchema } from "../src/config/schema.js";
import { renderSticker } from "../src/render/sticker.js";
import type { Item } from "../src/types.js";

const item = (id: string, o: Partial<Item> = {}): Item => ({
  id, key: `o/r#${id}`, repo: "o/r", owner: "o", title: "t", url: "u", mergedAt: "2024-01-01", isPrivate: false,
  stars: 0, language: { name: "Go", color: "#00ADD8" }, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false, ...o,
});
const cfg = configSchema.parse({});

test("같은 입력이면 같은 출력, 다른 레포면 다른 출력", () => {
  expect(renderSticker(item("1"), cfg, "s", null)).toBe(renderSticker(item("1"), cfg, "s", null));
  expect(renderSticker(item("1"), cfg, "s", null)).not.toBe(renderSticker(item("2", { repo: "o/other" }), cfg, "s", null));
});

test("variation 0이면 회전, 흔들림 없이 모두 같은 정렬", () => {
  const c = configSchema.parse({ sticker: { variation: 0 } });
  const svg = renderSticker(item("1"), c, "s", null);
  expect(svg).toContain("translate(0 0)");
  expect(svg).toContain("rotate(0)");
});

test("개별 스티커 override가 적용되고, 마스킹된 private은 이름이 새지 않는다", () => {
  const c = configSchema.parse({ stickers: { "o/r#1": { shape: "shield", finish: "foil" } } });
  const svg = renderSticker(item("1"), c, "s", null);
  expect(svg).toContain("url(#foil)");
  expect(svg).toContain("M48,17L76,26");
  const masked = renderSticker(item("9", { isPrivate: true, repo: "", key: "private#9" }), cfg, "s", null);
  expect(masked).not.toContain(">O<");
});
