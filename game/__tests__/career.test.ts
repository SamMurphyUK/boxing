import { describe, expect, it } from 'vitest';

import {
  CARDS,
  CHARACTERS,
  PROSPECTS,
  SIGNABLE,
  answerCorner,
  chooseFight,
  continueAfterFight,
  decide,
  deserializeCareer,
  newCareer,
  resolveFight,
  runRound,
  secondChance,
  serializeCareer,
  startFight,
  viewCard,
  type Career,
  type FightState,
} from '../index';

function playDecisionsUntilFight(start: Career): Career {
  let career = start;
  for (let i = 0; i < 20 && career.current?.type === 'decision'; i++) {
    const result = decide(career, i % 2 ? 'left' : 'right');
    if (result.kind === 'ended') throw new Error(`Career ended early: ${result.ending.key}`);
    career = result.career;
  }
  return career;
}

function finishFight(fight: FightState): FightState {
  let current = fight;
  while (!current.outcome) {
    const report = runRound(current);
    current = report.fight;
    if (report.prompt) current = answerCorner(current, report.prompt, 'right').fight;
  }
  return current;
}

function balancedCareer(seed: number): Career {
  const career = newCareer('Welterweight', 0, seed);
  return { ...career, meters: { cash: 50, hype: 50, stable: 50, rep: 50 } };
}

describe('content', () => {
  it('ports every card, character and fighter from the web version', () => {
    expect(CARDS).toHaveLength(140);
    expect(Object.keys(CHARACTERS)).toHaveLength(16);
    expect(PROSPECTS.length + SIGNABLE.length).toBe(8);
    for (const card of CARDS) expect(CHARACTERS[card.who]).toBeDefined();
  });
});

describe('career', () => {
  it('is deterministic for a seed', () => {
    expect(newCareer('Lightweight', 1, 42)).toEqual(newCareer('Lightweight', 1, 42));
    expect(viewCard(newCareer('Lightweight', 1, 42))?.text).toBeTruthy();
  });

  it('progresses through the decision cards of a week into a fight', () => {
    const start = balancedCareer(7);
    expect(start.current?.type).toBe('decision');
    expect(start.cardsLeft).toBeGreaterThanOrEqual(4);
    expect(start.cardsLeft).toBeLessThanOrEqual(6);
    const atFight = playDecisionsUntilFight(start);
    expect(atFight.current?.type).toBe('fight');
    expect(atFight.pending).not.toBeNull();
    expect(viewCard(atFight)?.isFight).toBe(true);
    expect(atFight.seen).toBe(start.cardsLeft);
  });

  it('applies scaled effects to the meters', () => {
    const start = balancedCareer(3);
    const current = start.current;
    if (current?.type !== 'decision') throw new Error('expected a decision');
    const card = CARDS.find((c) => c.id === current.id)!;
    const result = decide(start, 'right');
    if (result.kind !== 'continue') throw new Error('unexpected ending');
    const fx = card.right.fx;
    expect(result.career.meters.cash).toBe(50 + Math.round((fx.c ?? 0) * 0.7));
    expect(result.career.meters.hype).toBe(50 + Math.round((fx.h ?? 0) * 0.7));
  });

  it('ends the career when a meter hits 0 or 100, and second chance resumes it', () => {
    const spender = CARDS.find((c) => !c.req && (c.left.fx.c ?? 0) <= -6)!;
    const broke: Career = {
      ...balancedCareer(11),
      meters: { cash: 2, hype: 50, stable: 50, rep: 50 },
      current: { type: 'decision', id: spender.id },
    };
    const result = decide(broke, 'left');
    expect(result.kind).toBe('ended');
    if (result.kind !== 'ended') return;
    expect(result.ending.key).toBe('cash_lo');
    expect(result.ending.title).toBe('Bust');

    const hyper = CARDS.find((c) => !c.req && (c.right.fx.h ?? 0) >= 8)!;
    const famous: Career = {
      ...balancedCareer(12),
      meters: { cash: 50, hype: 97, stable: 50, rep: 50 },
      current: { type: 'decision', id: hyper.id },
    };
    const circus = decide(famous, 'right');
    expect(circus.kind === 'ended' && circus.ending.key).toBe('hype_hi');
    expect(result.ending.shareText).toContain('THE PROMOTER');
    expect(result.ending.shareText).not.toMatch(/\p{Extended_Pictographic}/u);
    const resumed = secondChance(result.ending);
    expect(resumed.current).not.toBeNull();
    expect(Object.values(resumed.meters).every((v) => v > 0 && v < 100)).toBe(true);
  });
});

describe('fight', () => {
  it('runs to a valid outcome and resolves into the next week', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const career = playDecisionsUntilFight(balancedCareer(seed));
      const offer = chooseFight(career, seed % 2 ? 'left' : 'right');
      const { fight, opening } = startFight(career, offer, seed * 97);
      expect(opening.text).toContain(offer.opp.name);
      const done = finishFight(fight);
      const outcome = done.outcome!;
      expect(['KO', 'TKO', 'Points']).toContain(outcome.method);
      expect(outcome.round).toBeGreaterThanOrEqual(1);
      expect(outcome.round).toBeLessThanOrEqual(offer.rounds + 1);
      if (outcome.draw) expect(outcome.method).toBe('Points');

      const { career: after, result } = resolveFight(career, done);
      expect(after.week).toBe(career.week + 1);
      expect(after.fights).toBe(career.fights + 1);
      expect(after.current).toBeNull();
      expect(['win', 'loss', 'draw']).toContain(result.outcome);
      const next = continueAfterFight(after);
      if (next.kind === 'continue') expect(next.career.current).not.toBeNull();
    }
  });

  it('throwing in the towel stops the fight as a TKO loss', () => {
    const career = playDecisionsUntilFight(balancedCareer(5));
    const { fight } = startFight(career, chooseFight(career, 'left'), 1);
    const prompt = { kind: 'towel' as const, text: '', left: 'Throw in the towel', right: 'Let him fight' };
    const { fight: stopped, lines } = answerCorner({ ...fight, round: 3 }, prompt, 'left');
    expect(stopped.outcome).toEqual({ win: false, draw: false, method: 'TKO', round: 4, towel: true });
    expect(lines).toHaveLength(1);
  });
});

describe('save', () => {
  it('round-trips a career mid-week and at fight night', () => {
    const start = balancedCareer(21);
    expect(deserializeCareer(serializeCareer(start))).toEqual(start);
    const atFight = playDecisionsUntilFight(start);
    expect(deserializeCareer(serializeCareer(atFight))).toEqual(atFight);
  });

  it('rejects corrupt or foreign saves', () => {
    expect(deserializeCareer(null)).toBeNull();
    expect(deserializeCareer('not json')).toBeNull();
    expect(deserializeCareer('{"version":2}')).toBeNull();
    const career = balancedCareer(1);
    expect(deserializeCareer(JSON.stringify({ ...career, current: { type: 'decision', id: 9999 } }))).toBeNull();
    expect(deserializeCareer(JSON.stringify({ ...career, division: 'Cruiserweight' }))).toBeNull();
  });
});
