export const SHAPES = ["circle", "squircle", "rounded-square", "hexagon", "star-badge", "shield", "cloud", "scallop"] as const;
export type Shape = (typeof SHAPES)[number];

// 모두 96x96 캔버스 중앙(48,48), 폭 약 60px (18..78)
const f = (n: number) => +n.toFixed(2);
const pts = (n: number, r: (i: number) => number, rot = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return [f(48 + r(i) * Math.cos(a)), f(48 + r(i) * Math.sin(a))] as const;
  });
const poly = (p: readonly (readonly [number, number])[]) => "M" + p.map(([x, y]) => `${x},${y}`).join("L") + "Z";

export const PATHS: Record<Shape, string> = {
  circle: "M18,48a30,30 0 1,0 60,0a30,30 0 1,0 -60,0Z",
  squircle: "M48,18C72,18 78,24 78,48C78,72 72,78 48,78C24,78 18,72 18,48C18,24 24,18 48,18Z",
  "rounded-square": "M26,18H70Q78,18 78,26V70Q78,78 70,78H26Q18,78 18,70V26Q18,18 26,18Z",
  hexagon: poly(pts(6, () => 32)),
  "star-badge": poly(pts(24, (i) => (i % 2 ? 26 : 32))),
  shield: "M48,17L76,26V50C76,66 62,76 48,82C34,76 20,66 20,50V26Z",
  cloud: "M30,72A14,14 0 0 1 27,44A16,16 0 0 1 56,30A16,16 0 0 1 74,46A13,13 0 0 1 68,72Z",
  // 가장자리가 물결치는 원: 꼭짓점 사이를 바깥으로 볼록한 호로 잇는다
  scallop: (() => {
    const p = pts(12, () => 29);
    return `M${p[0]![0]},${p[0]![1]}` + p.map((_, i) => { const q = p[(i + 1) % 12]!; return `A6.2,6.2 0 0 1 ${q[0]},${q[1]}`; }).join("") + "Z";
  })(),
};
