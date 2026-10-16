import { afterEach, beforeEach, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configSchema } from "../src/config/schema.js";
import { runCheck } from "../src/check.js";

const cwd = process.cwd();
beforeEach(() => process.chdir(mkdtempSync(join(tmpdir(), "ms-check-"))));
afterEach(() => process.chdir(cwd));

const merges = (items: object[]) => {
  mkdirSync(".merge-stickers", { recursive: true });
  writeFileSync(".merge-stickers/merges.json", JSON.stringify({ generatedAt: "", user: "me", items }));
};
const it = (o: object) => ({ id: "1", key: "a/b#1", repo: "a/b", title: "t", url: "u", avatarUrl: "", isPrivate: false, aliases: [], gone: false, ...o });

test("마스킹 설정에서 private 이름이 남아 있으면 실패", () => {
  merges([it({ isPrivate: true })]);
  expect(() => runCheck(configSchema.parse({ visibility: "all" }))).toThrow(/private 항목 1건/);
});

test("정상이면 통과하고, 안 맞는 config 키는 경고", () => {
  merges([it({})]);
  const out = runCheck(configSchema.parse({ stickers: { "x/y#9": { shape: "circle" } } }));
  expect(out).toContain("경고: config 키가 어떤 PR과도 맞지 않음: x/y#9");
  expect(out).toContain("검사 통과");
});

test("용량 초과 SVG는 실패", () => {
  merges([it({})]);
  mkdirSync("assets/merge-stickers", { recursive: true });
  writeFileSync("assets/merge-stickers/big.svg", "x".repeat(31 * 1024));
  expect(() => runCheck(configSchema.parse({}))).toThrow(/용량 초과/);
});
