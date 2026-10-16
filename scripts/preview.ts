// 개발용: 단계(1~50)별 스티커를 PNG 시트로 렌더 (resvg, 애니메이션 없는 정지 화면).
// 사용: npx tsx scripts/preview.ts out.png [theme] [image.png]
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { configSchema } from "../src/config/schema.js";
import { renderSticker, prefixIds, CANVAS } from "../src/render/sticker.js";
import type { Item } from "../src/types.js";

const theme = (process.argv[3] ?? "paper") as "paper";
const img = process.argv[4] ? `data:image/png;base64,${readFileSync(process.argv[4]).toString("base64")}` : null;
const cfg = configSchema.parse({ theme });
const counts = (process.env.COUNTS ?? "1,2,3,4,5,6,7,8,9,10,20,30,40,50").split(",").map(Number);
const repos = [["Go", "#00ADD8"], ["Python", "#3572A5"], ["Rust", "#DEA584"], ["TypeScript", "#3178C6"]] as const;
let body = "";
repos.forEach(([name, color], row) => {
  counts.forEach((n, col) => {
    const item = { id: `PR_${row}_${n}`, key: `o/r${row}#${n}`, repo: `o/r${row}`, owner: "o", title: "t", url: "u", mergedAt: "2024-01-01", isPrivate: false,
      stars: 1, language: { name, color }, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false } as Item;
    const svg = prefixIds(renderSticker(item, cfg, "demo", img, 1, n), `s${row}_${col}_`).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    body += `<svg x="${col * CANVAS}" y="${row * CANVAS}" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 96 96">${svg}</svg>`;
  });
});
const w = counts.length * CANVAS, h = repos.length * CANVAS;
const bg = cfg.theme === "midnight" ? "#10141C" : "#F6F7FB";
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;
writeFileSync(process.argv[2] ?? "preview.png", new Resvg(sheet, { fitTo: { mode: "zoom", value: Number(process.env.ZOOM ?? 1.3) } }).render().asPng());
