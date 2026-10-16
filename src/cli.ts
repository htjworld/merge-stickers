#!/usr/bin/env node
import { loadConfig } from "./config/load.js";
import { runFetch } from "./fetch.js";

const commands: Record<string, () => Promise<string>> = {
  fetch: () => runFetch(loadConfig()),
};

const cmd = process.argv[2] ?? "";
const run = commands[cmd];
if (!run) {
  console.error(`사용법: merge-stickers <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
run().then(console.log, (e: Error) => {
  console.error(e.message);
  process.exit(1);
});
