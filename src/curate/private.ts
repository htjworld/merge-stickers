import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";

/**
 * private 항목 처리. 멱등이라 fetch(저장 전)와 render(읽은 후) 양쪽에서 호출한다.
 * mask는 이름, 제목, 링크, 아바타를 전부 비워서 어디에도 흔적이 남지 않게 한다 (plan 4.4).
 */
export function applyPrivate(items: Item[], cfg: Pick<Config, "visibility" | "private">): Item[] {
  const { visibility, private: pv } = cfg;
  if (visibility === "public" || (pv.display === "hide" && visibility === "all")) return items.filter((i) => !i.isPrivate);
  const scoped = visibility === "private" ? items.filter((i) => i.isPrivate) : items; // private만 보기
  if (pv.display === "hide") return [];
  if (pv.display === "show") return scoped;
  return scoped.map((i) =>
    !i.isPrivate ? i : {
      ...i, key: `private#${i.id}`, repo: "", owner: "", title: "", url: "", avatarUrl: "", imageUrl: null,
      language: null, aliases: [], stars: 0,
    });
}
