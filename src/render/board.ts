import { createHash } from "node:crypto";
import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";
import { renderButton, renderHeader, renderSlot, stats } from "./header.js";
import { renderSticker, prefixIds, CANVAS } from "./sticker.js";
import { THEMES } from "./themes.js";
import { blank, EMPTY, type FramePart, FOOT, RAIL, renderFrame, SIDE } from "./frame.js";
import { LOGO, renderWordmark } from "./wordmark.js";

export const HOME = "https://github.com/htjworld/merge-stickers";

export interface Tile { id: string; item: Item; image: string | null; count: number; nth: number; href: string; alt: string }
export type Files = Map<string, string>; // 출력 폴더 기준 상대경로 → 내용

const hash = (s: string, n = 8) => createHash("sha1").update(s).digest("hex").slice(0, n);
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** groupBy: repo면 레포당 1장(최신 PR 기준) + 개수 (plan 6.1) */
export function toTiles(items: Item[], cfg: Config, user: string, images: (i: Item) => string | null): Tile[] {
  const sorted = [...items].sort((a, b) => a.mergedAt.localeCompare(b.mergedAt) || a.id.localeCompare(b.id));
  const mk = (item: Item, count: number, nth: number, href: string, alt: string): Tile => ({ id: hash(item.id), item, image: images(item), count, nth, href, alt });
  let tiles: Tile[];
  if (cfg.layout.groupBy === "repo") {
    const by = new Map<string, Item[]>();
    for (const i of sorted) by.set(i.repo || i.id, [...(by.get(i.repo || i.id) ?? []), i]);
    tiles = [...by.values()].map((g) => {
      const last = g[g.length - 1]!;
      const href = last.repo ? `https://github.com/${last.repo}/pulls?q=is:pr+author:${user}+is:merged` : "";
      return mk(last, g.length, g.length, href, last.repo ? `${last.repo} (${g.length})` : "private");
    });
  } else {
    const seen = new Map<string, number>(); // PR 모드: 단계는 그 레포의 몇 번째 머지인지로 정한다
    tiles = sorted.map((i) => {
      const nth = (seen.get(i.repo || i.id) ?? 0) + 1;
      seen.set(i.repo || i.id, nth);
      return mk(i, 1, nth, i.url, i.repo ? `${i.repo} #${i.key.split("#")[1]}` : "private");
    });
  }
  return cfg.layout.order === "desc" ? tiles.reverse() : tiles;
}

const slotCount = (n: number, cfg: Config) => {
  const { slots, columns, order } = cfg.layout;
  if (slots === "none" || order === "desc") return n; // 채우는 순서가 있어야 의미가 있다
  return slots === "auto" ? Math.ceil(n / columns) * columns : Math.max(n, slots);
};

