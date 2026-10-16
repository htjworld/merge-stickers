import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { configSchema, type Config } from "./schema.js";

export const CONFIG_PATH = ".merge-stickers/config.yml";

/** 파일이 없으면 기본값. 있으면 검증하고, 오류는 경로까지 알려준다. */
export function loadConfig(path = CONFIG_PATH): Config {
  const raw = existsSync(path) ? parse(readFileSync(path, "utf8")) ?? {} : {};
  const r = configSchema.safeParse(raw);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`${path} 설정 오류:\n${msg}`);
  }
  return r.data;
}
