import { describe, expect, it } from 'vitest';

import {
  bankProgress,
  chooseBeat,
  classifyUtterance,
  createSkeletonFight,
  enterStable,
  exhibitBody,
  growthFromTelemetry,
  guardHeightFor,
  ludusEndingFor,
  newLudus,
  playArenaRound,
  promoterCall,
  pushBoxer,
  replaySkeleton,
  resolveCall,
  ringHim,
  ROUND_LIMIT,
  selectPunch,
  tapeRound,
  type Ludus,
  type PunchName,
} from '../index';
import { createRng } from '../rng';

function playFull(seed: number): Ludus {
  let ludus = enterStable(newLudus(seed));
  ludus = pushBoxer(ludus, ludus.boxers[0].id);
  ludus = chooseBeat(ludus, 'left');
  ludus = chooseBeat(ludus, 'right');
  ludus = chooseBeat(ludus, 'left');
  ludus = ringHim(ludus, 'Jab the body and keep your guard up this round');
  let guard = 0;
  while (ludus.stage === 'ARENA' && guard++ < 12) {
    if (ludus.fight?.phase === 'intermission') ludus = promoterCall(ludus, 'left');
    else ludus = playArenaRound(ludus);
  }
  return bankProgress(ludus);
}

function tally(stats: Parameters<typeof selectPunch>[0], seed: number): Record<PunchName, number> {
  const rng = createRng(seed);
  const counts: Record<PunchName, number> = { jab: 0, cross: 0, leadHook: 0, bodyRip: 0, overhand: 0 };
  for (let i = 0; i < 240; i++) counts[selectPunch(stats, 'normal', rng)] += 1;
  return counts;
}

describe('ludus loop', () => {
  it('walks intro, room, vignette, fight, and back to the room', () => {
    const intro = newLudus(7);
    expect(intro.stage).toBe('INTRO');
    const room = enterStable(intro);
    expect(room.stage).toBe('STABLE_ROOM');
    expect(room.roomLines).toHaveLength(room.boxers.length);
    expect(room.roomLines.every((line) => line.text.length > 0)).toBe(true);

    const pushed = pushBoxer(room, room.boxers[0].id);
    expect(pushed.stage).toBe('CAMP_VIGNETTE');
    expect(pushed.vignette?.beats.map((beat) => beat.place)).toEqual(['Gym', 'Press', 'Bar']);

    let ludus = chooseBeat(pushed, 'left');
    ludus = chooseBeat(ludus, 'right');
    ludus = chooseBeat(ludus, 'left');
    expect(ludus.vignette?.awaitingPhone).toBe(true);

    ludus = ringHim(ludus, 'Jab the body and keep your guard up this round');
    expect(ludus.phone?.intent).toBe('TACTICAL');
    expect(ludus.phone?.verdict).toBe('OBEY');
    expect(ludus.phone?.reply.toLowerCase()).toContain('jab');
    expect(ludus.stage).toBe('ARENA');

    const before = ludus.boxers[0];
    let guard = 0;
    while (ludus.stage === 'ARENA' && guard++ < 12) {
      if (ludus.fight?.phase === 'intermission') ludus = promoterCall(ludus, 'right');
      else ludus = playArenaRound(ludus);
    }
    expect(ludus.stage).toBe('POST_FIGHT');
    expect(ludus.ending).toBeNull();
    expect(ludus.growth[0]?.note.length).toBeGreaterThan(0);

    const banked = bankProgress(ludus);
    expect(banked.stage).toBe('STABLE_ROOM');
    expect(banked.week).toBe(room.week + 1);
    const after = banked.boxers.find((boxer) => boxer.id === before.id)!;
    const growth = ludus.growth[0]!;
    expect(after.agility).toBe(Math.min(99, before.agility + growth.agility));
    expect(after.fights).toBe(before.fights + 1);
    expect(playFull(7)).toEqual(playFull(7));
  });

  it('keeps cash and hype open-ended and ends on the bad edge of each meter', () => {
    expect(ludusEndingFor({ cash: 240, hype: 10, ego: 10, heat: 10 })).toBeNull();
    expect(ludusEndingFor({ cash: 10, hype: 180, ego: 40, heat: 20 })).toBeNull();
    expect(ludusEndingFor({ cash: 0, hype: 10, ego: 10, heat: 10 })?.key).toBe('cash');
    expect(ludusEndingFor({ cash: -4, hype: 10, ego: 10, heat: 10 })?.key).toBe('cash');
    expect(ludusEndingFor({ cash: 10, hype: 0, ego: 10, heat: 10 })?.key).toBe('hype');
    expect(ludusEndingFor({ cash: 10, hype: 10, ego: 100, heat: 10 })?.key).toBe('ego');
    expect(ludusEndingFor({ cash: 10, hype: 10, ego: 10, heat: 100 })?.key).toBe('heat');
  });
});

