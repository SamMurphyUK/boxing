import { CARDS } from './content/cards';
import { DIVISIONS } from './content/divisions';
import type { Career } from './types';

const SAVE_VERSION = 1;
const CARD_IDS = new Set(CARDS.map((card) => card.id));

export function serializeCareer(career: Career): string {
  return JSON.stringify(career);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function deserializeCareer(raw: string | null): Career | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== SAVE_VERSION) return null;
  if (typeof data.division !== 'string' || !(data.division in DIVISIONS)) return null;
  if (!isFiniteNumber(data.week) || !isFiniteNumber(data.seed) || !isFiniteNumber(data.cardsLeft)) return null;
  const meters = data.meters;
  if (!isRecord(meters) || !['cash', 'hype', 'stable', 'rep'].every((m) => isFiniteNumber(meters[m]))) return null;
  if (!Array.isArray(data.fighters) || data.fighters.length === 0) return null;
  if (!data.fighters.every((f) => isRecord(f) && typeof f.name === 'string' && isFiniteNumber(f.rank))) return null;
  const current = data.current;
  if (current !== null) {
    if (!isRecord(current)) return null;
    if (current.type === 'decision' && !(isFiniteNumber(current.id) && CARD_IDS.has(current.id))) return null;
    if (current.type === 'fight' && !isRecord(data.pending)) return null;
    if (current.type !== 'decision' && current.type !== 'fight') return null;
  }
  return data as unknown as Career;
}
