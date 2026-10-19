// 개발용: README용 단계 사다리 PNG (투명 배경, 라이트/다크 공용). 사용: npx tsx scripts/tiers-image.ts out.png [image.png]
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { configSchema } from "../src/config/schema.js";
import { CANVAS, prefixIds, renderSticker } from "../src/render/sticker.js";
import type { Item } from "../src/types.js";

const cfg = configSchema.parse({ sticker: { animate: false } });
const img = process.argv[3] ? `data:image/png;base64,${readFileSync(process.argv[3]).toString("base64")}` : null;
const steps = [1, 2, 10, 20, 30, 40, 50];
const body = steps.map((n, i) => {
  const item = { id: `PR_${n}`, key: `o/r#${n}`, repo: "o/r", owner: "o", title: "t", url: "u", mergedAt: "2024-01-01", isPrivate: false,
    stars: 1, language: { name: "TypeScript", color: "#3178C6" }, imageUrl: null, avatarUrl: "", source: "merged", aliases: [], gone: false } as Item;
  const svg = prefixIds(renderSticker(item, cfg, "tiers", img, 1, n), `t${i}_`).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return `<svg x="${i * CANVAS}" y="0" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 96 96">${svg}</svg>`;
}).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${steps.length * CANVAS}" height="${CANVAS}">${body}</svg>`;
writeFileSync(process.argv[2] ?? "tiers.png", new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render().asPng());
