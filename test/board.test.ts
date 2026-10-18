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
  const pr = {}; // 기본값이 PR마다 1장
  const a = build(items, pr), b = build(items, pr);
  expect(a.snippet).toBe(b.snippet);
  expect([...a.files]).toEqual([...b.files]);
  expect(a.snippet).toContain('<a href="https://github.com/acme/open/pull/2"');
  expect([...a.files.keys()].filter((k) => k.startsWith("stickers/"))).toHaveLength(3);
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

test("헤더 양옆 버튼: 왼쪽 설정, 오른쪽 fetch, 끄거나 레포를 모르면 없음", () => {
  const links = { settings: "https://github.com/o/o/edit/main/.merge-stickers/config.yml", fetch: "https://github.com/o/o/actions/workflows/merge-stickers.yml" };
  const mk = (c: object, b: typeof links | null) => {
    const cfg = configSchema.parse(c);
    return buildBoard(toTiles([item(1)], cfg, "me", () => null), cfg, "me", b);
  };
  const on = mk({}, links);
  expect(on.snippet).toContain(`<a href="${links.settings}" title="settings (owner only)">`);
  expect(on.snippet).toMatch(/align="left"[^>]*alt="settings"/);
  expect(on.snippet).toMatch(/align="right"[^>]*alt="fetch"/);
  expect(on.snippet.indexOf("alt=\"settings\"")).toBeLessThan(on.snippet.indexOf("alt=\"fetch\""));
  expect(on.snippet.indexOf("alt=\"fetch\"")).toBeLessThan(on.snippet.indexOf("merged PRs across")); // 같은 <p> 안, 헤더 앞
  expect([...on.files.keys()]).toEqual(expect.arrayContaining(["button-settings-light.svg", "button-settings-dark.svg", "button-fetch-light.svg", "button-fetch-dark.svg"]));
  expect(mk({}, null).snippet).not.toContain('alt="settings"');
  expect(mk({ header: { buttons: false } }, links).snippet).not.toContain('alt="fetch"');
});

test("로고는 Merge 배지와 STICKERS 글자로 그려지고 merge-stickers 저장소로 링크되며 header.logo=false면 빠진다", () => {
  const on = build([item(1)]);
  expect(on.snippet).toContain('<a href="https://github.com/htjworld/merge-stickers"');
  expect(on.files.get("logo-light.svg")).toContain('fill="#8250df"');
  expect(on.files.get("logo-light.svg")).toContain(">STICKERS</text>");
  expect(on.files.get("panel/logo-light.svg")).toContain('width="140"'); // 로고 크기는 그대로, 판 안에 들어간다
  const off = build([item(1)], { header: { logo: false } });
  expect(off.files.has("logo-light.svg")).toBe(false);
  expect([...off.files.keys()].some((k) => k.startsWith("panel/"))).toBe(false); // 판도 로고와 함께 빠진다
  expect(off.snippet).not.toContain("merge-stickers\"");
});

test("스티커판: 넓은 화면에서 보이는 그림만 더하면 모든 줄이 판 폭이고, 테마 조건은 화면폭 조건과 묶지 않는다", () => {
  const links = { settings: "s", fetch: "f" };
  // 판 위 그림(panel/)만 넓은 화면에 보인다. 크기는 img width, 없으면 SVG 자체 width
  const widths = (r: ReturnType<typeof build>) => r.snippet.split("<br>").slice(1).map((line) =>
    [...line.matchAll(/<img src="[^"]*?\/(panel\/[^"?]+)[^"]*"([^>]*)>/g)].reduce((n, [, f, rest]) =>
      n + Number((rest!.match(/width="([\d.]+)"/) ?? r.files.get(f!)!.match(/width="([\d.]+)"/))![1]), 0));
  for (const [c, b] of [[{}, null], [{}, links], [{ layout: { columns: 4, slots: "none" } }, links]] as const) {
    const cfg = configSchema.parse(c);
    const r = buildBoard(toTiles([1, 2, 3, 4, 5].map((n) => item(n)), cfg, "me", () => null), cfg, "me", b);
    const f = Math.max(cfg.layout.columns * 72, b ? 568 : 480) + 64;
    expect(new Set(widths(r))).toEqual(new Set([f]));
    expect(r.snippet).toContain(`media="(max-width: ${f + 433.98}px)"`);
    expect(r.snippet).not.toMatch(/media="[^"]*\band\b[^"]*"/);
    expect(r.snippet).toContain('srcset="https://raw.githubusercontent.com/htjworld/merge-stickers/main/assets/none.png 1000x"'); // 숨김은 1x1 PNG를 1000배 밀도로
  }
  expect([...build([item(1)], { layout: { columns: 20 } }).files.keys()].some((k) => k.startsWith("panel/"))).toBe(false); // README보다 넓으면 판을 안 그린다
});
