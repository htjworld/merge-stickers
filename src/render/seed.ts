/** 문자열 → 32bit 해시(FNV-1a) → mulberry32. 같은 입력이면 항상 같은 수열 (plan 3.2). */
export function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof rng>;
export const range = (r: Rng, lo: number, hi: number) => lo + (hi - lo) * r();
export const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
export function weighted<T extends string>(r: Rng, w: Record<T, number>): T {
  const entries = Object.entries(w) as [T, number][];
  let x = r() * entries.reduce((s, [, n]) => s + n, 0);
  for (const [k, n] of entries) if ((x -= n) < 0) return k;
  return entries[entries.length - 1]![0];
}
