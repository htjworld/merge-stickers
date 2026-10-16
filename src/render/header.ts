import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";
import { THEMES } from "./themes.js";

const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export function stats(items: Item[], tz: string) {
  const first = items.reduce<string | null>((m, i) => (m === null || i.mergedAt < m ? i.mergedAt : m), null);
  const since = first ? new Date(first).toLocaleString("en-CA", { timeZone: tz, year: "numeric" }) : "-";
  return { merged: items.length, repos: new Set(items.map((i) => i.repo).filter(Boolean)).size, since };
}

/** 도장 스타일 한 줄 통계. 라이트/다크 두 벌 (plan 3.7) */
export function renderHeader(items: Item[], cfg: Config, dark: boolean): string {
  const t = THEMES[cfg.theme], k = dark ? 1 : 0;
  const s = stats(items, cfg.timezone);
  const cols = [[s.merged, "MERGED PRs"], [s.repos, "REPOS"], [s.since, "SINCE"]] as const;
  const cells = cols.map(([n, label], i) => {
    const x = 80 + i * 160;
    return `<text x="${x}" y="44" text-anchor="middle" font-size="30" font-weight="800" fill="${t.accent[k]}">${n}</text>` +
      `<text x="${x}" y="62" text-anchor="middle" font-size="11" font-weight="600" letter-spacing="1.5" fill="${t.ink[k]}" opacity=".6">${label}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 84" width="480" height="84" font-family="${FONT}">` +
    `<g transform="rotate(-1.2 240 42)"><rect x="6" y="6" width="468" height="72" rx="14" fill="${t.paper[k]}" stroke="${t.ink[k]}" stroke-opacity=".45" stroke-width="2" stroke-dasharray="7 5"/>` +
    `${cells}</g></svg>`;
}

/** 번호가 적힌 빈 점선 원 (plan 3.6). 다음에 채워질 자리를 보여준다. */
export function renderSlot(n: number, cfg: Config, dark: boolean): string {
  const t = THEMES[cfg.theme], c = t.slot[dark ? 1 : 0];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">` +
    `<circle cx="48" cy="48" r="30" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="5 4"/>` +
    `<text x="48" y="54" text-anchor="middle" font-size="17" font-weight="600" fill="${c}" font-family="${FONT}">${n}</text></svg>`;
}
