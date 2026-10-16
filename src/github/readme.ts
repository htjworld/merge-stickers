import { gql } from "./client.js";

// README 맨 위에 흔히 있는 배지/통계 이미지는 레포 대표 이미지가 아니다
const BADGE = /shields\.io|badgen|badge|trendshift|travis-ci|codecov|coveralls|circleci|\/actions\/workflows\/|star-history|contrib\.rocks|visitor|hits\.|readme-stats|streak-stats/i;
const NAMES = ["README.md", "readme.md", "Readme.md", "README.markdown", "README.MD"];

/** README에서 첫 번째 (배지가 아닌) 이미지의 절대 URL. 없으면 null. */
export function firstImage(md: string, repo: string): string | null {
  // 마크다운 ![](url)와 HTML <img src>를 문서 순서대로 훑는다
  const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)|<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
  for (const m of md.matchAll(re)) {
    const raw = (m[1] ?? m[2] ?? "").replace(/&amp;/g, "&");
    if (!raw || raw.startsWith("data:") || BADGE.test(raw)) continue;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return "https:" + raw;
    return `https://raw.githubusercontent.com/${repo}/HEAD/${raw.replace(/^\.?\//, "")}`;
  }
  return null;
}

/** 레포 여러 개의 README를 쿼리 하나로 받는다 (별칭 사용). 이름 변경/실패는 null. */
export async function fetchReadmeImages(token: string, repos: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < repos.length; i += 20) {
    const chunk = repos.slice(i, i + 20);
    const body = chunk.map((r, j) => {
      const [owner, name] = r.split("/");
      const files = NAMES.map((n, k) => `f${k}: object(expression: "HEAD:${n}") { ... on Blob { text } }`).join(" ");
      return `r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${files} }`;
    }).join("\n");
    try {
      const d = await gql<Record<string, Record<string, { text?: string } | null> | null>>(token, `query { ${body} }`);
      chunk.forEach((r, j) => {
        const files = d[`r${j}`];
        const text = files ? Object.values(files).find((f) => f?.text)?.text : undefined;
        out.set(r, text ? firstImage(text, r) : null);
      });
    } catch {
      chunk.forEach((r) => out.set(r, null)); // README 이미지는 부가 기능이라 실패해도 수집은 계속
    }
  }
  return out;
}
