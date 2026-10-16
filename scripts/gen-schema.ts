// config 스키마를 JSON Schema로 내보낸다 (에디터 자동완성, Claude Code 오타 방지). 사용: npm run schema
import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { configSchema } from "../src/config/schema.js";

mkdirSync("schema", { recursive: true });
const json = z.toJSONSchema(configSchema, { io: "input", unrepresentable: "any" });
writeFileSync("schema/merge-stickers.schema.json", JSON.stringify(json, null, 2) + "\n");
