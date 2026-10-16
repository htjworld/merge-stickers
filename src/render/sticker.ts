import type { Config } from "../config/schema.js";
import { idsOf } from "../curate/filter.js";
import type { Item } from "../types.js";
import { pick, range, rng, weighted } from "./seed.js";
import { PATHS, SHAPES, type Shape } from "./shapes.js";
import { THEMES, type Finish, type Theme } from "./themes.js";

export const CANVAS = 96;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const f = (n: number) => +n.toFixed(2);

/** 시드로 정해지는 스티커 1장의 모양. 값을 뽑는 순서를 바꾸면 기존 결과가 바뀌니 고정한다. */
export function look(item: Item, cfg: Config, seed: string) {
  const theme = THEMES[cfg.theme];
  const r = rng(`${seed}:${item.id}`);
  const v = cfg.sticker.variation * theme.variation;
  const o = cfg.stickers[idsOf(item).find((k) => cfg.stickers[k]) ?? ""] ?? {};
  const shape: Shape = o.shape ?? (v === 0 ? "circle" : pick(r, SHAPES));
  const finish: Finish = o.finish ?? weighted(r, theme.finish);
  const rotate = o.rotate ?? range(r, -12, 12) * v;
  const scale = 1 + range(r, -0.06, 0.06) * v;
  const dx = range(r, -8, 8) * v;
  const dy = range(r, -8, 8) * v;
  const border = pick(r, theme.borders);
  const borderW = range(r, 4, 5.5);
  const tape = r() < 0.1 * Math.min(1, v * 2);
  const peel = r() < 0.15 * Math.min(1, v * 2);
  const tapeRot = range(r, -10, 10);
  return { shape, finish, rotate, scale, dx, dy, border, borderW, tape, peel, tapeRot, theme };
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
export function renderSticker(item: Item, cfg: Config, seed: string, image: string | null): string {
  const L = look(item, cfg, seed);
  const d = PATHS[L.shape];
  const foil = L.finish === "foil";
  const stroke = foil ? "url(#foil)" : L.border;
  const content = image
    ? `<image href="${image}" x="12" y="12" width="72" height="72" preserveAspectRatio="xMidYMid slice"/>`
    : fallback(item, L.theme);
  const shine = L.finish === "matte" ? "" :
    `<g clip-path="url(#c)"><rect x="0" y="0" width="96" height="96" fill="url(#shine)"/>` +
    (L.finish === "holo" ? `<rect x="0" y="0" width="96" height="96" fill="url(#holo)" opacity=".4"/>` : "") + `</g>`;
  const tape = L.tape
    ? `<g transform="translate(48 20) rotate(${f(L.tapeRot)})"><rect x="-17" y="-5" width="34" height="10" fill="${L.theme.tape[0]}" opacity=".85"/>` +
      `<rect x="-17" y="-5" width="34" height="10" fill="url(#stripes)"/></g>`
    : "";
  const peel = L.peel
    ? `<path d="M64,80L80,64Q81,80 64,80Z" fill="#fff" stroke="#00000022" stroke-width=".6"/>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">` +
    `<defs>` +
    `<clipPath id="c"><path d="${d}"/></clipPath>` +
    `<filter id="s" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity="${L.theme.shadow}"/></filter>` +
    `<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".33" stop-color="#7ad7ff"/><stop offset=".66" stop-color="#b6ff7a"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>` +
    `<linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FCEFB4"/><stop offset=".5" stop-color="#D4A72C"/><stop offset="1" stop-color="#F7E08A"/></linearGradient>` +
    `<pattern id="stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="#fff" opacity=".35"/></pattern>` +
    `</defs>` +
    `<g transform="translate(${f(L.dx)} ${f(L.dy)}) translate(48 48) rotate(${f(L.rotate)}) scale(${f(L.scale)}) translate(-48 -48)" filter="url(#s)">` +
    `<path d="${d}" fill="${stroke}" stroke="${stroke}" stroke-width="${f(L.borderW * 2)}" stroke-linejoin="round"/>` +
    `<g clip-path="url(#c)">${content}</g>${shine}${peel}${tape}</g></svg>`;
}

/** 한 문서에 여러 스티커를 넣을 때(board.svg 시트) id 충돌을 막는다. */
export const prefixIds = (svg: string, p: string) =>
  svg.replace(/ id="(\w+)"/g, ` id="${p}$1"`).replace(/url\(#(\w+)\)/g, `url(#${p}$1)`);
