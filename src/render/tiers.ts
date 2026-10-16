import type { Config } from "../config/schema.js";

export type Tier = (typeof import("../config/schema.js").TIERS)[number];
export type Thresholds = Config["sticker"]["thresholds"];

/** 테두리 두께: 스티커 폭(60) 대비 비율. 96 캔버스를 72px로 그리면 약 2px (plan 3.1) */
export const BORDER_EM = 0.045;
export const BORDER = 60 * BORDER_EM;

/** 2~9번째 머지에 쓰는 컬러 8종 */
export const COLORS = ["#FF6B6B", "#FF9F43", "#FECA57", "#1DD1A1", "#48DBFB", "#54A0FF", "#A66CFF", "#FF78C4"] as const;

/** 레포의 n번째 머지가 어떤 단계인지. 1=흰색, 2~9=컬러, 이후 기준 개수마다 동/은/금/플래티넘/다이아 */
export function tierFor(n: number, th: Thresholds): Tier {
  if (n >= th.diamond) return "diamond";
  if (n >= th.platinum) return "platinum";
  if (n >= th.gold) return "gold";
  if (n >= th.silver) return "silver";
  if (n >= th.bronze) return "bronze";
  return n <= 1 ? "white" : "color";
}

// 메탈 단계: 가장자리(edge)는 어둡게, 면(face)은 밝은 줄무늬 그라데이션, 글로우는 바깥으로 번지는 색
const METAL = {
  bronze: { edge: ["#7A3E12", "#C97B3C"], face: ["#F6C79A", "#C9803F", "#8E4A1B", "#E8A46A", "#B86A2D"], glow: "#FF8A3D", blur: 1.6, glints: 1 },
  silver: { edge: ["#6F7B88", "#C5CDD6"], face: ["#FFFFFF", "#AEB8C4", "#F4F7FA", "#8E9AA8", "#E6EBF0"], glow: "#B9D4FF", blur: 1.8, glints: 2 },
  gold: { edge: ["#8A6508", "#D9A400"], face: ["#FFF6B0", "#F2C230", "#B8860B", "#FFE066", "#E0A800"], glow: "#FFD54A", blur: 2, glints: 2 },
  platinum: { edge: ["#8F9BB8", "#DCE3F5"], face: ["#E8F1FF", "#FFD6F6", "#C9F7FF", "#E6FFD1", "#FFF0C2", "#E8F1FF"], glow: "#C7B8FF", blur: 2.2, glints: 3 },
  diamond: { edge: ["#2F93C9", "#A8EBFF"], face: ["#FFFFFF", "#9BE8FF", "#E6FBFF", "#5CC8FF", "#FFFFFF"], glow: "#66E0FF", blur: 2.6, glints: 4 },
} as const;
type Metal = keyof typeof METAL;
export const isMetal = (t: Tier): t is Metal => t in METAL;

const f = (n: number) => +n.toFixed(2);
const grad = (id: string, stops: readonly string[]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
  stops.map((c, i) => `<stop offset="${f(i / (stops.length - 1))}" stop-color="${c}"/>`).join("") + `</linearGradient>`;

// 반짝이는 4꼭짓점 별. 위치는 도형 안 고정 좌표 (96 캔버스 기준)
const GLINTS = [[73, 23, 1], [23, 71, 0.8], [77, 67, 0.6], [22, 25, 0.7]] as const;
const SPARK = "M0,-5Q0,0 5,0Q0,0 0,5Q0,0 -5,0Q0,0 0,-5Z";

export const CSS =
  `.gl{animation:gl 2.8s ease-in-out infinite}` +
  `.tw{transform-box:fill-box;transform-origin:center;animation:tw 2.4s ease-in-out infinite}` +
  `.sw{animation:sw 3.6s ease-in-out infinite}` +
  `@keyframes gl{0%,100%{opacity:.45}50%{opacity:.95}}` +
  `@keyframes tw{0%,100%{opacity:.15;transform:scale(.5)}50%{opacity:1;transform:scale(1)}}` +
  `@keyframes sw{0%{transform:translateX(0)}40%,100%{transform:translateX(110px)}}` +
  `@media (prefers-reduced-motion:reduce){.gl,.tw,.sw{animation:none}}`;

export interface Ring {
  defs: string;
  under: string; // 도형 뒤 (글로우)
  ring: string; // 다이컷 테두리
  over: string; // 이미지 위 (반짝임, 빛 스침)
}

/**
 * 단계별 테두리. d는 도형 path. colorIdx는 color 단계에서 쓸 색 번호.
 * 흰색/컬러는 단색, 동 이상은 메탈 이중 스트로크 + 글로우 + 반짝임 + 빛 스침.
 */
export function ringFor(tier: Tier, d: string, o: { n: number; colorIdx: number; white: string; foil: boolean; animate: boolean; delay: number }): Ring {
  const w = BORDER * 2;
  const stroke = (paint: string, width: number) => `<path d="${d}" fill="${paint}" stroke="${paint}" stroke-width="${f(width)}" stroke-linejoin="round"/>`;
  if (!isMetal(tier)) {
    const c = tier === "white" ? o.white : COLORS[(tier === "color" && o.n >= 2 ? o.n - 2 : o.colorIdx) % COLORS.length]!;
    const foil = o.foil;
    return {
      defs: foil ? grad("foil", ["#FCEFB4", "#D4A72C", "#F7E08A"]) : "",
      under: "", ring: stroke(foil ? "url(#foil)" : c, w), over: "",
    };
  }
  const m = METAL[tier];
  const cls = (c: string) => (o.animate ? ` class="${c}"` : "");
  const anim = (extra = 0) => (o.animate ? ` style="animation-delay:-${f(((o.delay + extra) % 3) + 0.01)}s"` : "");
  const glow = `<path${cls("gl")}${anim()} d="${d}" fill="${m.glow}" stroke="${m.glow}" stroke-width="${f(w + 2)}" stroke-linejoin="round" filter="url(#glow)" opacity=".85"/>`;
  const sparks = GLINTS.slice(0, m.glints).map(([x, y, s], i) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path${cls("tw")}${anim(i * 0.7)} d="${SPARK}" fill="#fff"/></g>`).join("");
  const sweep = `<g mask="url(#ringmask)"><g${cls("sw")}${anim(0.4)} transform="translate(-60 0)"><rect x="0" y="-10" width="9" height="120" fill="#fff" opacity=".85" transform="skewX(-20)"/></g></g>`;
  return {
    defs:
      grad("edge", m.edge) + grad("face", m.face) +
      `<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${m.blur}"/></filter>` +
      `<mask id="ringmask" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><path d="${d}" fill="#fff" stroke="#fff" stroke-width="${f(w)}" stroke-linejoin="round"/><path d="${d}" fill="#000"/></mask>`,
    under: glow,
    ring: stroke("url(#edge)", w) + stroke("url(#face)", w - 1.4),
    over: sweep + sparks,
  };
}
