import type { Config } from "../config/schema.js";

export type Finish = "glossy" | "matte" | "holo" | "foil";

export interface Theme {
  borders: string[]; // 다이컷 테두리색
  finish: Record<Finish, number>; // 마감 가중치
  paper: [light: string, dark: string];
  ink: [light: string, dark: string];
  accent: [light: string, dark: string];
  tape: [light: string, dark: string];
  slot: [light: string, dark: string];
  shadow: number; // 그림자 불투명도
  variation: number; // 변주 강도 배율
}

// 토큰 이름은 공통, 값만 다르다 (plan 6.2.5)
export const THEMES: Record<Config["theme"], Theme> = {
  paper: {
    borders: ["#FFFFFF", "#FFFDF5", "#FFF3E0", "#E8F5E9", "#E3F2FD"],
    finish: { glossy: 60, matte: 20, holo: 15, foil: 5 },
    paper: ["#FBF8F1", "#161B22"], ink: ["#2B2A27", "#E6EDF3"], accent: ["#FF6B4A", "#FF8A6B"],
    tape: ["#F7D774", "#8A6D1F"], slot: ["#D9D2C0", "#3A4350"], shadow: 0.25, variation: 1,
  },
  holo: {
    borders: ["#FFFFFF", "#F3E8FF", "#E0F7FA", "#FCE4EC"],
    finish: { glossy: 25, matte: 5, holo: 60, foil: 10 },
    paper: ["#F6F3FF", "#14131F"], ink: ["#2A2540", "#E9E6FF"], accent: ["#9B5DE5", "#B388FF"],
    tape: ["#F15BB5", "#9D2A72"], slot: ["#D3CBEA", "#3A3555"], shadow: 0.3, variation: 1,
  },
  midnight: {
    borders: ["#E6EDF3", "#9EE7FF", "#FF9EDB", "#B9FFA8"],
    finish: { glossy: 50, matte: 10, holo: 30, foil: 10 },
    paper: ["#EEF1F6", "#10141C"], ink: ["#1B2433", "#E6EDF3"], accent: ["#00B8D9", "#39D0F0"],
    tape: ["#7AE7C7", "#1F6B58"], slot: ["#C9D1DE", "#2D3748"], shadow: 0.45, variation: 1,
  },
  minimal: {
    borders: ["#FFFFFF"],
    finish: { glossy: 0, matte: 100, holo: 0, foil: 0 },
    paper: ["#FFFFFF", "#0D1117"], ink: ["#24292F", "#E6EDF3"], accent: ["#0969DA", "#58A6FF"],
    tape: ["#D0D7DE", "#30363D"], slot: ["#D0D7DE", "#30363D"], shadow: 0.18, variation: 0.35,
  },
};
