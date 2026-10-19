import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { imageFor } from "./assets/image.js";
import type { Config } from "./config/schema.js";
import { filterItems, styleKeys } from "./curate/filter.js";
import { applyPrivate } from "./curate/private.js";
import { readMerges } from "./store.js";
import { buildBoard, toTiles } from "./render/board.js";
import { injectReadme } from "./render/readme.js";
import { CONFIG_PATH } from "./config/load.js";
import { buttonLinks } from "./repo.js";

/** merges.json + config + 이미지 캐시만으로 다시 그린다. 네트워크 없음 (plan 7). */
export async function runRender(cfg: Config): Promise<string> {
  const merges = readMerges();
  if (!merges) throw new Error("merges.json not found. Run `merge-stickers fetch` first.");
  const user = cfg.user ?? merges.user;

  const { items } = filterItems(applyPrivate(merges.items, cfg), cfg, user);
  const shown = items.filter((i) => !styleKeys(i).some((k) => cfg.stickers[k]?.hidden));
  const imgs = new Map(await Promise.all(shown.map(async (i) => [i.id, await imageFor(i, cfg)] as const)));
  const { files, snippet } = buildBoard(toTiles(shown, cfg, user, (i) => imgs.get(i.id) ?? null), cfg, cfg.sticker.seed ?? user,
    cfg.header.buttons ? buttonLinks(cfg.header, CONFIG_PATH) : null);

  // 생성물 폴더는 통째로 다시 쓴다 (빠진 스티커 파일이 남지 않게)
  const dir = cfg.output.dir;
  for (const sub of ["stickers", "slots", "panel"]) rmSync(join(dir, sub), { recursive: true, force: true });
  for (const [name, svg] of files) {
    const p = join(dir, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, svg);
  }
  const readme = cfg.output.readme;
  if (!existsSync(readme)) throw new Error(`${readme} not found.`);
  const changed = injectReadme(readme, snippet);
  return `stickers ${shown.length}, files written ${files.size}, ${readme} ${changed ? "updated" : "unchanged"}`;
}