/** 산출물 전부와 README 스니펫을 만든다. 같은 입력이면 같은 출력 (plan 13-5). */
export function buildBoard(tiles: Tile[], cfg: Config, seed: string, buttons: { settings: string; fetch: string } | null = null): { files: Files; snippet: string } {
  const dir = cfg.output.dir;
  const files: Files = new Map();
  const items = tiles.map((t) => t.item);
  const v = (name: string, svg: string) => { files.set(name, svg); return `${dir}/${name}?v=${hash(svg, 6)}`; };

  const prs = tiles.reduce((n, t) => n + t.count, 0);
  const st = stats(items, cfg.timezone, prs);
  const hl = v("header-light.svg", renderHeader(items, cfg, false, seed, prs));
  const hd = v("header-dark.svg", renderHeader(items, cfg, true, seed, prs));
  const w = cfg.sticker.size, cols = cfg.layout.columns, hasBtn = !!(cfg.header.buttons && buttons);
  // 스티커판: 로고가 윗변에 걸리고 헤더와 스티커 줄을 감싼다. README는 이미지 뒤에 배경을 깔 수 없어서
  // 한 <p> 안에서 줄마다 양옆 조각을 붙이고(<br>로 줄바꿈, align="top"으로 줄 사이 틈을 없앰) 한 장처럼 잇는다.
  const inner = Math.max(cols * w, 480 + (hasBtn ? 88 : 0)), F = inner + 2 * SIDE;
  const framed = cfg.header.logo && cfg.output.mode === "html" && F <= 846;
  // ponytail: GitHub 프로필 README 본문폭 = 화면폭 - 434 (1012~1280px에서 잰 값, 그 위는 846 고정). 판이 안 들어가는 화면에선
  // 조각을 0x0 그림으로 바꿔 예전 배치로 돌아간다. GitHub 레이아웃이 바뀌면 이 숫자만 다시 잰다.
  const NARROW = `(max-width: ${F + 433.98}px)`, WIDE = `(min-width: ${F + 434}px)`;
  const empty = framed ? v("frame/empty.svg", EMPTY) : "";
  const hide = (media: string) => (media ? `<source media="${media}" srcset="${empty}">` : "");
  const dk = (d: string) => `<source media="(prefers-color-scheme: dark)" srcset="${d}">`;
  const part = (p: FramePart, pw: number, ph: number) => {
    const n = `frame/${p}-${pw}x${ph}`;
    return `<picture>${hide(NARROW)}${dk(v(`${n}-dark.svg`, renderFrame(p, pw, ph, cfg, true)))}<img src="${v(`${n}-light.svg`, renderFrame(p, pw, ph, cfg, false))}" align="top" alt=""></picture>`;
  };
  const gap = (gw: number, gh: number) => (gw > 0 ? `<picture>${hide(NARROW)}<img src="${v(`frame/gap-${gw}x${gh}.svg`, blank(gw, gh))}" align="top" alt=""></picture>` : "");
  // 설정(왼쪽)과 fetch(오른쪽). 주인이 아니면 편집/실행 권한이 없다. 판이 있으면 판 안쪽 끝에 놓고, 좁은 화면에선 예전처럼 float으로 헤더 양옆에 놓는다.
  // 숨길 수 있는 버튼은 width/height를 빼야 0x0 그림으로 바뀔 때 자리도 사라진다 (버튼 SVG에 44x84가 들어 있다).
  const btn = (kind: "settings" | "fetch", align: string, hideOn = "") => {
    const l = v(`button-${kind}-light.svg`, renderButton(kind, cfg, false)), d = v(`button-${kind}-dark.svg`, renderButton(kind, cfg, true));
    return `<a href="${attr(buttons![kind])}" title="${kind === "settings" ? "settings (owner only)" : "fetch now (owner only)"}"><picture>${hide(hideOn)}${dk(d)}<img src="${l}" align="${align}"${hideOn ? "" : ' width="44" height="84"'} alt="${kind}"></picture></a>`;
  };
  const floats = hasBtn ? btn("settings", "left", framed ? WIDE : "") + btn("fetch", "right", framed ? WIDE : "") : "";
  const top = framed ? ' align="top"' : "";
  const logo = !cfg.header.logo ? "" : `<a href="${HOME}" title="merge-stickers"><picture>${dk(v("logo-dark.svg", renderWordmark(true)))}<img src="${v("logo-light.svg", renderWordmark(false))}"${top} width="${LOGO}" alt="MERGE STICKERS"></picture></a>`;
  const headerImg = `<picture>${dk(hd)}<img src="${hl}"${top} alt="${st.merged} merged PRs across ${st.repos} repos"></picture>`;
  const header = `${logo && `<p align="center">${logo}</p>\n`}<p align="center">${floats}${headerImg}</p>`;

  if (cfg.output.mode === "sheet") return { files, snippet: sheet(tiles, cfg, seed, files, dir) };

  const cells = tiles.map((t) => {
    const src = v(`stickers/${t.id}.svg`, renderSticker(t.item, cfg, seed, t.image, t.count, t.nth));
    const img = `<img src="${src}"${top} width="${w}" alt="${attr(t.alt)}">`;
    return t.href ? `<a href="${attr(t.href)}" title="${attr(t.alt)}">${img}</a>` : img;
  });
  const total = slotCount(tiles.length, cfg);
  for (let n = tiles.length + 1; n <= total; n++) {
    const l = v(`slots/${n}-light.svg`, renderSlot(n, cfg, false)), d = v(`slots/${n}-dark.svg`, renderSlot(n, cfg, true));
    cells.push(`<picture><source media="(prefers-color-scheme: dark)" srcset="${d}"><img src="${l}"${top} width="${w}" alt="empty slot ${n}"></picture>`);
  }

  const rows = Array.from({ length: Math.ceil(cells.length / cols) }, (_, r) => cells.slice(r * cols, (r + 1) * cols));
  if (framed) {
    const lw = Math.floor((F - LOGO) / 2), lh = Math.round((57 * LOGO) / 91), g = inner - 480 - (hasBtn ? 88 : 0);
    const inl = (kind: "settings" | "fetch") => (hasBtn ? btn(kind, "top", NARROW) : "");
    const lines = [
      part("tl", lw, lh) + logo + part("tr", F - LOGO - lw, lh),
      `${floats}${part("l", SIDE, 84)}${inl("settings")}${gap(Math.floor(g / 2), 84)}${headerImg}${gap(g - Math.floor(g / 2), 84)}${inl("fetch")}${part("r", SIDE, 84)}`,
      ...rows.map((r) => {
        const p = inner - r.length * w;
        return `${part("l", SIDE, w)}${gap(Math.floor(p / 2), w)}${r.join("")}${gap(p - Math.floor(p / 2), w)}${part("r", SIDE, w)}`;
      }),
    ];
    // 맨 앞 <br>이 위쪽 README 요소와의 여백, 줄 사이는 rail, 끝은 아랫변
    return { files, snippet: `<p align="center"><br>\n${lines.join(`<br>\n${part("rail", F, RAIL)}<br>\n`)}<br>\n${part("foot", F, FOOT)}</p>` };
  }
  let body: string;
  if (cfg.output.mode === "table") {
    const line = (c: string[]) => `| ${c.join(" | ")} |`;
    const pad = (r: string[]) => [...r, ...Array<string>(cols - r.length).fill("")];
    body = [line(Array<string>(cols).fill("&nbsp;")), line(Array<string>(cols).fill(":-:")), ...rows.map((r) => line(pad(r)))].join("\n");
  } else {
    // 태그 사이 공백이 있으면 가로 틈이 생기므로 한 줄로 붙인다 (plan 2.1)
    body = rows.map((r) => `<p align="center">${r.join("")}</p>`).join("\n");
  }
  return { files, snippet: `${header}\n${body}` };
}

/** 단일 board.svg: 종이 배경 포함, 클릭은 안 됨 (plan 2) */
function sheet(tiles: Tile[], cfg: Config, seed: string, files: Files, dir: string): string {
  const cols = cfg.layout.columns, rows = Math.ceil(tiles.length / cols) || 1, t = THEMES[cfg.theme];
  const inner = tiles.map((tile, i) =>
    `<svg x="${(i % cols) * CANVAS}" y="${Math.floor(i / cols) * CANVAS}" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 96 96">` +
    prefixIds(renderSticker(tile.item, cfg, seed, tile.image, tile.count, tile.nth), `s${i}_`).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") + "</svg>").join("");
  const mk = (k: 0 | 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * CANVAS} ${rows * CANVAS}"><rect width="100%" height="100%" rx="16" fill="${t.paper[k]}"/>${inner}</svg>`;
  files.set("board.svg", mk(0));
  files.set("board-dark.svg", mk(1));
  const l = `${dir}/board.svg?v=${hash(mk(0), 6)}`, d = `${dir}/board-dark.svg?v=${hash(mk(1), 6)}`;
  return `<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="${d}"><img src="${l}" alt="merge stickers"></picture></p>`;
}
