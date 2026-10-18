import { createHash } from "node:crypto";
import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";
import { renderButton, renderHeader, renderSlot, stats } from "./header.js";
import { renderSticker, prefixIds, CANVAS } from "./sticker.js";
import { THEMES } from "./themes.js";
import { EMPTY, onPanel, CAP, RAIL, renderPanel, SIDE } from "./panel.js";
import { LOGO, renderWordmark } from "./wordmark.js";

export const HOME = "https://github.com/htjworld/merge-stickers";

export interface Tile { id: string; item: Item; image: string | null; count: number; nth: number; href: string; alt: string }
export type Files = Map<string, string>; // 출력 폴더 기준 상대경로 → 내용

const hash = (s: string, n = 8) => createHash("sha1").update(s).digest("hex").slice(0, n);
const DARK = "(prefers-color-scheme: dark)";
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
  const w = cfg.sticker.size, cols = cfg.layout.columns, hasBtn = !!(cfg.header.buttons && buttons), LH = 88;
  // 스티커판: 애플 타일 같은 둥근 판 하나에 로고, 헤더, 스티커 줄을 담는다. README는 그림 뒤에 배경을 깔 수 없어서
  // 한 <p> 안에서 줄마다 판 조각을 양옆에 붙이고(<br>로 줄바꿈, align="top"으로 줄 사이 틈을 없앰), 판 위 그림에는 판 색을 깐다.
  const inner = Math.max(cols * w, 480 + (hasBtn ? 88 : 0)), F = inner + 2 * SIDE;
  const framed = cfg.header.logo && cfg.output.mode === "html" && F <= 846;
  // ponytail: GitHub 프로필 README 본문폭 = 화면폭 - 434 (1012~1280px에서 잰 값, 그 위는 846 고정). 판이 안 들어가는 화면에선
  // 판 조각은 0x0 그림으로, 판 색을 깐 그림은 원래 그림으로 바꿔 예전 배치로 돌아간다. GitHub 레이아웃이 바뀌면 이 숫자만 다시 잰다.
  const NARROW = `(max-width: ${F + 433.98}px)`, WIDE = `(min-width: ${F + 434}px)`;
  const src = (media: string, s: string) => `<source media="${media}" srcset="${s}">`;
  const empty = framed ? v("panel/empty.svg", EMPTY) : "";
  const gone = (media: string) => (framed ? src(media, empty) : "");
  const pic = (l: string, d: string, attrs: string, first = "") => `<picture>${first}${src(DARK, d)}<img src="${l}"${attrs}></picture>`;
  const pair = (name: string, mk: (dark: boolean) => string, on = false) =>
    [v(`${name}-light.svg`, on ? onPanel(mk(false), false) : mk(false)), v(`${name}-dark.svg`, on ? onPanel(mk(true), true) : mk(true))] as const;
  // 넓은 화면엔 판 색을 깐 그림, 좁은 화면엔 원래 그림. 테마 조건을 화면폭 조건과 and로 묶지 않으려고(GitHub이 테마 설정에 맞춰
  // prefers-color-scheme 조건을 다룬다) 두 장으로 나누고 한 쪽을 0x0으로 지운다. 그래서 크기는 SVG 자체 width/height로 정한다.
  const twin = (name: string, mk: (dark: boolean) => string, alt: string) => {
    const [ol, od] = pair(`panel/${name}`, mk, true), [l, d] = pair(name, mk);
    return pic(ol, od, ` align="top" alt="${alt}"`, gone(NARROW)) + pic(l, d, ' align="top" alt=""', gone(WIDE));
  };
  // 설정(왼쪽)과 fetch(오른쪽). 주인이 아니면 편집/실행 권한이 없다. 예전 배치에선 float으로 헤더 양옆에, 판에선 판 안쪽 끝에 놓는다.
  const btn = (kind: "settings" | "fetch", side: string, on = false) => {
    const [l, d] = pair(`${on ? "panel/" : ""}button-${kind}`, (dk) => renderButton(kind, cfg, dk), on);
    const size = framed ? "" : ' width="44" height="84"'; // 지울 수 있는 그림은 크기 속성을 빼야 자리도 사라진다 (버튼 SVG에 44x84가 들어 있다)
    return `<a href="${attr(buttons![kind])}" title="${kind === "settings" ? "settings (owner only)" : "fetch now (owner only)"}">${pic(l, d, ` align="${side}"${size} alt="${kind}"`, gone(on ? NARROW : WIDE))}</a>`;
  };
  const floats = hasBtn ? btn("settings", "left") + btn("fetch", "right") : "";
  const logoSvg = (dk: boolean) => renderWordmark(dk).replace("<svg ", `<svg width="${LOGO}" height="${LH}" `);
  const header = (cfg.header.logo ? `<p align="center"><a href="${HOME}" title="merge-stickers">${pic(...pair("logo", logoSvg), ` width="${LOGO}" alt="MERGE STICKERS"`)}</a></p>\n` : "") +
    `<p align="center">${floats}${pic(hl, hd, ` alt="${st.merged} merged PRs across ${st.repos} repos"`)}</p>`;

  if (cfg.output.mode === "sheet") return { files, snippet: sheet(tiles, cfg, seed, files, dir) };

  const cells = tiles.map((t) => {
    const svg = renderSticker(t.item, cfg, seed, t.image, t.count, t.nth), plain = v(`stickers/${t.id}.svg`, svg);
    const img = framed // 스티커는 테마와 상관없는 한 장이라 화면폭 조건 하나로 원래 그림으로 돌아간다
      ? pic(v(`panel/stickers/${t.id}-light.svg`, onPanel(svg, false)), v(`panel/stickers/${t.id}-dark.svg`, onPanel(svg, true)), ` align="top" width="${w}" alt="${attr(t.alt)}"`, src(NARROW, plain))
      : `<img src="${plain}" width="${w}" alt="${attr(t.alt)}">`;
    return t.href ? `<a href="${attr(t.href)}" title="${attr(t.alt)}">${img}</a>` : img;
  });
  const total = slotCount(tiles.length, cfg);
  for (let n = tiles.length + 1; n <= total; n++) {
    if (framed) { cells.push(twin(`slots/${n}`, (dk) => renderSlot(n, cfg, dk).replace(/ width="\d+" height="\d+"/, ` width="${w}" height="${w}"`), `empty slot ${n}`)); continue; }
    const l = v(`slots/${n}-light.svg`, renderSlot(n, cfg, false)), d = v(`slots/${n}-dark.svg`, renderSlot(n, cfg, true));
    cells.push(`<picture><source media="(prefers-color-scheme: dark)" srcset="${d}"><img src="${l}" width="${w}" alt="empty slot ${n}"></picture>`);
  }

  const rows = Array.from({ length: Math.ceil(cells.length / cols) }, (_, r) => cells.slice(r * cols, (r + 1) * cols));
  if (framed) {
    type Cell = number | [html: string, width: number]; // 숫자는 판 조각 폭, [html, 폭]은 판 위에 놓일 그림
    const g = (inner - 480 - (hasBtn ? 88 : 0)) / 2, lw = (F - LOGO) / 2, inl = (kind: "settings" | "fetch"): Cell[] => (hasBtn ? [[btn(kind, "top", true), 44]] : []);
    const content: [h: number, cells: Cell[], prefix?: string][] = [
      [LH, [Math.floor(lw), [`<a href="${HOME}" title="merge-stickers">${twin("logo", logoSvg, "MERGE STICKERS")}</a>`, LOGO], Math.ceil(lw)]],
      [84, [SIDE, ...inl("settings"), Math.floor(g), [twin("header", (dk) => renderHeader(items, cfg, dk, seed, prs), `${st.merged} merged PRs across ${st.repos} repos`), 480], Math.ceil(g), ...inl("fetch"), SIDE], floats],
      ...rows.map((r): [number, Cell[]] => { const p = inner - r.length * w; return [w, [SIDE + Math.floor(p / 2), [r.join(""), r.length * w], Math.ceil(p / 2) + SIDE]]; }),
    ];
    const H = 2 * CAP + content.reduce((n, [h]) => n + h, 0) + (content.length - 1) * RAIL;
    let y = 0;
    const line = (h: number, cs: Cell[]) => {
      let x = 0, gap = 0, out = "";
      const flush = () => { // 판에서 (x - gap, y)부터 gap x h 칸을 잘라낸 조각. 같은 모양은 파일 하나를 같이 쓴다.
        if (gap <= 0) return;
        const l = renderPanel(F, H, x - gap, y, gap, h, false), name = `panel/${hash(l)}`;
        out += pic(v(`${name}-light.svg`, l), v(`${name}-dark.svg`, renderPanel(F, H, x - gap, y, gap, h, true)), ' align="top" alt=""', gone(NARROW));
        gap = 0;
      };
      for (const c of cs) if (typeof c === "number") { gap += c; x += c; } else { flush(); out += c[0]; x += c[1]; }
      flush();
      y += h;
      return out;
    };
    const out = [line(CAP, [F])];
    content.forEach(([h, cs, prefix = ""], i) => { if (i) out.push(line(RAIL, [F])); out.push(prefix + line(h, cs)); });
    out.push(line(CAP, [F]));
    // 맨 앞 <br>이 위쪽 README 요소와의 여백
    return { files, snippet: `<p align="center"><br>\n${out.join("<br>\n")}</p>` };
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
