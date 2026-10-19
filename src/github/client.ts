import type { Item } from "../types.js";

const QUERY = `query($login: String!, $cursor: String) {
  user(login: $login) {
    pullRequests(states: MERGED, first: 100, after: $cursor, orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id number title url mergedAt
        repository {
          nameWithOwner isPrivate stargazerCount openGraphImageUrl usesCustomOpenGraphImage
          owner { login avatarUrl(size: 128) }
          primaryLanguage { name color }
        }
      }
    }
  }
}`;

export async function gql<T>(token: string, query: string, variables: object = {}): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "User-Agent": "merge-stickers" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`GitHub GraphQL: ${body.errors.map((e) => e.message).join("; ")}`);
  return body.data as T;
}

export async function viewerLogin(token: string): Promise<string> {
  return (await gql<{ viewer: { login: string } }>(token, "{ viewer { login } }")).viewer.login;
}

interface Node {
  id: string; number: number; title: string; url: string; mergedAt: string;
  repository: {
    nameWithOwner: string; isPrivate: boolean; stargazerCount: number;
    openGraphImageUrl: string; usesCustomOpenGraphImage: boolean;
    owner: { login: string; avatarUrl: string };
    primaryLanguage: { name: string; color: string | null } | null;
  };
}

export function toItem(n: Node): Item {
  const r = n.repository;
  return {
    id: n.id,
    key: `${r.nameWithOwner}#${n.number}`,
    repo: r.nameWithOwner,
    owner: r.owner.login,
    title: n.title,
    url: n.url,
    mergedAt: n.mergedAt,
    isPrivate: r.isPrivate,
    stars: r.stargazerCount,
    language: r.primaryLanguage,
    // 커스텀이 아니면 텍스트 카드라 못생김 (plan 3.4)
    imageUrl: r.usesCustomOpenGraphImage ? r.openGraphImageUrl : null,
    avatarUrl: r.owner.avatarUrl,
    source: "merged",
    aliases: [],
    gone: false,
  };
}

/** 내가 작성한 머지 PR 전체. 증분 없이 매번 전부 받는다 (plan 4.6). */
export async function fetchMerged(token: string, login: string): Promise<Item[]> {
  const items: Item[] = [];
  let cursor: string | null = null;
  for (;;) {
    const d: { user: { pullRequests: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: Node[] } } | null } =
      await gql(token, QUERY, { login, cursor });
    if (!d.user) throw new Error(`GitHub user not found: ${login}`);
    const { pageInfo, nodes } = d.user.pullRequests;
    items.push(...nodes.map(toItem));
    if (!pageInfo.hasNextPage) return items;
    cursor = pageInfo.endCursor;
  }
}
