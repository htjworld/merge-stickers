// 개발용: 폰트의 글자 윤곽을 SVG path로 뽑아 src/render/logo.ts를 만든다 (GitHub README는 웹폰트를 못 쓰므로 path가 필요).
// 사용: npx tsx scripts/gen-logo.ts BagelFatOne-Regular.ttf   (폰트: OFL, https://fonts.google.com/specimen/Bagel+Fat+One)
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const font = opentype.parse(new Uint8Array(readFileSync(process.argv[2]!)).buffer);
const SIZE = 60, GAP = 22; // 단어 사이 간격
let x = 0, top = Infinity, bottom = -Infinity;
const letters: { d: string; cx: number; cy: number }[] = [];
for (const ch of "MERGE STICKERS") {
  const g = font.charToGlyph(ch), adv = (g.advanceWidth! / font.unitsPerEm) * SIZE;
  if (ch === " ") { x += GAP; continue; }
  const p = g.getPath(x, 0, SIZE), b = p.getBoundingBox();
  top = Math.min(top, b.y1); bottom = Math.max(bottom, b.y2);
  letters.push({ d: p.toPathData(1), cx: +((b.x1 + b.x2) / 2).toFixed(1), cy: +((b.y1 + b.y2) / 2).toFixed(1) });
  x += adv;
}
const src = `// scripts/gen-logo.ts로 생성 (Bagel Fat One, SIL OFL 1.1). 직접 고치지 않습니다.\n` +
  `export const LOGO = ${JSON.stringify({ w: +x.toFixed(1), top: +top.toFixed(1), h: +(bottom - top).toFixed(1), letters })} as const;\n`;
writeFileSync(new URL("../src/render/logo.ts", import.meta.url), src);
console.log(`글자 ${letters.length}개, 폭 ${x.toFixed(1)}, 높이 ${(bottom - top).toFixed(1)}`);
