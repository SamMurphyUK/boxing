// 2.5D limb fight. Pure TypeScript. Every roll goes through game/rng.ts.
// Blood and Gold equivalent: updateArena.ts (the exchange) and recalculateGladiatorStats.ts
// (stats change the body). Guard height and punch choice are the visible part of that.

import { chance, createRng, type Rng } from '../rng';
import type {
  CornerPlan,
  ExchangeMark,
  JointPoint,
  LudusBoxer,
  LudusTrait,
  Pose,
  PromoterCall,
  PunchName,
  PunchTelemetry,
  SkeletonBody,
  SkeletonFight,
  StatGrowth,
} from '../types';

export const PUNCHES: readonly PunchName[] = ['jab', 'cross', 'leadHook', 'bodyRip', 'overhand'];
const EXCHANGES_PER_ROUND = 6;

const PUNCH_POWER: Record<PunchName, number> = {
  jab: 5,
  cross: 9,
  leadHook: 8,
  bodyRip: 7,
  overhand: 12,
};

const PUNCH_COST: Record<PunchName, number> = {
  jab: 4,
  cross: 7,
  leadHook: 7,
  bodyRip: 6,
  overhand: 9,
};

export interface BodyDraft {
  id: string;
  name: string;
  traits?: readonly LudusTrait[];
  ego?: number;
  hp?: number;
  maxHp?: number;
  stamina?: number;
  maxStamina?: number;
  agility?: number;
  strength?: number;
  reach?: number;
  facing?: 1 | -1;
  anchorX?: number;
  anchorZ?: number;
  colour?: string;
}

function blankCount(): Record<PunchName, number> {
  return { jab: 0, cross: 0, leadHook: 0, bodyRip: 0, overhand: 0 };
}

