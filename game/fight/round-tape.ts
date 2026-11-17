// Lays one round of the skeleton fight onto a clock. Pure. The exchanges are
// the same stepExchange results the career loop uses; this only times them.

import { stepExchange } from './skeleton-sim';
import type { PunchName, SkeletonFight } from '../types';

export const ROUND_LIMIT = 10;

export type TapeKind = 'punch' | 'dodge' | 'taunt' | 'breath';

export interface TapeBeat {
  at: number;
  actor: 'blue' | 'red';
  kind: TapeKind;
  punch: PunchName | null;
  landed: boolean;
  points: number;
  scorer: 'blue' | 'red' | null;
  blueHp: number;
  redHp: number;
  blueStamina: number;
  redStamina: number;
  line: string | null;
}

export interface RoundTape {
  roundNumber: number;
  beats: TapeBeat[];
  /** Seconds until the bell or the stoppage. Never more than ROUND_LIMIT. */
  duration: number;
  bluePoints: number;
  redPoints: number;
  margin: number;
  leader: 'blue' | 'red' | 'even';
  caption: string;
  subcaption: string;
  next: SkeletonFight;
}

const BIG: ReadonlySet<PunchName> = new Set(['cross', 'leadHook', 'overhand']);

const TAUNTS = ['Come on, then.', 'That all you got?', 'Look at me.', 'Stay right there.'];
const BIG_LINES = ['Right on the chin.', 'He felt that.', 'Big shot.'];
const DODGE_LINES = ['He slipped it.', 'Made him miss.', 'Head off the centre.'];

function tenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function other(actor: 'blue' | 'red'): 'blue' | 'red' {
  return actor === 'blue' ? 'red' : 'blue';
}

function lineFor(kind: TapeKind, punch: PunchName | null, index: number): string | null {
  if (kind === 'taunt') return TAUNTS[index % TAUNTS.length];
  if (kind === 'dodge' && index % 2 === 0) return DODGE_LINES[index % DODGE_LINES.length];
  if (kind === 'punch' && punch && BIG.has(punch) && index % 2 === 0) return BIG_LINES[index % BIG_LINES.length];
  return null;
}

function pointsFor(kind: TapeKind, punch: PunchName | null, landed: boolean): number {
  if (kind === 'breath') return 0;
  if (kind === 'taunt' || kind === 'dodge') return 1;
  if (!landed || !punch) return 0;
  return BIG.has(punch) ? 2 : 1;
}

export function tapeRound(fight: SkeletonFight): RoundTape {
  if (fight.phase !== 'fighting') throw new Error('Not fighting');
  const roundNumber = fight.round + 1;
  let cursor = fight;
  const beats: TapeBeat[] = [];
  let guard = 0;
  while (cursor.phase === 'fighting' && guard++ < 8) {
    cursor = stepExchange(cursor);
    const mark = cursor.lastExchange;
    const actor: 'blue' | 'red' = mark?.actor ?? (beats.length % 2 === 0 ? 'blue' : 'red');
    const kind: TapeKind = !mark ? 'breath' : mark.landed ? 'punch' : 'dodge';
    const punch = mark?.punch ?? null;
    const landed = mark?.landed ?? false;
    const points = pointsFor(kind, punch, landed);
    beats.push({
      at: 0,
      actor,
      kind,
      punch,
      landed,
      points,
      scorer: points === 0 ? null : kind === 'dodge' ? other(actor) : actor,
      blueHp: cursor.blue.hp,
      redHp: cursor.red.hp,
      blueStamina: cursor.blue.stamina,
      redStamina: cursor.red.stamina,
      line: lineFor(kind, punch, beats.length),
    });
  }

  const stoppage = cursor.phase === 'done';
  const count = beats.length;
  const lastSlot = stoppage ? Math.min(7.4, 1.2 + count * 1.15) : 8.2;
  for (let i = 0; i < count; i++) {
    beats[i].at = count === 1 ? 1.5 : tenth(1.15 + (i * (lastSlot - 1.15)) / (count - 1));
  }

  const taunts: TapeBeat[] = [];
  for (let i = 0; i < beats.length && taunts.length < 2; i++) {
    const beat = beats[i];
    if (beat.kind !== 'punch' || !beat.landed || i % 2 !== 1) continue;
    const nextAt = beats[i + 1]?.at ?? beat.at + 1.4;
    if (nextAt - beat.at < 1.05) continue;
    taunts.push({
      ...beat,
      at: tenth(beat.at + 0.55),
      kind: 'taunt',
      punch: null,
      landed: false,
      points: 1,
      scorer: beat.actor,
      line: TAUNTS[i % TAUNTS.length],
    });
  }
  beats.push(...taunts);
  beats.sort((a, b) => a.at - b.at);

  let bluePoints = 0;
  let redPoints = 0;
  for (const beat of beats) {
    if (beat.scorer === 'blue') bluePoints += beat.points;
    if (beat.scorer === 'red') redPoints += beat.points;
  }

  const lastAt = beats.length ? beats[beats.length - 1].at : 0;
  const duration = stoppage ? Math.min(ROUND_LIMIT, tenth(lastAt + 1.6)) : ROUND_LIMIT;
  const margin = Math.abs(bluePoints - redPoints);
  const leader: RoundTape['leader'] = bluePoints === redPoints ? 'even' : bluePoints > redPoints ? 'blue' : 'red';
  const blueName = fight.blue.name;
  const redName = fight.red.name;
  const score = `${bluePoints}–${redPoints}`;
  let caption: string;
  let subcaption: string;
  if (cursor.phase === 'done' && cursor.method === 'KO') {
    const who = cursor.winner === 'red' ? redName : blueName;
    caption = 'KNOCKOUT';
    subcaption = `${who}  ·  ${score}`;
  } else if (cursor.phase === 'done') {
    const who = cursor.winner === 'red' ? redName : blueName;
    caption = 'TECHNICAL KNOCKOUT';
    subcaption = `${who}  ·  ${score}`;
  } else if (leader === 'even') {
    caption = `ROUND ${roundNumber} EVEN`;
    subcaption = score;
  } else {
    const who = leader === 'blue' ? blueName : redName;
    caption = `${who} BY ${margin}`;
    subcaption = `ROUND ${roundNumber}  ·  ${score}`;
  }

  return {
    roundNumber,
    beats,
    duration,
    bluePoints,
    redPoints,
    margin,
    leader,
    caption,
    subcaption,
    next: cursor,
  };
}
