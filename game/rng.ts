export interface Rng {
  next: () => number;
  seed: () => number;
}

export function createRng(seed: number): Rng {
  let state = seed | 0;
  return {
    next: () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    seed: () => state,
  };
}

export function between(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

export function intBetween(rng: Rng, min: number, max: number): number {
  return Math.floor(between(rng, min, max + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng.next() * items.length)];
}

export function chance(rng: Rng, probability: number): boolean {
  return rng.next() < probability;
}
