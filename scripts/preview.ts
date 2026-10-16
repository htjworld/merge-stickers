// 개발용: 샘플 스티커 8모양 x 4마감을 PNG 시트로 렌더 (resvg). 사용: npx tsx scripts/preview.ts out.png [theme]
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { configSchema } from "../src/config/schema.js";
import { renderSticker, prefixIds, CANVAS } from "../src/render/sticker.js";
import type { Item } from "../src/types.js";

const theme = (process.argv[3] ?? "paper") as "paper";
const cfg = configSchema.parse({ theme, stickers: {} });
const cols = 8, n = 32;
const langs = [["Go", "#00ADD8"], ["Python", "#3572A5"], ["Rust", "#DEA584"], ["TypeScript", "#3178C6"]] as const;
let body = "";
for (let i = 0; i < n; i++) {
  const [name, color] = langs[i % 4]!;
  const item = { id: `PR_${i}`, key: `o/repo${i}#${i}`, repo: `o/repo${i}`, owner: "o", title: "t", url: "u", mergedAt: "2024-01-01", isPrivate: false,
    stars: 1, language: { name, color }, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false } as Item;
  const svg = prefixIds(renderSticker(item, cfg, "demo", null), `s${i}_`).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  // id 충돌 방지: 시트에서는 장마다 <svg>로 감싼다
  body += `<svg x="${(i % cols) * CANVAS}" y="${Math.floor(i / cols) * CANVAS}" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 96 96">${svg}</svg>`;
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * CANVAS}" height="${(n / cols) * CANVAS}"><rect width="100%" height="100%" fill="${cfg.theme === "midnight" ? "#10141C" : "#FBF8F1"}"/>${body}</svg>`;
writeFileSync(process.argv[2] ?? "preview.png", new Resvg(sheet, { fitTo: { mode: "zoom", value: 1.5 } }).render().asPng());
