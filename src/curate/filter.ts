import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";

const globRe = (g: string) =>
  new RegExp("^" + g.split("*").map((s) => s.replace(/\W/g, (c) => "\\" + c)).join(".*") + "$", "i");

/** config 키는 현재 key, 예전 key(alias), PR id 중 무엇이든 매칭 (plan 4.8) */
export const idsOf = (i: Item) => [i.key, ...i.aliases, i.id];

/** stickers 설정 키: PR 키 외에 레포 이름("owner/repo")으로도 레포 전체를 지정할 수 있다 */
export const styleKeys = (i: Item) => (i.repo ? [...idsOf(i), i.repo] : idsOf(i));

/** include → exclude 순. 어떤 규칙으로 몇 건 빠졌는지 요약용으로 센다 (plan 5, 4.7). */
export function filterItems(items: Item[], cfg: Pick<Config, "include" | "exclude">, user: string) {
  const { include: inc, exclude: ex } = cfg;
  const repoRes = ex.repos.map(globRe);
  const prKeys = new Set(ex.prs.map((s) => s.toLowerCase()));
  const words = ex.titleContains.map((w) => w.toLowerCase());
  const excluded: Record<string, number> = {};
  const why = (i: Item): string | null => {
    if (!inc.own && i.owner.toLowerCase() === user.toLowerCase()) return "include.own";
    if (inc.owners.length && !inc.owners.some((o) => o.toLowerCase() === i.owner.toLowerCase())) return "include.owners";
    if (repoRes.some((re) => re.test(i.repo))) return "exclude.repos";
    if (idsOf(i).some((k) => prKeys.has(k.toLowerCase()))) return "exclude.prs";
    if (words.some((w) => i.title.toLowerCase().includes(w))) return "exclude.titleContains";
    if (ex.before && new Date(i.mergedAt) < ex.before) return "exclude.before";
    if (i.stars < ex.minStars) return "exclude.minStars";
    return null;
  };
  const kept = items.filter((i) => {
    const w = why(i);
    if (w) excluded[w] = (excluded[w] ?? 0) + 1;
    return !w;
  });
  return { items: kept, excluded };
}