function blankTelemetry(): PunchTelemetry {
  return { thrown: blankCount(), landed: blankCount(), damageDealt: 0, damageTaken: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function guardHeightFor(
  body: { stamina: number; maxStamina: number; ego: number; agility: number },
  plan: CornerPlan = 'normal',
): number {
  const fresh = body.maxStamina <= 0 ? 0 : body.stamina / body.maxStamina;
  const composure = Math.max(0, 1 - body.ego / 140);
  const feet = Math.min(1, Math.max(0, body.agility / 120));
  let height = 8 + 20 * fresh * (0.65 + 0.35 * composure) * (0.8 + 0.2 * feet);
  if (plan === 'shell') height += 6;
  if (plan === 'press') height -= 4;
  return Math.round(clamp(height, 4, 32));
}

function poseOf(body: SkeletonBody, action: { punch: PunchName } | null): Pose {
  const dir = body.facing;
  const x = body.anchorX;
  const z = body.anchorZ;
  const extend = action ? Math.round(8 + body.reach * 0.08) : 0;
  const lead = action !== null && (action.punch === 'jab' || action.punch === 'leadHook' || action.punch === 'bodyRip');
  const rear = action !== null && (action.punch === 'cross' || action.punch === 'overhand');
  const bodyDip = action?.punch === 'bodyRip' ? 5 : 0;
  const point = (px: number, pz: number): JointPoint => ({ x: Math.round(px), z: Math.round(pz) });
  return {
    root: point(x, z),
    torso: point(x + dir, z - 2),
    head: point(x + dir * 2, z - 4),
    leadFoot: point(x + dir * 8, z + 5),
    rearFoot: point(x - dir * 9, z - 3),
    leadHand: point(x + dir * (14 + (lead ? extend : 0)), z - 6 + (lead ? bodyDip : 0)),
    rearHand: point(x + dir * (6 + (rear ? extend : 0)), z - 1),
  };
}

function settle(body: SkeletonBody, plan: CornerPlan, action: { punch: PunchName } | null): void {
  body.guardHeight = guardHeightFor(body, plan);
  body.pose = poseOf(body, action);
}

export function exhibitBody(draft: BodyDraft, plan: CornerPlan = 'normal'): SkeletonBody {
  const maxHp = draft.maxHp ?? draft.hp ?? 90;
  const maxStamina = draft.maxStamina ?? draft.stamina ?? 80;
  const body: SkeletonBody = {
    id: draft.id,
    name: draft.name,
    traits: [...(draft.traits ?? [])],
    ego: draft.ego ?? 40,
    hp: draft.hp ?? maxHp,
    maxHp,
    stamina: draft.stamina ?? maxStamina,
    maxStamina,
    agility: draft.agility ?? 60,
    strength: draft.strength ?? 60,
    reach: draft.reach ?? 70,
    facing: draft.facing ?? 1,
    anchorX: draft.anchorX ?? 108,
    anchorZ: draft.anchorZ ?? 96,
    guardHeight: 0,
    pose: {} as Pose,
    telemetry: blankTelemetry(),
    colour: draft.colour ?? '#ded095',
  };
  settle(body, plan, null);
  return body;
}

export function bodyFromBoxer(boxer: LudusBoxer, anchorX: number, facing: 1 | -1): SkeletonBody {
  return exhibitBody(
    {
      id: boxer.id,
      name: boxer.name,
      traits: boxer.traits,
      ego: boxer.ego,
      hp: boxer.hp,
      maxHp: boxer.maxHp,
      stamina: boxer.stamina,
      maxStamina: boxer.maxStamina,
      agility: boxer.agility,
      strength: boxer.strength,
      reach: boxer.reach,
      facing,
      anchorX,
      colour: boxer.colour,
    },
    'normal',
  );
}

export function punchWeights(
  body: Pick<SkeletonBody, 'agility' | 'strength' | 'reach' | 'stamina' | 'maxStamina' | 'ego'>,
  plan: CornerPlan,
): Record<PunchName, number> {
  const tired = 1 - (body.maxStamina <= 0 ? 0 : body.stamina / body.maxStamina);
  const weights: Record<PunchName, number> = {
    jab: 1.1 + body.reach / 70 + body.agility / 120,
    cross: 0.9 + body.strength / 80,
    leadHook: 0.7 + body.agility / 100,
    bodyRip: 0.6 + tired * 1.6,
    overhand: 0.45 + body.strength / 75 + body.ego / 180,
  };
  if (plan === 'press') {
    weights.cross += 0.8;
    weights.overhand += 0.7;
  } else if (plan === 'shell') {
    weights.jab += 0.9;
    weights.overhand *= 0.4;
  } else if (plan === 'body') {
    weights.bodyRip += 1.3;
  } else if (plan === 'box') {
    weights.jab += 1.1;
    weights.leadHook += 0.4;
  }
  return weights;
}

export function selectPunch(
  body: Pick<SkeletonBody, 'agility' | 'strength' | 'reach' | 'stamina' | 'maxStamina' | 'ego'>,
  plan: CornerPlan,
  rng: Rng,
): PunchName {
  const weights = punchWeights(body, plan);
  let roll = rng.next() * PUNCHES.reduce((sum, punch) => sum + weights[punch], 0);
  for (const punch of PUNCHES) {
    roll -= weights[punch];
    if (roll <= 0) return punch;
  }
  return 'jab';
}

function cloneFight(fight: SkeletonFight): SkeletonFight {
  return JSON.parse(JSON.stringify(fight)) as SkeletonFight;
}

function callFor(fight: SkeletonFight): PromoterCall {
  const name = fight.blue.name;
  if (fight.round % 2 === 1) {
    return {
      text: `${name} sits down. The promoter looks at the crowd, then at him.`,
      left: 'Send him forward',
      right: 'Keep the guard high',
      leftPlan: 'press',
      rightPlan: 'shell',
    };
  }
  return {
    text: `${name} waits on the stool. Thumb the next round.`,
    left: 'Rip the body',
    right: 'Box and move',
    leftPlan: 'body',
    rightPlan: 'box',
  };
}

function finish(fight: SkeletonFight, method: SkeletonFight['method'], winner: SkeletonFight['winner'], line: string): void {
  fight.phase = 'done';
  fight.method = method;
  fight.winner = winner;
  fight.call = null;
  fight.log = [...fight.log, line];
}

function scoreFight(fight: SkeletonFight): void {
  const ours = fight.blue.telemetry.damageDealt;
  const theirs = fight.red.telemetry.damageDealt;
  const blueLeft = fight.blue.hp + fight.blue.stamina;
  const redLeft = fight.red.hp + fight.red.stamina;
  const blueWins = ours !== theirs ? ours > theirs : blueLeft >= redLeft;
  if (blueWins) finish(fight, 'TKO', 'blue', `Technical knockout. ${fight.red.name} does not answer the bell.`);
  else finish(fight, 'TKO', 'red', `Technical knockout. ${fight.blue.name} does not answer the bell.`);
}

export function createSkeletonFight(blue: SkeletonBody, red: SkeletonBody, seed: number, maxRounds = 4): SkeletonFight {
  const fight: SkeletonFight = {
    round: 0,
    maxRounds,
    exchange: 0,
    phase: 'fighting',
    blue: JSON.parse(JSON.stringify(blue)) as SkeletonBody,
    red: JSON.parse(JSON.stringify(red)) as SkeletonBody,
    plan: 'normal',
    call: null,
    lastExchange: null,
    winner: null,
    method: null,
    seed,
    log: [`${blue.name} against ${red.name}. ${maxRounds} rounds.`],
  };
  settle(fight.blue, 'normal', null);
  settle(fight.red, 'normal', null);
  return fight;
}

function hitChance(punch: PunchName, attacker: SkeletonBody, defender: SkeletonBody): number {
  let odds = 0.42 + (attacker.agility - defender.agility) * 0.003 + attacker.reach * 0.0015;
  if (punch === 'jab') odds += 0.12;
  if (punch === 'overhand') odds -= 0.1;
  if (punch === 'bodyRip') odds += 0.04;
  odds -= defender.guardHeight * 0.008;
  return clamp(odds, 0.08, 0.9);
}

export function stepExchange(input: SkeletonFight): SkeletonFight {
  if (input.phase !== 'fighting') throw new Error('Not fighting');
  const rng = createRng(input.seed);
  const fight = cloneFight(input);
  const blueAttacks = fight.exchange % 2 === 0;
  const attacker = blueAttacks ? fight.blue : fight.red;
  const defender = blueAttacks ? fight.red : fight.blue;
  const plan: CornerPlan = blueAttacks ? fight.plan : 'normal';
  attacker.anchorX = attacker.facing === 1 ? 108 : 214;

  if (attacker.stamina < 6) {
    attacker.stamina = Math.min(attacker.maxStamina, attacker.stamina + 8);
    settle(attacker, plan, null);
    settle(defender, blueAttacks ? 'normal' : fight.plan, null);
    fight.lastExchange = null;
    fight.log = [...fight.log, `${attacker.name} takes a breath.`];
  } else {
    const punch = selectPunch(attacker, plan, rng);
    attacker.stamina = Math.max(0, attacker.stamina - PUNCH_COST[punch]);
    attacker.telemetry.thrown[punch] += 1;
    const landed = chance(rng, hitChance(punch, attacker, defender));
    const mark: ExchangeMark = { actor: blueAttacks ? 'blue' : 'red', punch, landed };
    if (landed) {
      const damage = Math.max(1, Math.round(PUNCH_POWER[punch] * (0.55 + attacker.strength / 140)));
      defender.hp = Math.max(0, defender.hp - damage);
      defender.stamina = Math.max(0, defender.stamina - (punch === 'bodyRip' ? 5 : 3));
      attacker.telemetry.landed[punch] += 1;
      attacker.telemetry.damageDealt += damage;
      defender.telemetry.damageTaken += damage;
      fight.log = [...fight.log, `${attacker.name} lands the ${punchName(punch)}.`];
    } else {
      fight.log = [...fight.log, `${attacker.name} misses the ${punchName(punch)}.`];
    }
    settle(attacker, plan, { punch });
    settle(defender, blueAttacks ? 'normal' : fight.plan, null);
    fight.lastExchange = mark;
    if (defender.hp <= 0) {
      const method = punch === 'overhand' || punch === 'cross' ? 'KO' : 'TKO';
      fight.exchange += 1;
      fight.seed = rng.seed();
      finish(fight, method, blueAttacks ? 'blue' : 'red', `${method}. ${attacker.name} ends it.`);
      return fight;
    }
  }

  fight.exchange += 1;
  fight.seed = rng.seed();
  if (fight.exchange % EXCHANGES_PER_ROUND === 0) {
    fight.round += 1;
    if (fight.round >= fight.maxRounds) scoreFight(fight);
    else {
      fight.phase = 'intermission';
      fight.call = callFor(fight);
      fight.log = [...fight.log, `End of round ${fight.round}.`];
    }
  }
  return fight;
}

function punchName(punch: PunchName): string {
  if (punch === 'leadHook') return 'lead hook';
  if (punch === 'bodyRip') return 'body rip';
  return punch;
}

export function playRound(input: SkeletonFight): SkeletonFight {
  if (input.phase !== 'fighting') throw new Error('Not fighting');
  let fight = input;
  const round = fight.round;
  for (let i = 0; i < EXCHANGES_PER_ROUND + 1 && fight.phase === 'fighting' && fight.round === round; i++) {
    fight = stepExchange(fight);
  }
  return fight;
}

export function answerSkeletonCorner(input: SkeletonFight, side: 'left' | 'right'): SkeletonFight {
  if (input.phase !== 'intermission' || !input.call) throw new Error('No promoter call');
  const fight = cloneFight(input);
  fight.plan = side === 'left' ? input.call.leftPlan : input.call.rightPlan;
  fight.phase = 'fighting';
  fight.call = null;
  settle(fight.blue, fight.plan, null);
  settle(fight.red, 'normal', null);
  fight.log = [...fight.log, `Promoter: “${side === 'left' ? input.call.left : input.call.right}.”`];
  return fight;
}

export function createDemoFight(seed: number): SkeletonFight {
  const blue = exhibitBody({
    id: 'demo-blue',
    name: 'Ezra Bolt',
    traits: ['proud', 'showman'],
    ego: 70,
    anchorX: 108,
    facing: 1,
    strength: 84,
    reach: 74,
    agility: 64,
    colour: '#9c8053',
  });
  const red = exhibitBody({
    id: 'demo-red',
    name: 'Ned Cybulski',
    ego: 36,
    anchorX: 214,
    facing: -1,
    strength: 62,
    reach: 68,
    agility: 58,
    colour: '#9e4a42',
  });
  return createSkeletonFight(blue, red, seed, 6);
}

export function idlePose(
  slot: number,
  tick: number,
  stats: { reach: number; ego: number; stamina: number; maxStamina: number; agility: number },
): { pose: Pose; guardHeight: number } {
  const sway = Math.round(Math.sin((tick + slot * 11) / 16) * 2);
  const guardHeight = guardHeightFor(stats, 'normal');
  const body = exhibitBody({
    id: `idle-${slot}`,
    name: '',
    anchorX: 58 + slot * 102 + sway,
    anchorZ: 96,
    facing: slot === 2 ? -1 : 1,
    reach: stats.reach,
    ego: stats.ego,
    stamina: stats.stamina,
    maxStamina: stats.maxStamina,
    agility: stats.agility,
  });
  return { pose: body.pose, guardHeight };
}

export function closeUpPose(): { pose: Pose; guardHeight: number } {
  const body = exhibitBody({
    id: 'portrait',
    name: 'Ezra Bolt',
    traits: ['showman'],
    anchorX: 168,
    anchorZ: 96,
    facing: 1,
    reach: 74,
    ego: 48,
    stamina: 88,
    maxStamina: 90,
    agility: 70,
    strength: 86,
    colour: '#9c8053',
  });
  return { pose: body.pose, guardHeight: body.guardHeight };
}

export function growthFromTelemetry(body: SkeletonBody): StatGrowth {
  const landed = body.telemetry.landed;
  let agility = landed.jab + landed.leadHook >= 3 ? 1 : 0;
  const strength = landed.cross + landed.overhand + landed.bodyRip >= 3 ? 1 : 0;
  const reach = landed.jab >= 4 ? 1 : 0;
  const maxStamina = body.stamina >= body.maxStamina * 0.35 ? 1 : 0;
  const maxHp = body.telemetry.damageTaken >= 10 ? 1 : 0;
  let trait: LudusTrait | null = null;
  if (landed.overhand >= 2 && body.ego >= 55 && !body.traits.includes('showman')) trait = 'showman';
  else if (body.telemetry.damageTaken <= 3 && landed.jab >= 3 && !body.traits.includes('quiet')) trait = 'quiet';
  const anyLanded = PUNCHES.some((punch) => landed[punch] > 0);
  if (anyLanded && agility + strength + reach + maxStamina + maxHp === 0) agility = 1;
  const notes: string[] = [];
  if (agility) notes.push('feet got cleaner');
  if (strength) notes.push('the power punches sat down');
  if (reach) notes.push('the jab found a longer range');
  if (maxStamina) notes.push('the tank deepened');
  if (maxHp) notes.push('the chin learned something');
  if (trait) notes.push(`new habit: ${trait}`);
  if (!notes.length) notes.push('A quiet night. Nothing stuck.');
  return {
    boxerId: body.id,
    agility,
    strength,
    reach,
    maxStamina,
    maxHp,
    trait,
    note: notes.join('. '),
  };
}

export function replaySkeleton(seed: number): SkeletonFight {
  const blue = exhibitBody({
    id: 'blue',
    name: 'Blue',
    anchorX: 108,
    facing: 1,
    strength: 72,
    agility: 70,
    reach: 74,
    ego: 40,
    stamina: 80,
    maxStamina: 80,
    hp: 90,
    maxHp: 90,
  });
  const red = exhibitBody({
    id: 'red',
    name: 'Red',
    anchorX: 214,
    facing: -1,
    strength: 68,
    agility: 60,
    reach: 70,
    ego: 35,
    stamina: 76,
    maxStamina: 76,
    hp: 88,
    maxHp: 88,
  });
  let fight = createSkeletonFight(blue, red, seed, 4);
  for (let i = 0; i < 12 && fight.phase !== 'done'; i++) {
    fight = fight.phase === 'intermission' ? answerSkeletonCorner(fight, 'left') : playRound(fight);
  }
  return fight;
}
