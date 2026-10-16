import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Item, Merges } from "./types.js";

export const MERGES_PATH = ".merge-stickers/merges.json";

export function readMerges(path = MERGES_PATH): Merges | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Merges) : null;
}

/**
 * 이번 수집분(fresh)과 이전 저장분(prev)을 합친다.
 * - 이전에 있었는데 사라진 항목은 지우지 않고 gone: true (plan 4.2)
 * - 같은 id인데 key가 바뀌었으면 예전 key를 aliases에 쌓는다 (plan 4.8)
 * - mergedAt, id 순 안정 정렬
 */
export function mergeItems(prev: Item[], fresh: Item[]): Item[] {
  const old = new Map(prev.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const out = fresh.map((i) => {
    seen.add(i.id);
    const p = old.get(i.id);
    const aliases = new Set([...(p?.aliases ?? []), ...(p && p.key !== i.key ? [p.key] : [])]);
    return { ...i, aliases: [...aliases].sort(), source: p?.source ?? i.source };
  });
  for (const p of prev) if (!seen.has(p.id)) out.push({ ...p, gone: true });
  return out.sort((a, b) => a.mergedAt.localeCompare(b.mergedAt) || a.id.localeCompare(b.id));
}

/** 내용이 같으면 파일을 건드리지 않는다 (generatedAt 제외 비교). 바뀌었으면 true. */
export function writeMerges(m: Merges, path = MERGES_PATH): boolean {
  const prev = readMerges(path);
  if (prev && prev.user === m.user && JSON.stringify(prev.items) === JSON.stringify(m.items)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(m, null, 2) + "\n");
  return true;
}
