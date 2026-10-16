// 개발용: 폰트의 글자 윤곽을 SVG path로 뽑아 src/render/logo.ts를 만든다 (GitHub README는 웹폰트를 못 쓰므로 path가 필요).
// 사용: npx tsx scripts/gen-logo.ts RubikBubbles-Regular.ttf   (폰트: OFL, https://fonts.google.com/specimen/Rubik+Bubbles)
// MERGE 위에 STICKERS를 같은 글자 크기로 쌓고 각 줄을 가운데 정렬한다.
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const font = opentype.parse(new Uint8Array(readFileSync(process.argv[2]!)).buffer);
const SIZE = 100, GAP = 0.08;
// opentype.js의 toPathData는 소수점 0자리에서 숫자가 붙어버려서 직접 만든다
const n = (v: number) => String(Math.round(v));
const fmt = (c: opentype.PathCommand) =>
  c.type === "Z" ? "Z" : c.type === "M" || c.type === "L" ? `${c.type}${n(c.x)} ${n(c.y)}` :
  c.type === "Q" ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
const rows = ["MERGE", "STICKERS"].map((text) => {
  let x = 0;
  const glyphs = [...text].map((ch) => {
    const g = font.charToGlyph(ch), at = x;
    x += (g.advanceWidth! / font.unitsPerEm) * SIZE;
    return { ch, at };
  });
  return { glyphs, width: x };
});
const W = Math.max(...rows.map((r) => r.width));
let y = 0, top = Infinity, bottom = -Infinity;
const letters: { line: number; d: string }[] = [];
rows.forEach((row, line) => {
  const ps = row.glyphs.map(({ ch, at }) => font.charToGlyph(ch).getPath(at + (W - row.width) / 2, 0, SIZE)); // 글자 단위로 뽑는다 (문자열 변환은 이 폰트의 GSUB를 못 읽는다)
  const bbs = ps.map((p) => p.getBoundingBox());
  const y1 = Math.min(...bbs.map((b) => b.y1)), y2 = Math.max(...bbs.map((b) => b.y2));
  row.glyphs.forEach(({ ch, at }) => letters.push({ line, d: font.charToGlyph(ch).getPath(at + (W - row.width) / 2, y - y1, SIZE).commands.map(fmt).join("") }));
  top = Math.min(top, y); bottom = y + (y2 - y1);
  y = bottom + SIZE * GAP;
});
const src = `// scripts/gen-logo.ts로 생성 (Rubik Bubbles, SIL OFL 1.1). 직접 고치지 않습니다.\n` +
  `export const LOGO = ${JSON.stringify({ w: +W.toFixed(1), h: +(bottom - top).toFixed(1), letters })} as const;\n`;
writeFileSync(new URL("../src/render/logo.ts", import.meta.url), src);
console.log(`글자 ${letters.length}개, ${W.toFixed(1)} x ${(bottom - top).toFixed(1)}`);