describe('skeleton fight', () => {
  it('replays a seeded fight exactly', () => {
    expect(replaySkeleton(99)).toEqual(replaySkeleton(99));
    expect(replaySkeleton(99).log).not.toEqual(replaySkeleton(100).log);
    expect(replaySkeleton(99).phase).toBe('done');
  });

  it('raises the guard when the fighter is fresh and humble, and prefers the jab at range', () => {
    const high = guardHeightFor({ stamina: 100, maxStamina: 100, ego: 8, agility: 90 }, 'shell');
    const low = guardHeightFor({ stamina: 8, maxStamina: 100, ego: 96, agility: 30 }, 'press');
    expect(high).toBeGreaterThan(low);

    const outboxer = { agility: 90, strength: 42, reach: 96, stamina: 80, maxStamina: 80, ego: 20 };
    const slugger = { agility: 40, strength: 96, reach: 48, stamina: 70, maxStamina: 80, ego: 70 };
    expect(tally(outboxer, 5).jab).toBeGreaterThan(tally(slugger, 5).jab);
    expect(tally(slugger, 5).overhand + tally(slugger, 5).cross).toBeGreaterThan(
      tally(outboxer, 5).overhand + tally(outboxer, 5).cross,
    );
  });

  it('times a round inside ten seconds and scores hits, slips, and taunts', () => {
    const blue = exhibitBody({ id: 'kofi', name: 'Kofi Mensah', anchorX: 108, facing: 1, ego: 64, traits: ['showman'] });
    const red = exhibitBody({ id: 'opponent', name: 'Marty Voss', anchorX: 214, facing: -1 });
    const fight = createSkeletonFight(blue, red, 7, 4);
    const tape = tapeRound(fight);
    expect(tape).toEqual(tapeRound(fight));
    expect(tape.duration).toBeLessThanOrEqual(ROUND_LIMIT);
    expect(tape.beats.every((beat) => beat.at <= ROUND_LIMIT)).toBe(true);
    expect(tape.caption.length).toBeGreaterThan(0);
    const scored = tape.beats.reduce((sum, beat) => sum + beat.points, 0);
    expect(tape.bluePoints + tape.redPoints).toBe(scored);
  });

  it('turns landed punches into stats', () => {
    const body = exhibitBody({
      id: 'kofi',
      name: 'Kofi Mensah',
      traits: ['loyal'],
      ego: 30,
      stamina: 50,
      maxStamina: 80,
      hp: 70,
      maxHp: 86,
    });
    body.telemetry.landed.jab = 5;
    body.telemetry.landed.cross = 3;
    body.telemetry.thrown.jab = 7;
    body.telemetry.damageDealt = 28;
    body.telemetry.damageTaken = 12;
    const growth = growthFromTelemetry(body);
    expect(growth.reach).toBe(1);
    expect(growth.agility).toBe(1);
    expect(growth.strength).toBe(1);
    expect(growth.maxHp).toBe(1);
    expect(growth.agility + growth.strength + growth.reach + growth.maxStamina + growth.maxHp).toBeGreaterThan(0);
  });
});

describe('burner phone', () => {
  it('classifies intent, obeys or defies from ego and traits, and echoes a noun', () => {
    expect(classifyUtterance('Take the envelope and the cash').intent).toBe('BRIBE');
    expect(classifyUtterance('You are a star and the crowd will chant').intent).toBe('HYPE_UP');

    const defy = resolveCall({
      text: 'I will ruin you or else',
      ego: 100,
      traits: ['proud', 'volatile'],
      rng: createRng(1),
    });
    expect(defy.intent).toBe('THREATEN');
    expect(defy.tone).toBe('harsh');
    expect(defy.verdict).toBe('DEFY');
    expect(defy.reply.toLowerCase()).toContain('ruin');

    const obey = resolveCall({
      text: 'Please, for the team, quietly',
      ego: 10,
      traits: ['loyal', 'quiet'],
      rng: createRng(1),
    });
    expect(obey.intent).toBe('HUMBLE');
    expect(obey.verdict).toBe('OBEY');
    expect(obey.reply.toLowerCase()).toMatch(/team|quietly/);

    const mid = { text: 'Here is a cash envelope', ego: 55, traits: ['proud'] as const };
    expect(resolveCall({ ...mid, rng: createRng(4) })).toEqual(resolveCall({ ...mid, rng: createRng(4) }));
  });
});
