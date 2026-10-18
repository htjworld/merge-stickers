import { createHash } from "node:crypto";
import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";
import { renderButton, renderHeader, renderSlot, stats } from "./header.js";
import { renderSticker, prefixIds, CANVAS } from "./sticker.js";
import { THEMES } from "./themes.js";
import { renderWordmark } from "./wordmark.js";

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
  const w = cfg.sticker.size;
  // 설정(왼쪽)과 fetch(오른쪽)는 float 이미지라 헤더와 같은 줄에 놓인다. 주인이 아니면 편집/실행 권한이 없다.
  const btn = (kind: "settings" | "fetch", href: string, side: "left" | "right") => {
    const l = v(`button-${kind}-light.svg`, renderButton(kind, cfg, false)), d = v(`button-${kind}-dark.svg`, renderButton(kind, cfg, true));
    return `<a href="${attr(href)}" title="${kind === "settings" ? "settings (owner only)" : "fetch now (owner only)"}"><picture><source media="(prefers-color-scheme: dark)" srcset="${d}"><img src="${l}" align="${side}" width="44" height="84" alt="${kind}"></picture></a>`;
  };
  const side = cfg.header.buttons && buttons ? btn("settings", buttons.settings, "left") + btn("fetch", buttons.fetch, "right") : "";
  const rw = cfg.layout.columns * w; // 로고 양옆 구분선은 스티커 한 줄 폭까지
  const logo = cfg.header.logo
    ? `<p align="center"><a href="${HOME}" title="merge-stickers"><picture><source media="(prefers-color-scheme: dark)" srcset="${v("logo-dark.svg", renderWordmark(true, rw))}"><img src="${v("logo-light.svg", renderWordmark(false, rw))}" width="${rw}" alt="MERGE STICKERS"></picture></a></p>
`
    : "";
  const header = `${logo}<p align="center">${side}<picture><source media="(prefers-color-scheme: dark)" srcset="${hd}"><img src="${hl}" alt="${st.merged} merged PRs across ${st.repos} repos"></picture></p>`;

  if (cfg.output.mode === "sheet") return { files, snippet: sheet(tiles, cfg, seed, files, dir) };

  const cells = tiles.map((t) => {
    const src = v(`stickers/${t.id}.svg`, renderSticker(t.item, cfg, seed, t.image, t.count, t.nth));
    const img = `<img src="${src}" width="${w}" alt="${attr(t.alt)}">`;
    return t.href ? `<a href="${attr(t.href)}" title="${attr(t.alt)}">${img}</a>` : img;
  });
  const total = slotCount(tiles.length, cfg);
  for (let n = tiles.length + 1; n <= total; n++) {
    const l = v(`slots/${n}-light.svg`, renderSlot(n, cfg, false)), d = v(`slots/${n}-dark.svg`, renderSlot(n, cfg, true));
    cells.push(`<picture><source media="(prefers-color-scheme: dark)" srcset="${d}"><img src="${l}" width="${w}" alt="empty slot ${n}"></picture>`);
  }

  const cols = cfg.layout.columns;
  const rows = Array.from({ length: Math.ceil(cells.length / cols) }, (_, r) => cells.slice(r * cols, (r + 1) * cols));
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
