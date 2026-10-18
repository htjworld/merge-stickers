import type { Config } from "../config/schema.js";
import { THEMES } from "./themes.js";
import { LOGO } from "./wordmark.js";

// 스티커판 테두리 조각. 얇은 둥근 선 하나에 로고(Merge 배지)가 윗변에 걸리는 모양 (fieldset/legend처럼 선이 로고 앞뒤에서 끊긴다).
// 줄 사이와 아래 조각은 GitHub 본문 줄높이(16px x 1.5 = 24)보다 낮으면 줄 사이에 틈이 생겨 옆변이 끊긴다
export const SIDE = 20, RAIL = 24, FOOT = 24; // 옆 조각 폭(선 + 안쪽 여백), 줄 사이 간격, 아래 조각 높이
const R = 16, X = 1, GAP = 18; // 모서리 반지름, 선 중심(1.5px 선이 조각 안에 들어오게), 윗변 끝과 로고 사이
const Y = Math.round(((18 * LOGO) / 91) * 10) / 10; // 윗변 높이 = 로고 Merge 배지 가운데 (로고 viewBox가 -2부터, 배지 높이 32)

export type FramePart = "tl" | "tr" | "l" | "r" | "rail" | "foot";

/** tl/tr: 로고 양옆 윗변과 모서리, l/r: 옆변, rail: 줄 사이(양옆 선), foot: 아랫변과 모서리. */
export function renderFrame(part: FramePart, w: number, h: number, cfg: Config, dark: boolean): string {
  const e = w - X;
  const d = {
    tl: `M${X} ${h}V${Y + R}A${R} ${R} 0 0 1 ${X + R} ${Y}H${w - GAP}`,
    tr: `M${GAP} ${Y}H${e - R}A${R} ${R} 0 0 1 ${e} ${Y + R}V${h}`,
    l: `M${X} 0V${h}`,
    r: `M${e} 0V${h}`,
    rail: `M${X} 0V${h}M${e} 0V${h}`,
    foot: `M${X} 0V${h - X - R}A${R} ${R} 0 0 0 ${X + R} ${h - X}H${e - R}A${R} ${R} 0 0 0 ${e} ${h - X - R}V0`,
  }[part];
  return blank(w, h, `<path d="${d}" fill="none" stroke="${THEMES[cfg.theme].ink[dark ? 1 : 0]}" stroke-opacity=".25" stroke-width="1.5"/>`);
}

/** 투명한 빈 칸 (판 안쪽 여백). */
export const blank = (w: number, h: number, body = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
/** 좁은 화면에서 조각 대신 들어가 판을 지우는 0x0 그림. */
export const EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"/>`;
