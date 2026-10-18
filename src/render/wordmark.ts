import { GIT_MERGE } from "./icons.js";

// GitHub PR 화면의 Merged 배지(14px/600, 패딩 8·12px, done-emphasis)와 머지 박스 제목(600, fgColor-default)을 그대로 옮겼다.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif"; // GitHub 본문 폰트 스택
const BADGE: [light: string, dark: string] = ["#8250df", "#8957e5"];
const INK: [light: string, dark: string] = ["#1f2328", "#f0f6fc"];
const W = 87; // 배지 폭. 글꼴마다 폭이 달라서 textLength로 두 줄을 이 폭에 맞춘다 (SF Pro 기준이면 거의 그대로).
const LOGO = 140, GAP = 12, TOP = 24; // 로고 표시 폭, 선과 로고 사이, 위쪽 README 요소와 띄우는 여백

/** 로고: 위에 Merge 배지, 아래에 STICKERS 제목. 글꼴은 GitHub처럼 보는 사람의 시스템 폰트.
 *  보통 특별 README 맨 아래에 붙으므로, 배지 높이에 양옆 가는 선을 그어 위 요소들과 구분한다. width는 스티커 한 줄 폭. */
export function renderWordmark(dark: boolean, width: number): string {
  const k = dark ? 1 : 0, h = Math.round((57 * LOGO) / (W + 4)), y = TOP + Math.round((18 * LOGO) / (W + 4)), a = (width - LOGO) / 2;
  const line = (x1: number, x2: number) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${INK[k]}" stroke-opacity=".25" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${TOP + h}" width="${width}" height="${TOP + h}" role="img" aria-label="MERGE STICKERS">` +
    (a > GAP ? line(0, a - GAP) + line(a + LOGO + GAP, width) : "") +
    `<svg x="${a}" y="${TOP}" width="${LOGO}" height="${h}" viewBox="-2 -2 ${W + 4} 57" font-family="${FONT}" font-weight="600">` +
    `<rect width="${W}" height="32" rx="16" fill="${BADGE[k]}"/>` +
    `<path transform="translate(12 8)" fill="#fff" d="${GIT_MERGE}"/>` +
    `<text x="32" y="21" font-size="14" textLength="43" fill="#fff">Merge</text>` +
    `<text x="0" y="53" font-size="18" textLength="${W}" fill="${INK[k]}">STICKERS</text></svg></svg>`;
}
