import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseDocument } from "yaml";
import { CONFIG_PATH } from "./config/load.js";
import { configSchema } from "./config/schema.js";

/**
 * `merge-stickers set visibility=private header.colors.merged=#FF8A1F ...`
 * Actions의 Run workflow 입력(설정창)이 fetch 직전에 config.yml에 반영되는 통로다.
 * 빈 값과 keep은 "변경 없음". 주석은 보존하고, 검증에 실패하면 파일을 건드리지 않는다.
 */
export function runSet(pairs: string[], path = CONFIG_PATH): string {
  const doc = parseDocument(existsSync(path) ? readFileSync(path, "utf8") : "{}\n");
  const changed: string[] = [];
  for (const p of pairs) {
    const i = p.indexOf("=");
    if (i < 1) throw new Error(`key=value 형식이어야 합니다: ${p}`);
    const key = p.slice(0, i).trim();
    const val = p.slice(i + 1).trim();
    if (val === "" || val === "keep") continue;
    // "#FF8A1F"는 YAML에서 주석이 되므로 직접 파싱하지 않고 숫자/불리언만 변환한다
    doc.setIn(key.split("."), /^(-?\d+(\.\d+)?|true|false|null)$/.test(val) ? JSON.parse(val) : val);
    changed.push(`${key}=${val}`);
  }
  const r = configSchema.safeParse(doc.toJS() ?? {});
  if (!r.success) {
    throw new Error("설정 오류:\n" + r.error.issues.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n"));
  }
  if (changed.length) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, doc.toString());
  }
  return changed.length ? `설정 변경: ${changed.join(", ")}` : "설정 변경 없음";
}
