import { expect, test } from "vitest";
import { applyPrivate } from "../src/curate/private.js";
import { filterItems } from "../src/curate/filter.js";
import { configSchema } from "../src/config/schema.js";
import type { Item } from "../src/types.js";

const mk = (o: Partial<Item>): Item => ({
  id: "PR_1", key: "acme/secret#1", repo: "acme/secret", owner: "acme", title: "fix secret thing", url: "https://github.com/acme/secret/pull/1",
  mergedAt: "2024-01-01T00:00:00Z", isPrivate: true, stars: 5, language: { name: "Go", color: "#00ADD8" },
  imageUrl: "https://img", avatarUrl: "https://a", source: "merged", aliases: ["old/secret#1"], gone: false, ...o,
});

test("mask는 산출물 직렬화 어디에도 이름이 남지 않는다 (멱등)", () => {
  const cfg = configSchema.parse({ visibility: "all" });
  const out = applyPrivate(applyPrivate([mk({})], cfg), cfg);
  const s = JSON.stringify(out);
  for (const leak of ["acme", "secret", "old/", "github.com", "Go"]) expect(s).not.toContain(leak);
});

test("public은 private을 버리고, hide도 버린다", () => {
  expect(applyPrivate([mk({})], configSchema.parse({}))).toEqual([]);
  expect(applyPrivate([mk({})], configSchema.parse({ visibility: "all", private: { display: "hide" } }))).toEqual([]);
});

test("include.own, glob, alias 키, 사유별 카운트", () => {
  const cfg = configSchema.parse({ exclude: { repos: ["acme/*"], prs: ["old/x#9"] } });
  const items = [
    mk({ id: "a", isPrivate: false }),
    mk({ id: "b", isPrivate: false, owner: "me", repo: "me/r", key: "me/r#2" }),
    mk({ id: "c", isPrivate: false, owner: "z", repo: "z/r", key: "z/r#9", aliases: ["old/x#9"] }),
    mk({ id: "d", isPrivate: false, owner: "z", repo: "z/q", key: "z/q#1", aliases: [] }),
  ];
  const r = filterItems(items, cfg, "me");
  expect(r.items.map((i) => i.id)).toEqual(["d"]);
  expect(r.excluded).toEqual({ "exclude.repos": 1, "include.own": 1, "exclude.prs": 1 });
});
