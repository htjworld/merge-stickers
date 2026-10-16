import { LOGO } from "./logo.js";

// MERGE는 GitHub의 머지 보라색. STICKERS는 HTJ 로고의 파랑, 초록, 빨강 계열에서 뽑아 이웃 글자끼리 겹치지 않게 번갈아 놓았다.
const MERGE: [light: string, dark: string] = ["#8250DF", "#A371F7"];
const STICKERS = ["#14C1F1", "#FF4D5E", "#1EE1A0", "#3A7BFF", "#EB2D7D", "#5FD94A", "#12B5D6", "#FF6B6B"];
const PAD = 4;

/** 로고: 글자를 path로 그려서 폰트가 없는 GitHub에서도 똑같이 보인다. */
export function renderWordmark(dark: boolean): string {
  let i = 0;
  const paths = LOGO.letters.map((l) => `<path fill="${l.line === 0 ? MERGE[dark ? 1 : 0] : STICKERS[i++ % STICKERS.length]}" d="${l.d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${LOGO.w + PAD * 2} ${LOGO.h + PAD * 2}" role="img" aria-label="MERGE STICKERS">${paths}</svg>`;
}
