#!/usr/bin/env node
import { loadConfig } from "./config/load.js";
import { runFetch } from "./fetch.js";
import { runCheck } from "./check.js";
import { runInit } from "./init.js";
import { runSet } from "./set.js";
import { runRender } from "./render.js";

const commands: Record<string, () => Promise<string>> = {
  init: () => runInit(process.argv.slice(3)),
  set: async () => runSet(process.argv.slice(3)),
  fetch: () => runFetch(loadConfig()),
  render: () => runRender(loadConfig()),
  check: async () => runCheck(loadConfig()),
};

const cmd = process.argv[2] ?? "";
const run = commands[cmd];
if (!run) {
  console.error(`usage: merge-stickers <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
run().then(console.log, (e: Error) => {
  console.error(e.message);
  process.exit(1);
});
