import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { imageFor } from "./assets/image.js";
import type { Config } from "./config/schema.js";
import { filterItems, styleKeys } from "./curate/filter.js";
import { applyPrivate } from "./curate/private.js";
import { readMerges } from "./store.js";
import { buildBoard, toTiles } from "./render/board.js";
import { injectReadme } from "./render/readme.js";

/** merges.json + config + 이미지 캐시만으로 다시 그린다. 네트워크 없음 (plan 7). */
export async function runRender(cfg: Config): Promise<string> {
  const merges = readMerges();
  if (!merges) throw new Error("merges.json이 없습니다. 먼저 `merge-stickers fetch`를 실행하세요.");
  const user = cfg.user ?? merges.user;

  const { items } = filterItems(applyPrivate(merges.items, cfg), cfg, user);
  const shown = items.filter((i) => !styleKeys(i).some((k) => cfg.stickers[k]?.hidden));
  const imgs = new Map(await Promise.all(shown.map(async (i) => [i.id, await imageFor(i, cfg)] as const)));
  const { files, snippet } = buildBoard(toTiles(shown, cfg, user, (i) => imgs.get(i.id) ?? null), cfg, cfg.sticker.seed ?? user);

  // 생성물 폴더는 통째로 다시 쓴다 (빠진 스티커 파일이 남지 않게)
  const dir = cfg.output.dir;
  for (const sub of ["stickers", "slots"]) rmSync(join(dir, sub), { recursive: true, force: true });
  for (const [name, svg] of files) {
    const p = join(dir, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, svg);
  }
  const readme = cfg.output.readme;
  if (!existsSync(readme)) throw new Error(`${readme}이 없습니다.`);
  const changed = injectReadme(readme, snippet);
  return `스티커 ${shown.length}장, 파일 ${files.size}개 생성, ${readme} ${changed ? "갱신됨" : "변경 없음"}`;
}
