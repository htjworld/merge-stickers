import { INK } from "./header.js";
import { LOGO } from "./logo.js";
import type { Config } from "../config/schema.js";
import { THEMES } from "./themes.js";

const TILT = [-5, 3, -3, 5, -4, 4, -3, 5, -4, 3, -5, 4, -3]; // 글자마다 살짝 다르게 기울인 스티커 느낌 (고정값이라 항상 같은 모양)
const PAD = 12, OUT = 9;

/** 로고: 글자를 path로 그려서 폰트가 없는 GitHub에서도 똑같이 보인다. 글자색 + 굵은 외곽선 + 어긋난 그림자. */
export function renderWordmark(cfg: Config, dark: boolean): string {
  const ink = THEMES[cfg.theme].ink[dark ? 1 : 0];
  const w = LOGO.w + PAD * 2, h = LOGO.h + PAD * 2, oy = PAD - LOGO.top;
  // 글자 모양은 defs에 한 번만 두고 그림자, 외곽선, 색칠이 <use>로 재사용한다
  const use = (i: number, extra: string, dx = 0, dy = 0) =>
    `<use href="#l${i}" transform="translate(${dx} ${dy + oy}) rotate(${TILT[i]} ${LOGO.letters[i]!.cx} ${LOGO.letters[i]!.cy})" ${extra}/>`;
  const all = (extra: string, dx?: number, dy?: number) => LOGO.letters.map((_, i) => use(i, extra, dx, dy)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${+w.toFixed(1)} ${+h.toFixed(1)}" role="img" aria-label="MERGE STICKERS">` +
    `<defs>${LOGO.letters.map((l, i) => `<path id="l${i}" d="${l.d}"/>`).join("")}</defs>` +
    `<g opacity=".22">${all(`fill="${ink}" stroke="${ink}" stroke-width="${OUT}" stroke-linejoin="round"`, 3, 4)}</g>` +
    all(`fill="${ink}" stroke="${ink}" stroke-width="${OUT}" stroke-linejoin="round"`) +
    LOGO.letters.map((_, i) => use(i, `fill="${INK[i % INK.length]}"`)).join("") + `</svg>`;
}
