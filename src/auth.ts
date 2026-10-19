import { execFileSync } from "node:child_process";

/** 토큰 탐색: 환경변수 → `gh auth token` (plan 4.7). device flow는 OAuth App이 생기면 추가. */
export function findToken(): string {
  const env = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (env) return env;
  try {
    const t = execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (t) return t;
  } catch {}
  throw new Error("No GitHub token found. Set GH_TOKEN or run `gh auth login`.");
}

/** 사용자 감지: config.user → Actions의 repository_owner → 토큰 소유자 */
export function detectUser(configUser: string | undefined, viewer: () => Promise<string>): Promise<string> | string {
  return configUser ?? process.env.GITHUB_REPOSITORY_OWNER ?? viewer();
}
