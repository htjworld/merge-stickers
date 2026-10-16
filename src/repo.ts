import { execFileSync } from "node:child_process";

const git = (...args: string[]) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

/** 이 폴더의 GitHub 레포 "owner/name"과 브랜치. Actions에서는 환경변수, 로컬에서는 git remote. 못 찾으면 null. */
export function detectRepo(): { repo: string; branch: string } | null {
  const env = process.env.GITHUB_REPOSITORY;
  const m = (env ?? git("remote", "get-url", "origin")).match(/(?:github\.com[:/])?([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!m) return null;
  return { repo: m[1]!, branch: process.env.GITHUB_REF_NAME || git("branch", "--show-current") || "main" };
}

/** 헤더 양옆 버튼의 링크: 설정(config.yml 편집)과 fetch(워크플로우 실행). 둘 다 레포 주인만 실제로 동작한다. */
export function buttonLinks(o: { settingsUrl?: string; fetchUrl?: string }, configPath: string) {
  const r = detectRepo();
  const settings = o.settingsUrl ?? (r && `https://github.com/${r.repo}/edit/${r.branch}/${configPath}`);
  const fetch = o.fetchUrl ?? (r && `https://github.com/${r.repo}/actions/workflows/merge-stickers.yml`);
  return settings && fetch ? { settings, fetch } : null;
}
