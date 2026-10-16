export interface Item {
  id: string;
  key: string; // owner/repo#123 (현재 이름)
  repo: string;
  owner: string;
  title: string;
  url: string;
  mergedAt: string;
  isPrivate: boolean;
  stars: number;
  language: { name: string; color: string | null } | null;
  imageUrl: string | null; // 커스텀 소셜 프리뷰일 때만
  readmeImage?: string | null; // README의 첫 (배지 아닌) 이미지
  avatarUrl: string;
  source: "merged" | "copilot" | "landed" | "coauthored";
  aliases: string[];
  gone: boolean;
}

export interface Merges {
  generatedAt: string;
  user: string;
  items: Item[];
}
