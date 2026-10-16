import { expect, test } from "vitest";
import { configSchema } from "../src/config/schema.js";
import { applyPrivate } from "../src/curate/private.js";
import { buildBoard, toTiles } from "../src/render/board.js";
import { injectReadme, START, END } from "../src/render/readme.js";
import type { Item } from "../src/types.js";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const item = (n: number, o: Partial<Item> = {}): Item => ({
  id: `PR_${n}`, key: `acme/${o.isPrivate ? "secret" : "open"}#${n}`, repo: `acme/${o.isPrivate ? "secret" : "open"}`, owner: "acme",
  title: `title ${n}`, url: `https://github.com/acme/open/pull/${n}`, mergedAt: `2024-01-${String(n).padStart(2, "0")}T00:00:00Z`,
  isPrivate: false, stars: 1, language: { name: "Go", color: "#00ADD8" }, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false, ...o,
});
const build = (items: Item[], c: object = {}) => {
  const cfg = configSchema.parse(c);
  return buildBoard(toTiles(items, cfg, "me", () => null), cfg, "me");
};

test("같은 입력이면 같은 출력, 클릭 링크는 PR로, 슬롯은 10의 배수까지", () => {
  const items = [item(1), item(2), item(3)];
  const pr = { layout: { groupBy: "pr" } };
  const a = build(items, pr), b = build(items, pr);
  expect(a.snippet).toBe(b.snippet);
  expect([...a.files]).toEqual([...b.files]);
  expect(a.snippet).toContain('<a href="https://github.com/acme/open/pull/2"');
  expect(a.snippet).toContain("slots/10-light.svg");
  expect(a.snippet).not.toContain("slots/11-");
  expect(a.snippet).not.toMatch(/<\/a>\s+<a|<\/picture>\s+<picture/); // 태그 사이 공백 금지
});

test("groupBy: repo는 레포당 1장 + 카운트 뱃지, 링크는 검색 결과", () => {
  const r = build([item(1), item(2), item(3)], { layout: { groupBy: "repo" } });
  expect(r.snippet).toContain("https://github.com/acme/open/pulls?q=is:pr+author:me+is:merged");
  expect([...r.files.keys()].filter((k) => k.startsWith("stickers/"))).toHaveLength(1);
  expect([...r.files.values()].some((s) => s.includes(">x3<"))).toBe(true);
  expect(r.files.get("header-light.svg")).toContain(">3<"); // 헤더의 머지 수는 PR 합계 (스티커 1장이어도 3)
  expect(r.snippet).toContain("3 merged PRs across 1 repos");
});

test("private mask: 어떤 산출물에도 레포 이름, 제목, PR 번호 링크가 남지 않는다", () => {
  const cfg = configSchema.parse({ visibility: "all" });
  const items = applyPrivate([item(1, { isPrivate: true, url: "https://github.com/acme/secret/pull/1", title: "top secret" }), item(2)], cfg);
  const r = build(items, { visibility: "all" });
  const all = r.snippet + [...r.files.values()].join("") + JSON.stringify(items.filter((i) => i.isPrivate));
  expect(all).not.toMatch(/secret/i);
});

test("README는 마커 사이만 바뀌고, 같은 내용이면 변경 없음", () => {
  const p = join(mkdtempSync(join(tmpdir(), "ms-")), "README.md");
  writeFileSync(p, `head\n${START}\nold\n${END}\ntail\n`);
  expect(injectReadme(p, "new")).toBe(true);
  expect(readFileSync(p, "utf8")).toBe(`head\n${START}\nnew\n${END}\ntail\n`);
  expect(injectReadme(p, "new")).toBe(false);
  writeFileSync(p, "no markers");
  expect(() => injectReadme(p, "x")).toThrow(/마커/);
});
