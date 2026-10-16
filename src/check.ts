import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config/schema.js";
import { idsOf } from "./curate/filter.js";
import { readMerges } from "./store.js";

const MAX_SVG = 30 * 1024; // 이미지 예산 15KB(base64 약 20KB) + 장식 여유

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** CI용 검사 (plan 7). 오류가 있으면 throw해서 종료 코드가 1이 된다. */
export function runCheck(cfg: Config): string {
  const merges = readMerges();
  if (!merges) throw new Error("merges.json이 없습니다. 먼저 `merge-stickers fetch`를 실행하세요.");
  const errors: string[] = [];
  const warns: string[] = [];

  // 1. private 누출: 마스킹/숨김 설정인데 merges.json에 이름이 남아 있으면 안 된다
  if (cfg.visibility === "public" || cfg.private.display !== "show") {
    const leaked = merges.items.filter((i) => i.isPrivate && (i.repo || i.title || i.url || i.avatarUrl));
    if (leaked.length) errors.push(`private 항목 ${leaked.length}건에 이름/제목/링크가 남아 있음 (merges.json). fetch를 다시 실행하세요.`);
    const loose = merges.items.filter((i) => i.isPrivate && cfg.visibility === "public");
    if (loose.length) errors.push(`visibility: public인데 private 항목 ${loose.length}건이 merges.json에 있음`);
  }

  // 2. config 키가 아무것에도 안 맞는 경우 (레포 이름 변경 등) (plan 4.8)
  const known = new Set(merges.items.flatMap((i) => idsOf(i).map((k) => k.toLowerCase())));
  for (const k of [...Object.keys(cfg.stickers), ...cfg.exclude.prs])
    if (!known.has(k.toLowerCase())) warns.push(`config 키가 어떤 PR과도 맞지 않음: ${k}`);

  // 3. 용량, 그리고 마스킹 설정에서 산출물에 private 흔적(자물쇠가 아닌데 링크 없는 스티커 등)은 위에서 이미 차단
  let svgs = 0;
  for (const p of walk(cfg.output.dir)) {
    if (!p.endsWith(".svg")) continue;
    svgs++;
    const size = statSync(p).size;
    if (size > MAX_SVG) errors.push(`용량 초과 ${(size / 1024).toFixed(1)}KB > ${MAX_SVG / 1024}KB: ${p}`);
  }

  // 4. 링크가 비어 있는 공개 항목
  const broken = merges.items.filter((i) => !i.isPrivate && !i.gone && !i.url);
  if (broken.length) warns.push(`링크가 없는 공개 항목 ${broken.length}건`);

  // 5. README 마커
  if (existsSync(cfg.output.readme) && !readFileSync(cfg.output.readme, "utf8").includes("<!--MERGE-STICKERS:START-->"))
    warns.push(`${cfg.output.readme}에 마커가 없음`);

  const lines = [...errors.map((e) => `오류: ${e}`), ...warns.map((w) => `경고: ${w}`), `SVG ${svgs}개 검사`];
  if (errors.length) throw new Error(lines.join("\n"));
  return lines.join("\n") + "\n검사 통과";
}
