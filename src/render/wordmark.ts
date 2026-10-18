import { GIT_MERGE } from "./icons.js";

// GitHub PR 화면의 Merged 배지(14px/600, 패딩 8·12px, done-emphasis)와 머지 박스 제목(600, fgColor-default)을 그대로 옮겼다.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif"; // GitHub 본문 폰트 스택
const BADGE: [light: string, dark: string] = ["#8250df", "#8957e5"];
const INK: [light: string, dark: string] = ["#1f2328", "#f0f6fc"];
const W = 87; // 배지 폭. 글꼴마다 폭이 달라서 textLength로 두 줄을 이 폭에 맞춘다 (SF Pro 기준이면 거의 그대로).

/** 로고: 위에 Merge 배지, 아래에 STICKERS 제목. 글꼴은 GitHub처럼 보는 사람의 시스템 폰트. */
export function renderWordmark(dark: boolean): string {
  const k = dark ? 1 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${W + 4} 57" role="img" aria-label="MERGE STICKERS" font-family="${FONT}" font-weight="600">` +
    `<rect width="${W}" height="32" rx="16" fill="${BADGE[k]}"/>` +
    `<path transform="translate(12 8)" fill="#fff" d="${GIT_MERGE}"/>` +
    `<text x="32" y="21" font-size="14" textLength="43" fill="#fff">Merge</text>` +
    `<text x="0" y="53" font-size="18" textLength="${W}" fill="${INK[k]}">STICKERS</text></svg>`;
}


export const LOGO = 140; // README의 로고 표시 폭
