import { expect, test } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { runSet } from "../src/set.js";
import { configSchema } from "../src/config/schema.js";
import { applyPrivate } from "../src/curate/private.js";
import { renderHeader } from "../src/render/header.js";
import type { Item } from "../src/types.js";

const file = (body = "# 내 주석\nvisibility: public # 인라인\n") => {
  const p = join(mkdtempSync(join(tmpdir(), "ms-set-")), "config.yml");
  writeFileSync(p, body);
  return p;
};

test("set: 값을 바꾸되 주석은 보존, keep/빈 값은 무시, #색상은 문자열로", () => {
  const p = file();
  const msg = runSet(["visibility=private", "header.colors.merged=#FF8A1F", "theme=keep", "sticker.color=", "layout.columns=8"], p);
  expect(msg).toContain("visibility=private");
  const txt = readFileSync(p, "utf8");
  expect(txt).toContain("# 내 주석");
  expect(txt).toContain("# 인라인");
  const c = configSchema.parse(parse(txt));
  expect([c.visibility, c.header.colors.merged, c.layout.columns, c.theme]).toEqual(["private", "#FF8A1F", 8, "paper"]);
});

test("set: 잘못된 값은 거부하고 파일을 바꾸지 않는다", () => {
  const p = file();
  expect(() => runSet(["visibility=nope"], p)).toThrow(/설정 오류/);
  expect(() => runSet(["header.colors.repos=red"], p)).toThrow(/설정 오류/);
  expect(readFileSync(p, "utf8")).toBe("# 내 주석\nvisibility: public # 인라인\n");
});

const it = (id: string, isPrivate: boolean): Item => ({
  id, key: `o/${id}#1`, repo: `o/${id}`, owner: "o", title: "t", url: "u", mergedAt: "2024-01-01", isPrivate, stars: 10,
  language: null, imageUrl: null, avatarUrl: "a", source: "merged", aliases: [], gone: false,
});

test("visibility: private는 private만, public은 public만, all은 둘 다", () => {
  const items = [it("a", false), it("b", true)];
  const ids = (v: string, d = "mask") => applyPrivate(items, configSchema.parse({ visibility: v, private: { display: d } })).map((i) => i.id);
  expect(ids("public")).toEqual(["a"]);
  expect(ids("private")).toEqual(["b"]);
  expect(ids("all")).toEqual(["a", "b"]);
  expect(ids("private", "hide")).toEqual([]);
  const masked = applyPrivate(items, configSchema.parse({ visibility: "private" }))[0]!;
  expect(masked.repo).toBe(""); // private만 볼 때도 이름은 마스킹
});

test("헤더 숫자 색: 지정한 색은 그대로, auto는 지정색과 겹치지 않는 다른 색", () => {
  const cfg = configSchema.parse({ header: { colors: { merged: "#112233", repos: "auto", third: "auto" } } });
  const svg = renderHeader([it("a", false)], cfg, false, "me");
  const fills = [...svg.matchAll(/font-weight="800" fill="(#\w+)"/g)].map((m) => m[1]);
  expect(fills[0]).toBe("#112233");
  expect(new Set(fills).size).toBe(3);
  const all = configSchema.parse({ header: { colors: { merged: "#111111", repos: "#222222", third: "#333333" } } });
  expect([...renderHeader([it("a", false)], all, true, "me").matchAll(/font-weight="800" fill="(#\w+)"/g)].map((m) => m[1])).toEqual(["#111111", "#222222", "#333333"]);
});

test("sticker.color로 컬러 단계 테두리를 한 색으로 통일", async () => {
  const { renderSticker } = await import("../src/render/sticker.js");
  const svg = renderSticker(it("a", false), configSchema.parse({ sticker: { color: "#ABCDEF" } }), "s", null, 1, 3);
  expect(svg).toContain('fill="#ABCDEF" stroke="#ABCDEF"');
});
