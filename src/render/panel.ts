// 스티커판: 애플 타일처럼 연속 곡률 모서리에 단색을 채운 판. 다크 모드는 짙은 회색 (올블랙 아님).
export const PANEL: [light: string, dark: string] = ["#FBFBF8", "#1C1C1E"];
// 줄 사이와 위아래 조각은 GitHub 본문 줄높이(16px x 1.5 = 24)보다 낮으면 줄 사이에 틈이 생겨 판이 끊긴다
export const SIDE = 32, CAP = 32, RAIL = 24; // 옆 여백, 위아래 여백, 줄 사이 간격
const R = 30; // apple.com 타일 반지름 (--tile-border-radius)

// iOS 연속 곡률 모서리 (PaintCode "iOS 7 rounded rectangles"의 상수). 한 모서리가 반지름의 1.53배 길이에 걸쳐 휜다.
const K = [[1.52866471, 0], [1.08849323, 0], [0.86840689, 0], [0.66993427, 0.065496], [0.63149399, 0.074911], [0.37282392, 0.16905899],
  [0.16906013, 0.37282401], [0.07491176, 0.63149399], [0, 0.86840701], [0, 1.08849299], [0, 1.52866483]] as const;

function squircle(w: number, h: number): string {
  const r = Math.min(R, Math.min(w, h) / 2 / 1.52866483), n = (x: number) => +x.toFixed(2);
  // 시계 방향으로 오른쪽 위, 오른쪽 아래, 왼쪽 아래, 왼쪽 위. (x, y)는 들어오는 변을 따라 모서리까지 남은 거리, 다른 변 쪽으로 들어간 거리
  const corners = [(x: number, y: number) => [w - x * r, y * r], (x: number, y: number) => [w - y * r, h - x * r],
    (x: number, y: number) => [x * r, h - y * r], (x: number, y: number) => [y * r, x * r]];
  return corners.map((f, i) => {
    const p = K.map(([x, y]) => f(x, y).map(n).join(" "));
    return `${i ? "L" : "M"}${p[0]}C${p[1]} ${p[2]} ${p[3]}L${p[4]}C${p[5]} ${p[6]} ${p[7]}C${p[8]} ${p[9]} ${p[10]}`;
  }).join("") + "Z";
}

/** w x h 판에서 (x, y, pw, ph) 칸만 잘라 그린 조각. README에서 조각을 이어 붙이면 판 한 장이 된다. */
export const renderPanel = (w: number, h: number, x: number, y: number, pw: number, ph: number, dark: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${pw} ${ph}" width="${pw}" height="${ph}"><path d="${squircle(w, h)}" fill="${PANEL[dark ? 1 : 0]}"/></svg>`;

/** 판 위에 놓일 그림: 투명한 곳에 판 색을 깐다. */
export const onPanel = (svg: string, dark: boolean) =>
  svg.replace(/^<svg[^>]*>/, (m) => `${m}<rect x="-1e4" y="-1e4" width="2e4" height="2e4" fill="${PANEL[dark ? 1 : 0]}"/>`);

/** 화면폭에 따라 그림을 지울 때 넣는 0x0 그림. */
export const EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"/>`;
