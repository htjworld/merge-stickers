import type { Config } from "./config/schema.js";
import { applyPrivate } from "./curate/private.js";
import { filterItems } from "./curate/filter.js";
import { detectUser, findToken } from "./auth.js";
import { fetchMerged, viewerLogin } from "./github/client.js";
import { fetchReadmeImages } from "./github/readme.js";
import { downloadAll, imageSource } from "./assets/image.js";
import { mergeItems, readMerges, writeMerges } from "./store.js";

/** 수집 → private 처리 → 이전 데이터와 병합 → 저장. 요약 문자열을 돌려준다 (plan 4.7). */
export async function runFetch(cfg: Config): Promise<string> {
  const token = findToken();
  const user = await detectUser(cfg.user, () => viewerLogin(token));
  const raw = await fetchMerged(token, user);
  // README 첫 이미지: 공개 레포만 (private은 마스킹되므로 조회하지 않는다)
  const readmes = await fetchReadmeImages(token, [...new Set(raw.filter((i) => !i.isPrivate).map((i) => i.repo))]);
  for (const i of raw) i.readmeImage = readmes.get(i.repo) ?? null;
  const prev = applyPrivate(readMerges()?.items ?? [], cfg);
  const items = mergeItems(prev, applyPrivate(raw, cfg));
  const changed = writeMerges({ generatedAt: new Date().toISOString(), user, items });

  const { items: shown, excluded } = filterItems(items, cfg, user);
  const imgs = await downloadAll(shown.map((i) => imageSource(i, cfg)));
  const lines = [
    `${user}: merges collected ${raw.length}, stored ${items.length} (kept after disappearing: ${items.filter((i) => i.gone).length})`,
    `shown ${shown.length}, repos ${new Set(shown.map((i) => i.repo).filter(Boolean)).size}`,
    ...Object.entries(excluded).map(([k, n]) => `  excluded by ${k}: ${n}`),
    `images: new ${imgs.new}, cached ${imgs.hit}, failed ${imgs.fail}`,
    changed ? "merges.json updated" : "no changes",
  ];
  const privCount = raw.filter((i) => i.isPrivate).length;
  if (cfg.visibility === "public" && privCount) lines.push(`  left out by visibility: public: ${privCount} private`);
  if (cfg.visibility === "private") lines.push(`  left out by visibility: private: ${raw.length - privCount} public`);
  return lines.join("\n");
}
