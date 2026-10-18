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

export const LOGO = 140, DIVIDER_H = 112; // README의 로고 표시 폭, 구분선 이미지 높이 (로고 88보다 24 높은 만큼이 위 여백)

/** 로고 양옆 구분선 (---- 로고 ----). 바깥쪽으로 갈수록 흐려지고, 높이는 Merge 배지와 STICKERS 사이 틈에 맞춘다.
 *  README에서 width="25%" height="112"로 쓴다. GitHub이 height:auto; max-height:112px를 붙이므로
 *  아주 홀쭉한 비율로 높이를 112에 고정하고, preserveAspectRatio="none"으로 가로만 늘린다. */
export function renderDivider(dark: boolean, side: "left" | "right"): string {
  const k = dark ? 1 : 0, s = LOGO / (W + 4);
  const y = Math.round((DIVIDER_H - 57 * s + 38 * s) * 10) / 10; // 바닥을 로고와 맞추고, 배지 아래(32)와 STICKERS 위(≈40) 사이 36 (viewBox가 -2부터라 38)
  const [from, to, x] = side === "left" ? [0, 0.35, 0] : [0.35, 0, 0.6];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 ${DIVIDER_H}" preserveAspectRatio="none">` +
    `<linearGradient id="g"><stop offset="0" stop-color="${INK[k]}" stop-opacity="${from}"/><stop offset="1" stop-color="${INK[k]}" stop-opacity="${to}"/></linearGradient>` +
    `<rect x="${x}" y="${y - 0.75}" width="9.4" height="1.5" fill="url(#g)"/></svg>`;
}
