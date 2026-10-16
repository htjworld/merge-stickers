import { expect, test } from "vitest";
import { mergeItems } from "../src/store.js";
import type { Item } from "../src/types.js";

const item = (id: string, key: string, mergedAt: string): Item => ({
  id, key, repo: key.split("#")[0]!, owner: "o", title: "t", url: "u", mergedAt, isPrivate: false,
  stars: 0, language: null, imageUrl: null, avatarUrl: "a", source: "merged", aliases: [], gone: false,
});

test("사라진 항목은 gone으로 보존, 이름 변경은 alias로 누적, 정렬은 안정적", () => {
  const prev = [item("1", "old/repo#1", "2024-02-01"), item("2", "x/y#2", "2024-01-01")];
  const fresh = [item("1", "new/repo#1", "2024-02-01")];
  const out = mergeItems(prev, fresh);
  expect(out.map((i) => i.id)).toEqual(["2", "1"]);
  expect(out[0]!.gone).toBe(true);
  expect(out[1]!.aliases).toEqual(["old/repo#1"]);
  expect(mergeItems(out, fresh)).toEqual(out);
});
