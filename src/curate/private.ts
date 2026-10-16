import type { Config } from "../config/schema.js";
import type { Item } from "../types.js";

/**
 * private 항목 처리. 멱등이라 fetch(저장 전)와 render(읽은 후) 양쪽에서 호출한다.
 * mask는 이름, 제목, 링크, 아바타를 전부 비워서 어디에도 흔적이 남지 않게 한다 (plan 4.4).
 */
export function applyPrivate(items: Item[], cfg: Pick<Config, "visibility" | "private">): Item[] {
  if (cfg.visibility === "public" || cfg.private.display === "hide") return items.filter((i) => !i.isPrivate);
  if (cfg.private.display === "show") return items;
  return items.map((i) =>
    !i.isPrivate ? i : {
      ...i, key: `private#${i.id}`, repo: "", owner: "", title: "", url: "", avatarUrl: "", imageUrl: null,
      language: null, aliases: [], stars: 0,
    });
}
