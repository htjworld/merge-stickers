import type { Config } from "../config/schema.js";
import { styleKeys } from "../curate/filter.js";
import type { Item } from "../types.js";
import { pick, range, rng, weighted } from "./seed.js";
import { PATHS, SHAPES, type Shape } from "./shapes.js";
import { THEMES, type Finish, type Theme } from "./themes.js";
import { CSS, isMetal, ringFor, tierFor, type Tier } from "./tiers.js";

export const CANVAS = 96;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const f = (n: number) => +n.toFixed(2);

/**
 * 스티커 1장의 모양. 시드는 레포 단위라 같은 레포는 항상 같은 모양(도형, 각도, 위치, 마감)이다 (plan 3.2).
 * nth는 그 레포의 몇 번째 머지인지 (단계 결정). 값을 뽑는 순서를 바꾸면 기존 결과가 바뀌니 고정한다.
 */
export function look(item: Item, cfg: Config, seed: string, nth = 1) {
  const theme = THEMES[cfg.theme];
  const r = rng(`${seed}:${item.repo || item.id}`);
  const v = cfg.sticker.variation * theme.variation;
  const o = cfg.stickers[styleKeys(item).find((k) => cfg.stickers[k]) ?? ""] ?? {};
  const shape: Shape = o.shape ?? (v === 0 ? "circle" : pick(r, SHAPES));
  const rolled = weighted(r, theme.finish);
  const rotate = o.rotate ?? range(r, -12, 12) * v;
  const scale = 1 + range(r, -0.06, 0.06) * v;
  const dx = range(r, -6, 6) * v; // 흔들림 한도 = 캔버스 여백 (글로우가 안 잘리게)
  const dy = range(r, -6, 6) * v;
  const colorIdx = Math.floor(r() * 8);
  const tape = r() < 0.1 * Math.min(1, v * 2);
  const peel = r() < 0.15 * Math.min(1, v * 2);
  const tapeRot = range(r, -10, 10);
  const delay = r() * 3;
  const tier: Tier = o.tier ?? (cfg.sticker.tier !== "auto" ? cfg.sticker.tier : tierFor(nth, cfg.sticker.thresholds));
  // 메탈 단계의 면 마감은 단계가 정한다 (플래티넘=홀로, 나머지=광택)
  const finish: Finish = o.finish ?? (tier === "platinum" ? "holo" : isMetal(tier) ? "glossy" : rolled);
  return { shape, finish, rotate, scale, dx, dy, colorIdx, tape, peel, tapeRot, delay, tier, theme };
}

function fallback(item: Item, theme: Theme): string {
  if (item.isPrivate && !item.repo) // 마스킹된 private: 자물쇠
    return `<rect x="0" y="0" width="96" height="96" fill="#8B949E"/>` +
      `<path d="M38,50v-6a10,10 0 0 1 20,0v6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="34" y="48" width="28" height="22" rx="4" fill="#fff"/><circle cx="48" cy="59" r="3" fill="#8B949E"/>`;
  const color = item.language?.color ?? "#6E7781";
  const initial = esc((item.repo.split("/")[1] ?? "?").charAt(0).toUpperCase());
  return `<rect x="0" y="0" width="96" height="96" fill="${color}"/>` +
    `<text x="48" y="60" text-anchor="middle" font-size="34" font-weight="700" fill="#fff" ` +
    `font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">${initial}</text>`;
}

/** image는 이미 리사이즈된 data URI. 없으면 언어색 이니셜 폴백. */
export function renderSticker(item: Item, cfg: Config, seed: string, image: string | null, count = 1, nth = count): string {
  const L = look(item, cfg, seed, nth);
  const d = PATHS[L.shape];
  const R = ringFor(L.tier, d, { n: nth, colorIdx: L.colorIdx, white: L.theme.borders[0]!, foil: L.finish === "foil", animate: cfg.sticker.animate, delay: L.delay });
  const content = image
    ? `<image href="${image}" x="12" y="12" width="72" height="72" preserveAspectRatio="xMidYMid slice"/>`
    : fallback(item, L.theme);
  const shine = L.finish === "matte" ? "" :
    `<g clip-path="url(#c)"><rect x="0" y="0" width="96" height="96" fill="url(#shine)"/>` +
    (L.finish === "holo" ? `<rect x="0" y="0" width="96" height="96" fill="url(#holo)" opacity=".3"/>` : "") + `</g>`;
  const tape = L.tape
    ? `<g transform="translate(48 20) rotate(${f(L.tapeRot)})"><rect x="-17" y="-5" width="34" height="10" fill="${L.theme.tape[0]}" opacity=".85"/>` +
      `<rect x="-17" y="-5" width="34" height="10" fill="url(#stripes)"/></g>`
    : "";
  const peel = L.peel
    ? `<path d="M64,80L80,64Q81,80 64,80Z" fill="#fff" stroke="#00000022" stroke-width=".6"/>` : "";

  const badge = count > 1 && cfg.sticker.showCount
    ? `<circle cx="76" cy="76" r="11" fill="${L.theme.accent[0]}" stroke="#fff" stroke-width="2"/>` +
      `<text x="76" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">x${count}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">` +
    `<defs>` +
    `<clipPath id="c"><path d="${d}"/></clipPath>` +
    `<filter id="s" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity="${L.theme.shadow}"/></filter>` +
    `<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".33" stop-color="#7ad7ff"/><stop offset=".66" stop-color="#b6ff7a"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>` +
    `${R.defs}${isMetal(L.tier) && cfg.sticker.animate ? `<style>${CSS}</style>` : ""}` +
    `<pattern id="stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="#fff" opacity=".35"/></pattern>` +
    `</defs>` +
    `<g transform="translate(${f(L.dx)} ${f(L.dy)}) translate(48 48) rotate(${f(L.rotate)}) scale(${f(L.scale)}) translate(-48 -48)" filter="url(#s)">` +
    `${R.under}${R.ring}` +
    `<g clip-path="url(#c)">${content}</g>${shine}${R.over}${peel}${tape}</g>${badge}</svg>`;
}

/** 한 문서에 여러 스티커를 넣을 때(board.svg 시트) id 충돌을 막는다. */
export const prefixIds = (svg: string, p: string) =>
  svg.replace(/ id="(\w+)"/g, ` id="${p}$1"`).replace(/url\(#(\w+)\)/g, `url(#${p}$1)`);
