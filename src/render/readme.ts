import { readFileSync, writeFileSync } from "node:fs";

export const START = "<!--MERGE-STICKERS:START-->";
export const END = "<!--MERGE-STICKERS:END-->";

/** 마커 사이만 교체한다. 마커가 없으면 에러 (init이 넣어준다). 바뀌었으면 true. */
export function injectReadme(path: string, body: string): boolean {
  const src = readFileSync(path, "utf8");
  const a = src.indexOf(START), b = src.indexOf(END);
  if (a < 0 || b < a) throw new Error(`${path}에 ${START} ... ${END} 마커가 없습니다.`);
  const out = src.slice(0, a + START.length) + "\n" + body + "\n" + src.slice(b);
  if (out === src) return false;
  writeFileSync(path, out);
  return true;
}
