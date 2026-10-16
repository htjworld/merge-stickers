import { expect, test } from "vitest";
import { configSchema } from "../src/config/schema.js";
import { renderHeader, stats } from "../src/render/header.js";
import type { Item } from "../src/types.js";

const item = (id: string, repo: string, stars: number, o: Partial<Item> = {}): Item => ({
  id, key: `${repo}#${id}`, repo, owner: repo.split("/")[0]!, title: "t", url: "u", mergedAt: "2024-03-05T00:00:00Z", isPrivate: false,
  stars, language: null, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false, ...o,
});
const cfg = configSchema.parse({});

test("스타는 기여한 레포 기준으로 한 번씩만 합산하고 private은 뺀다", () => {
  const s = stats([item("1", "a/x", 1200), item("2", "a/x", 1200), item("3", "b/y", 8000), item("4", "", 99999, { isPrivate: true })], "Asia/Seoul");
  expect([s.merged, s.repos, s.owners, s.stars]).toEqual([4, 2, 2, "9.2K"]);
});

test("반듯한 실선(기울임, 점선 없음), 숫자 3색은 서로 다르고 라이트/다크가 같다", () => {
  const items = [item("1", "a/x", 5)];
  const light = renderHeader(items, cfg, false, "me"), dark = renderHeader(items, cfg, true, "me");
  for (const svg of [light, dark]) {
    expect(svg).not.toContain("rotate");
    expect(svg).not.toContain("dasharray");
  }
  const fills = (svg: string) => [...svg.matchAll(/font-weight="800" fill="(#\w+)"/g)].map((m) => m[1]);
  expect(new Set(fills(light)).size).toBe(3);
  expect(fills(light)).toEqual(fills(dark));
  expect(renderHeader(items, cfg, false, "me")).toBe(light); // 결정적
});

test("세 번째 통계는 설정으로 바꾼다", () => {
  const svg = renderHeader([item("1", "a/x", 5)], configSchema.parse({ header: { stat: "since" } }), false, "me");
  expect(svg).toContain(">SINCE<");
  expect(svg).toContain(">2024<");
});

test("버튼 아이콘은 직접 그린 도형이 아니라 Octicons path를 쓴다", async () => {
  const { renderButton } = await import("../src/render/header.js");
  const { ICONS } = await import("../src/render/icons.js");
  for (const kind of ["settings", "fetch"] as const) {
    const svg = renderButton(kind, cfg, false);
    for (const d of ICONS[kind]) expect(svg).toContain(`d="${d}"`);
  }
  expect(renderButton("settings", cfg, false)).toContain("M12 1c.266"); // gear
  expect(renderButton("fetch", cfg, false)).toContain("M3.38 8A9.502"); // sync
});
