import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";
import { rng } from "./seed.js";
import { THEMES } from "./themes.js";

const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

/** 숫자 색은 시드로 고른다 (같은 사용자면 항상 같은 색, 라이트/다크 동일). 흰 배경에서도 읽히는 진한 톤. */
const INK = ["#FF5C5C", "#FF8A1F", "#E6A700", "#14B87A", "#12A8C9", "#3D8BFF", "#9B5CF6", "#F25CA8"];

const compact = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}K` : String(n);

/** merged는 PR 수. 레포 단위로 묶인 타일이면 items.length와 다르므로 따로 받는다. */
export function stats(items: Item[], tz: string, merged = items.length) {
  const day = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-CA", { timeZone: tz, ...o });
  const dates = items.map((i) => i.mergedAt).sort();
  const repos = new Map(items.filter((i) => i.repo).map((i) => [i.repo, i]));
  return {
    merged,
    repos: repos.size,
    stars: compact([...repos.values()].reduce((s, i) => s + (i.isPrivate ? 0 : i.stars), 0)), // 기여한 레포들의 스타 합
    owners: new Set([...repos.values()].map((i) => i.owner)).size,
    since: dates.length ? day(dates[0]!, { year: "numeric" }) : "-",
    latest: dates.length ? day(dates[dates.length - 1]!, { month: "short", day: "numeric" }) : "-",
  };
}

const THIRD = { stars: "STARS", since: "SINCE", latest: "LAST MERGE", owners: "OWNERS" } as const;

/** 한 줄 통계 카드: 반듯한 실선 테두리, 숫자마다 랜덤(시드) 색. 라이트/다크 두 벌 (plan 3.7) */
export function renderHeader(items: Item[], cfg: Config, dark: boolean, seed: string, merged = items.length): string {
  const t = THEMES[cfg.theme], k = dark ? 1 : 0;
  const s = stats(items, cfg.timezone, merged);
  const r = rng(`${seed}:header`);
  const pool = [...INK];
  const colors = [0, 1, 2].map(() => pool.splice(Math.floor(r() * pool.length), 1)[0]!); // 서로 다른 3색
  const cols = [[s.merged, "MERGED PRs"], [s.repos, "REPOS"], [s[cfg.header.stat], THIRD[cfg.header.stat]]] as const;
  const cells = cols.map(([n, label], i) => {
    const x = 80 + i * 160;
    return `<text x="${x}" y="46" text-anchor="middle" font-size="30" font-weight="800" fill="${colors[i]}">${n}</text>` +
      `<text x="${x}" y="64" text-anchor="middle" font-size="11" font-weight="600" letter-spacing="1.5" fill="${t.ink[k]}" opacity=".6">${label}</text>`;
  }).join("");
  const dividers = [160, 320].map((x) => `<line x1="${x}" y1="18" x2="${x}" y2="66" stroke="${t.ink[k]}" stroke-opacity=".15"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 84" width="480" height="84" font-family="${FONT}">` +
    `<rect x="2" y="2" width="476" height="80" rx="14" fill="${t.paper[k]}" stroke="${t.ink[k]}" stroke-opacity=".25" stroke-width="1.5"/>` +
    `${dividers}${cells}</svg>`;
}

/** 번호가 적힌 빈 점선 원 (plan 3.6). 다음에 채워질 자리를 보여준다. */
export function renderSlot(n: number, cfg: Config, dark: boolean): string {
  const t = THEMES[cfg.theme], c = t.slot[dark ? 1 : 0];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">` +
    `<circle cx="48" cy="48" r="30" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="5 4"/>` +
    `<text x="48" y="54" text-anchor="middle" font-size="17" font-weight="600" fill="${c}" font-family="${FONT}">${n}</text></svg>`;
}

/**
 * 헤더 양옆의 둥근 아이콘 버튼 (44x84, 헤더와 같은 높이). 라이트/다크 두 벌.
 * README는 보는 사람을 구분할 수 없어서 모두에게 보이지만, 링크 대상은 레포 주인만 편집/실행할 수 있다.
 */
export function renderButton(kind: "settings" | "fetch", cfg: Config, dark: boolean): string {
  const t = THEMES[cfg.theme], k = dark ? 1 : 0, ink = t.ink[k];
  const icon = kind === "settings"
    // 톱니바퀴: 점선 링(톱니) + 몸통 링 + 가운데 구멍
    ? `<g fill="none" stroke="${ink}" stroke-linecap="butt"><circle cx="22" cy="42" r="8.4" stroke-width="3.4" stroke-dasharray="3.3 3.3"/><circle cx="22" cy="42" r="6" stroke-width="2.4"/><circle cx="22" cy="42" r="2.4" stroke-width="1.8"/></g>`
    // 새로고침: 300도 호 + 화살촉
    : `<g fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M28.5 36.5A8 8 0 1 0 30 42"/><path d="M29 31v6h-6"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 84" width="44" height="84">` +
    `<circle cx="22" cy="42" r="17" fill="${t.paper[k]}" stroke="${ink}" stroke-opacity=".25" stroke-width="1.5"/>` +
    `<g opacity=".75">${icon}</g></svg>`;
}
