import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG_PATH, loadConfig } from "./config/load.js";
import { runFetch } from "./fetch.js";
import { runRender } from "./render.js";
import { END, START } from "./render/readme.js";

const template = (name: string) => readFileSync(new URL(`../templates/${name}`, import.meta.url), "utf8");

/** 이미 있는 파일은 건드리지 않는다 (config.yml은 사람의 파일, plan 7). */
function put(path: string, body: string, log: string[]) {
  if (existsSync(path)) return log.push(`  kept     ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  log.push(`  created  ${path}`);
}

/** workflow, config, README 마커, CLAUDE.md를 만들고 바로 첫 fetch/render까지 돌린다 (plan 4.7). */
export async function runInit(args: string[]): Promise<string> {
  const all = args.includes("--all");
  const log = ["merge-stickers setup:"];
  put(CONFIG_PATH, template("config.yml").replace("__VISIBILITY__", all ? "all" : "public"), log);
  put(".github/workflows/merge-stickers.yml", template("workflow.yml"), log);
  put("CLAUDE.md", template("CLAUDE.md"), log);
  put(".claude/commands/curate.md", template("curate.md"), log);

  const block = `${START}\n${END}\n`;
  const readme = "README.md";
  if (!existsSync(readme)) writeFileSync(readme, `${block}`);
  else if (!readFileSync(readme, "utf8").includes(START)) writeFileSync(readme, readFileSync(readme, "utf8").replace(/\s*$/, "\n\n") + block);
  log.push(`  markers  ${readme}`);

  try {
    const cfg = loadConfig();
    log.push("", await runFetch(cfg), await runRender(cfg));
  } catch (e) {
    log.push("", `first run skipped: ${(e as Error).message}`, "Get a token ready, then run `npx github:htjworld/merge-stickers fetch` and `... render`.");
  }
  if (all)
    log.push("", "visibility: all needs a PAT:",
      "  1) create a token at https://github.com/settings/tokens/new?scopes=repo&description=merge-stickers",
      "  2) gh secret set GH_PAT   (if an org uses SAML SSO, authorize the token for that org)");
  return log.join("\n");
}
