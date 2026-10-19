import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config/schema.js";
import { styleKeys } from "./curate/filter.js";
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
  if (!merges) throw new Error("merges.json not found. Run `merge-stickers fetch` first.");
  const errors: string[] = [];
  const warns: string[] = [];

  // 1. private 누출: 마스킹/숨김 설정인데 merges.json에 이름이 남아 있으면 안 된다
  if (cfg.visibility === "public" || cfg.private.display !== "show") {
    const leaked = merges.items.filter((i) => i.isPrivate && (i.repo || i.title || i.url || i.avatarUrl));
    if (leaked.length) errors.push(`private items still carry a name, title or link in merges.json: ${leaked.length}. Run fetch again.`);
    const loose = merges.items.filter((i) => i.isPrivate && cfg.visibility === "public");
    if (loose.length) errors.push(`visibility is public but merges.json has private items: ${loose.length}`);
    const pub = merges.items.filter((i) => !i.isPrivate && cfg.visibility === "private");
    if (pub.length) errors.push(`visibility is private but merges.json has public items: ${pub.length} (run fetch again)`);
  }

  // 2. config 키가 아무것에도 안 맞는 경우 (레포 이름 변경 등) (plan 4.8)
  const known = new Set(merges.items.flatMap((i) => styleKeys(i).map((k) => k.toLowerCase())));
  for (const k of [...Object.keys(cfg.stickers), ...cfg.exclude.prs])
    if (!known.has(k.toLowerCase())) warns.push(`config key matches no PR: ${k}`);

  // 3. 용량, 그리고 마스킹 설정에서 산출물에 private 흔적(자물쇠가 아닌데 링크 없는 스티커 등)은 위에서 이미 차단
  let svgs = 0;
  for (const p of walk(cfg.output.dir)) {
    if (!p.endsWith(".svg")) continue;
    svgs++;
    const size = statSync(p).size;
    if (size > MAX_SVG) errors.push(`too large ${(size / 1024).toFixed(1)}KB > ${MAX_SVG / 1024}KB: ${p}`);
  }

  // 4. 링크가 비어 있는 공개 항목
  const broken = merges.items.filter((i) => !i.isPrivate && !i.gone && !i.url);
  if (broken.length) warns.push(`public items without a link: ${broken.length}`);

  // 5. README 마커
  if (existsSync(cfg.output.readme) && !readFileSync(cfg.output.readme, "utf8").includes("<!--MERGE-STICKERS:START-->"))
    warns.push(`no markers in ${cfg.output.readme}`);

  const lines = [...errors.map((e) => `error: ${e}`), ...warns.map((w) => `warning: ${w}`), `checked SVGs: ${svgs}`];
  if (errors.length) throw new Error(lines.join("\n"));
  return lines.join("\n") + "\ncheck passed";
}
