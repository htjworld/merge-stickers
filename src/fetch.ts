import type { Config } from "./config/schema.js";
import { applyPrivate } from "./curate/private.js";
import { filterItems } from "./curate/filter.js";
import { detectUser, findToken } from "./auth.js";
import { fetchMerged, viewerLogin } from "./github/client.js";
import { downloadAll, imageSource } from "./assets/image.js";
import { mergeItems, readMerges, writeMerges } from "./store.js";

/** 수집 → private 처리 → 이전 데이터와 병합 → 저장. 요약 문자열을 돌려준다 (plan 4.7). */
export async function runFetch(cfg: Config): Promise<string> {
  const token = findToken();
  const user = await detectUser(cfg.user, () => viewerLogin(token));
  const raw = await fetchMerged(token, user);
  const prev = applyPrivate(readMerges()?.items ?? [], cfg);
  const items = mergeItems(prev, applyPrivate(raw, cfg));
  const changed = writeMerges({ generatedAt: new Date().toISOString(), user, items });

  const { items: shown, excluded } = filterItems(items, cfg, user);
  const imgs = await downloadAll(shown.flatMap((i) => imageSource(i, cfg).url ?? []));
  const lines = [
    `${user}: 머지 ${raw.length}건 수집, 보관 ${items.length}건 (사라진 항목 ${items.filter((i) => i.gone).length}건 보존)`,
    `표시 ${shown.length}건, 레포 ${new Set(shown.map((i) => i.repo)).size}개`,
    ...Object.entries(excluded).map(([k, n]) => `  제외 ${k}: ${n}건`),
    `이미지: 새로 ${imgs.new}, 캐시 ${imgs.hit}, 실패 ${imgs.fail}`,
    changed ? "merges.json 갱신됨" : "변경 없음",
  ];
  const privCount = raw.filter((i) => i.isPrivate).length;
  if (cfg.visibility === "public" && privCount) lines.push(`  private ${privCount}건은 visibility: public이라 빠짐`);
  return lines.join("\n");
}
