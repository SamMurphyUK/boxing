import { CARDS } from './content/cards';
import { CHARACTERS } from './content/characters';
import { DIVISIONS } from './content/divisions';
import { MAX_FIGHTERS, PROSPECTS, SIGNABLE } from './content/fighters';
import { ENDINGS, HEADLINES } from './content/text';
import { resolveCall } from './dialogue/phone-brain';
import { bodyFromBoxer, createSkeletonFight, growthFromTelemetry, playRound, answerSkeletonCorner } from './fight/skeleton-sim';
import { clamp, fillTemplate, money, record } from './format';
import { chance, createRng, intBetween, between, pick, type Rng } from './rng';
import type {
  CardDef,
  CardView,
  Career,
  CurrentCard,
  DivisionName,
  Effects,
  EndingKey,
  EndingSummary,
  Fighter,
  FighterTemplate,
  FightKind,
  FightOffer,
  Ludus,
  LudusBoxer,
  LudusEnding,
  LudusMeters,
  Meter,
  MeterDelta,
  RoomLine,
  Side,
  StatGrowth,
  VignetteBeat,
} from './types';

export const METERS: Meter[] = ['cash', 'hype', 'stable', 'rep'];
export const METER_LABELS: Record<Meter, string> = { cash: 'Cash', hype: 'Hype', stable: 'Stable', rep: 'Rep' };
const EFFECT_METER = { c: 'cash', h: 'hype', s: 'stable', r: 'rep' } as const;
const EFFECT_SCALE = 0.7;
const SWIPE_NEWS_CHANCE = 0.25;
const CHAINED_CARD_CHANCE = 0.85;
const MATCHMAKER = CHARACTERS.mags;

const CARD_BY_ID = new Map<number, CardDef>(CARDS.map((card) => [card.id, card]));

export function cardById(id: number): CardDef {
  const card = CARD_BY_ID.get(id);
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
}

function withRng(career: Career, update: (rng: Rng, next: Career) => void): Career {
  const rng = createRng(career.seed);
  const next = structuredCloneCareer(career);
  update(rng, next);
  next.seed = rng.seed();
  return next;
}

function structuredCloneCareer(career: Career): Career {
  return JSON.parse(JSON.stringify(career)) as Career;
}

export function makeFighter(template: FighterTemplate, rank: number): Fighter {
  return { ...template, wins: 0, losses: 0, draws: 0, kos: 0, rank, champ: false, hurt: false, fights: 0 };
}

function pushNews(career: Career, headline: string): void {
  career.news = [headline, ...career.news].slice(0, 3);
}

export function activeFighter(career: Career): Fighter {
  return career.fighters[(career.week - 1) % career.fighters.length];
}

export function activeFighterIndex(career: Career): number {
  return (career.week - 1) % career.fighters.length;
}

export function newCareer(division: DivisionName, prospectIndex: number, seed: number): Career {
  const prospect = PROSPECTS[clamp(Math.floor(prospectIndex), 0, PROSPECTS.length - 1)];
  const rng = createRng(seed);
  const career: Career = {
    version: 1,
    division,
    week: 1,
    meters: { cash: 50, hype: 50, stable: 50, rep: 50 },
    fighters: [makeFighter(prospect, 18)],
    flags: {},
    used: {},
    recent: [],
    cardsLeft: intBetween(rng, 4, 6),
    signed: [],
    news: [],
    fights: 0,
    wins: 0,
    kos: 0,
    purses: 0,
    peakCash: 50,
    bestRank: 18,
    titleWon: false,
    pending: null,
    current: null,
    seen: 0,
    seed: rng.seed(),
  };
  pushNews(career, 'New promotion opens its doors. Industry “unmoved”.');
  pushNews(career, pick(rng, HEADLINES.flavour) ?? '');
  career.current = drawCard(rng, career);
  career.seed = rng.seed();
  return career;
}

function isEligible(career: Career, card: CardDef): boolean {
  const uses = career.used[card.id] ?? 0;
  if (card.req && !career.flags[card.req]) return false;
  if (card.signing && career.fighters.length >= MAX_FIGHTERS) return false;
  if (uses >= (card.req ? 1 : 2)) return false;
  if (career.recent.includes(card.id)) return false;
  return true;
}

function drawCard(rng: Rng, career: Career): CurrentCard {
  if (career.cardsLeft <= 0) {
    career.pending = makeFightOffers(rng, career);
    return { type: 'fight' };
  }
  const pool = CARDS.filter((card) => isEligible(career, card));
  const chained = pool.filter((card) => card.req);
  let card = chained.length && chance(rng, CHAINED_CARD_CHANCE) ? pick(rng, chained) : pick(rng, pool.filter((c) => !c.req));
  if (!card) {
    career.recent = [];
    card = pick(rng, CARDS.filter((c) => isEligible(career, c))) ?? CARDS[0];
  }
  return { type: 'decision', id: card.id };
}

function roundsFor(rank: number): number {
  if (rank > 15) return 4;
  if (rank > 10) return 6;
  if (rank > 5) return 8;
  return 10;
}

function purseFor(career: Career, opponentRank: number, title: boolean): number {
  const scale = DIVISIONS[career.division].scale;
  const base = title ? 1_500_000 : Math.pow(21 - opponentRank, 1.6) * 3000;
  return Math.round((base * scale) / 1000) * 1000;
}

function generateOpponent(rng: Rng, career: Career, rank: number, isChamp: boolean): FightOffer['opp'] {
  const division = DIVISIONS[career.division];
  let name = division.champ.name;
  let nick = division.champ.nick;
  if (!isChamp) {
    do {
      name = `${pick(rng, division.first)} ${pick(rng, division.last)}`;
    } while (name === division.champ.name);
    nick = pick(rng, division.nicks) ?? '';
  }
  const level = isChamp ? 92 : 52 + (20 - rank) * 2;
  const stat = () => clamp(Math.round(level + between(rng, -9, 9)), 30, 97);
  return {
    name,
    nick,
    rank,
    skill: stat(),
    power: stat(),
    chin: stat(),
    stamina: stat(),
    champ: isChamp,
    record: `${intBetween(rng, 8, 30)}-${isChamp ? intBetween(rng, 0, 2) : intBetween(rng, 0, 8)}`,
  };
}

function makeFightOffers(rng: Rng, career: Career): { left: FightOffer; right: FightOffer } {
  const fighter = activeFighter(career);
  const offer = (rank: number, isChamp: boolean, kind: FightKind, rounds: number, purseMultiplier = 1): FightOffer => ({
    opp: generateOpponent(rng, career, rank, isChamp),
    purse: isChamp ? purseFor(career, 1, true) : purseFor(career, rank, false) * purseMultiplier,
    kind,
    rounds,
  });
  if (fighter.champ) {
    const voluntaryRank = intBetween(rng, 5, 10);
    const mandatoryRank = intBetween(rng, 1, 2);
    return {
      left: offer(voluntaryRank, false, 'voluntary', 12, 3),
      right: offer(mandatoryRank, false, 'mandatory', 12, 6),
    };
  }
  if (fighter.rank === 1) {
    const busyRank = intBetween(rng, 3, 6);
    return { left: offer(busyRank, false, 'busy', 10), right: offer(0, true, 'title', 12) };
  }
  const busyRank = clamp(fighter.rank + intBetween(rng, 2, 4), 1, 20);
  const stepRank = clamp(fighter.rank - intBetween(rng, 1, 3), 1, 20);
  return {
    left: offer(busyRank, false, 'busy', roundsFor(busyRank)),
    right: offer(stepRank, false, 'step', roundsFor(stepRank)),
  };
}

const KIND_LABEL: Record<FightKind, string> = {
  busy: 'Stay busy',
  step: 'Step up',
  title: 'Title shot',
  voluntary: 'Voluntary defence',
  mandatory: 'Mandatory',
};

export function fightOfferLabel(offer: FightOffer): string {
  const standingText = offer.opp.champ ? ' (champ)' : ` (#${offer.opp.rank})`;
  return `${KIND_LABEL[offer.kind]}: ${offer.opp.name}${standingText} · ${money(offer.purse)}`;
}

export function viewCard(career: Career): CardView | null {
  const current = career.current;
  if (!current) return null;
  const fighter = activeFighter(career);
  if (current.type === 'fight') {
    const pending = career.pending;
    if (!pending) return null;
    const text = fighter.champ
      ? `Fight week. Champion ${fighter.name} (${record(fighter)}) needs a defence. Mags has lined up two options.`
      : fighter.rank === 1
        ? `${fighter.name} is the number one contender. Mags says the champion will take the fight. Or we keep him busy.`
        : `Fight week. ${fighter.name} (${record(fighter)}, ranked #${fighter.rank}) needs an opponent. Mags has two options.`;
    return {
      speakerId: 'mags',
      speaker: MATCHMAKER,
      text,
      left: { label: fightOfferLabel(pending.left), fx: {} },
      right: { label: fightOfferLabel(pending.right), fx: {} },
      isFight: true,
      footer: 'Fight night',
    };
  }
  const card = cardById(current.id);
  return {
    speakerId: card.who,
    speaker: CHARACTERS[card.who],
    text: fillTemplate(card.text, fighter.name),
    left: { label: fillTemplate(card.left.label, fighter.name), fx: card.left.fx },
    right: { label: fillTemplate(card.right.label, fighter.name), fx: card.right.fx },
    isFight: false,
    footer: `Week ${career.week}`,
  };
}

export function applyEffects(career: Career, fx: Effects): void {
  for (const key of Object.keys(fx) as (keyof Effects)[]) {
    const meter = EFFECT_METER[key];
    career.meters[meter] = clamp(career.meters[meter] + Math.round((fx[key] ?? 0) * EFFECT_SCALE), 0, 100);
  }
  career.peakCash = Math.max(career.peakCash, career.meters.cash);
}

function signFighter(rng: Rng, career: Career): Fighter | null {
  if (career.fighters.length >= MAX_FIGHTERS) return null;
  const available = SIGNABLE.filter((p) => !career.signed.includes(p.name));
  const template = pick(rng, available.length ? available : SIGNABLE);
  if (!template) return null;
  career.signed.push(template.name);
  const fighter = makeFighter(template, 16);
  career.fighters.push(fighter);
  pushNews(career, `${template.name} signs with the promotion. “I’m here to take over,” he says, quietly.`);
  return fighter;
}

export type DecisionResult =
  | { kind: 'continue'; career: Career; signed: Fighter | null }
  | { kind: 'ended'; ending: EndingSummary };

export function decide(career: Career, side: Side): DecisionResult {
  const current = career.current;
  if (!current || current.type !== 'decision') throw new Error('No decision card to answer');
  let signed: Fighter | null = null;
  const next = withRng(career, (rng, draft) => {
    const card = cardById(current.id);
    const option = card[side];
    const fighter = activeFighter(draft);
    applyEffects(draft, option.fx);
    if (option.set) draft.flags[option.set] = true;
    if (option.sign) signed = signFighter(rng, draft);
    draft.used[card.id] = (draft.used[card.id] ?? 0) + 1;
    draft.recent = [...draft.recent, card.id].slice(-25);
    draft.cardsLeft -= 1;
    draft.seen += 1;
    if (chance(rng, SWIPE_NEWS_CHANCE)) pushNews(draft, `${fighter.name}’s camp: “${option.label}”, says promoter`);
    draft.current = null;
  });
  const ending = checkEnding(next);
  if (ending) return { kind: 'ended', ending };
  return {
    kind: 'continue',
    career: withRng(next, (rng, draft) => {
      draft.current = drawCard(rng, draft);
    }),
    signed: signed as Fighter | null,
  };
}

export function chooseFight(career: Career, side: Side): FightOffer {
  if (career.current?.type !== 'fight' || !career.pending) throw new Error('No fight to choose');
  return career.pending[side];
}

export function endingKeyFor(career: Career): EndingKey | null {
  for (const meter of METERS) {
    if (career.meters[meter] <= 0) return `${meter}_lo`;
    if (career.meters[meter] >= 100) return `${meter}_hi`;
  }
  return null;
}

export function careerScore(career: Career): number {
  const wins = career.fighters.reduce((sum, f) => sum + f.wins, 0);
  const kos = career.fighters.reduce((sum, f) => sum + f.kos, 0);
  return (
    career.week * 10 +
    wins * 25 +
    kos * 10 +
    (career.titleWon ? 300 : 0) +
    (21 - career.bestRank) * 5 +
    Math.round(career.purses / 10000)
  );
}

export function checkEnding(career: Career): EndingSummary | null {
  const key = endingKeyFor(career);
  if (!key) return null;
  const ending = ENDINGS[key];
  const wins = career.fighters.reduce((sum, f) => sum + f.wins, 0);
  const losses = career.fighters.reduce((sum, f) => sum + f.losses, 0);
  const kos = career.fighters.reduce((sum, f) => sum + f.kos, 0);
  const score = careerScore(career);
  const best = career.titleWon ? 'Champion' : `#${career.bestRank}`;
  return {
    key,
    title: ending.title,
    story: ending.story,
    stats: [
      { label: 'Weeks survived', value: String(career.week) },
      { label: 'Fights', value: String(career.fights) },
      { label: 'Record', value: `${wins}-${losses}` },
      { label: 'Knockouts', value: String(kos) },
      { label: 'Best ranking', value: best },
      { label: 'Purses earned', value: money(career.purses) },
      { label: 'Cash peak', value: `${career.peakCash}/100` },
      { label: 'Title won', value: career.titleWon ? 'Yes' : 'No' },
    ],
    score,
    shareText: [
      'THE PROMOTER',
      `${career.week} weeks, ${career.fights} fights, ${wins}-${losses} (${kos} KO)`,
      `${career.titleWon ? 'World champion' : `Best rank #${career.bestRank}`}, ${money(career.purses)} in purses`,
      `Ending: ${ending.title}`,
      `Score ${score.toLocaleString('en-GB')}`,
    ].join('\n'),
    careerBeforeEnd: career,
  };
}

export function continueAfterFight(career: Career): DecisionResult {
  const ending = checkEnding(career);
  if (ending) return { kind: 'ended', ending };
  return {
    kind: 'continue',
    career: withRng(career, (rng, draft) => {
      pushNews(draft, pick(rng, HEADLINES.flavour) ?? '');
      draft.current = drawCard(rng, draft);
    }),
    signed: null,
  };
}

export function secondChance(ending: EndingSummary): Career {
  const [meter, end] = ending.key.split('_') as [Meter, 'lo' | 'hi'];
  return withRng(ending.careerBeforeEnd, (rng, draft) => {
    draft.meters[meter] = end === 'lo' ? 25 : 75;
    pushNews(draft, 'Promoter survives scare. “We go again,” says promoter.');
    draft.current = drawCard(rng, draft);
  });
}

// --- Ludus loop -----------------------------------------------------------
// Mapped off Blood and Gold, with the dice moved onto game/rng.ts:
//   campSpeech.ts + the camp idle in updateCamp.ts  -> STABLE_ROOM lines
//   pep-talk / story beats                          -> CAMP_VIGNETTE
//   updateArena.ts exchanges + judgmentState pause  -> ARENA rounds + promoter calls
//   podium return to camp                           -> POST_FIGHT, then the room again
//   recalculateGladiatorStats.ts                    -> growthFromTelemetry (no menu)

const ZERO_DELTA: MeterDelta = { cash: 0, hype: 0, ego: 0, heat: 0 };

function cloneLudus(ludus: Ludus): Ludus {
  return JSON.parse(JSON.stringify(ludus)) as Ludus;
}

function withLudusRng(ludus: Ludus, update: (rng: Rng, next: Ludus) => void): Ludus {
  const rng = createRng(ludus.seed);
  const next = cloneLudus(ludus);
  update(rng, next);
  next.seed = rng.seed();
  return next;
}

export function shiftLudusMeters(meters: LudusMeters, delta: MeterDelta): LudusMeters {
  return {
    cash: meters.cash + delta.cash,
    hype: meters.hype + delta.hype,
    ego: Math.max(0, meters.ego + delta.ego),
    heat: Math.max(0, meters.heat + delta.heat),
  };
}

export function ludusEndingFor(meters: LudusMeters): LudusEnding | null {
  if (meters.cash <= 0) return { key: 'cash', title: 'Broke', reason: 'The safe is empty.' };
  if (meters.hype <= 0) return { key: 'hype', title: 'Ignored', reason: 'Nobody is buying tickets.' };
  if (meters.ego >= 100) return { key: 'ego', title: 'Walkout', reason: 'The star left the building.' };
  if (meters.heat >= 100) return { key: 'heat', title: 'Suspended', reason: 'The licence is pulled.' };
  return null;
}

function roomLine(rng: Rng, boxer: LudusBoxer, others: readonly LudusBoxer[]): string {
  const lines: string[] = [];
  if (boxer.traits.includes('proud')) lines.push(`Nobody in this room outranks ${boxer.name}.`);
  if (boxer.traits.includes('hungry')) lines.push('I will fight for the purse. Say when.');
  if (boxer.traits.includes('loyal')) lines.push('You point. I walk. That is the deal.');
  if (boxer.traits.includes('volatile')) lines.push('Keep the other mouth shut, or I will.');
  if (boxer.traits.includes('showman')) lines.push('Tell them to bring a camera.');
  if (boxer.traits.includes('quiet')) lines.push('I am here. That is enough talking.');
  if (boxer.hp < boxer.maxHp * 0.7) lines.push('The ribs still talk when I breathe.');
  else lines.push('Hands are fresh. The bag can wait.');
  if (boxer.fights === 0) lines.push('First walk-out. Do not dress it up.');
  else lines.push(`I already have ${boxer.fights} nights in me.`);
  const mate = others.find((other) => other.id !== boxer.id);
  if (mate) lines.push(`${mate.name} keeps staring. Let him.`);
  return pick(rng, lines) ?? `${boxer.name} says nothing.`;
}

function linesFor(rng: Rng, boxers: readonly LudusBoxer[]): RoomLine[] {
  return boxers.map((boxer) => ({ speakerId: boxer.id, text: roomLine(rng, boxer, boxers) }));
}

function starterBoxers(): LudusBoxer[] {
  return [
    {
      id: 'kofi',
      name: 'Kofi Mensah',
      nick: 'Silk',
      traits: ['quiet', 'loyal'],
      ego: 28,
      hp: 86,
      maxHp: 86,
      stamina: 78,
      maxStamina: 78,
      agility: 76,
      strength: 58,
      reach: 78,
      fights: 0,
      colour: '#55796f',
    },
    {
      id: 'danny',
      name: 'Danny Rourke',
      nick: 'The Tank',
      traits: ['hungry', 'loyal'],
      ego: 36,
      hp: 100,
      maxHp: 100,
      stamina: 90,
      maxStamina: 90,
      agility: 52,
      strength: 70,
      reach: 66,
      fights: 0,
      colour: '#9e4a42',
    },
    {
      id: 'ezra',
      name: 'Ezra Bolt',
      nick: 'Lights Out',
      traits: ['proud', 'volatile', 'showman'],
      ego: 64,
      hp: 90,
      maxHp: 90,
      stamina: 60,
      maxStamina: 60,
      agility: 58,
      strength: 88,
      reach: 70,
      fights: 0,
      colour: '#9c8053',
    },
  ];
}

export function newLudus(seed: number): Ludus {
  const rng = createRng(seed);
  return {
    stage: 'INTRO',
    meters: { cash: 60, hype: 50, ego: 20, heat: 10 },
    boxers: starterBoxers(),
    focusId: null,
    roomLines: [],
    vignette: null,
    phone: null,
    fight: null,
    growth: [],
    week: 1,
    seed: rng.seed(),
    ending: null,
  };
}

export function enterStable(ludus: Ludus): Ludus {
  if (ludus.stage !== 'INTRO') throw new Error('The stable is already open');
  return withLudusRng(ludus, (rng, draft) => {
    draft.stage = 'STABLE_ROOM';
    draft.roomLines = linesFor(rng, draft.boxers);
  });
}

function beatsFor(boxer: LudusBoxer): VignetteBeat[] {
  return [
    {
      place: 'Gym',
      text: `${boxer.name} is on the bag. Two rounds of pads before the car comes.`,
      left: { label: 'Work the jab', cash: -2, hype: 1, ego: -1, heat: 0 },
      right: { label: 'Spar hard', cash: -4, hype: 3, ego: 2, heat: 1 },
    },
    {
      place: 'Press',
      text: `A recorder clicks on. They want ${boxer.name} to say the other man's name.`,
      left: { label: 'Talk up the fight', cash: 0, hype: 6, ego: 3, heat: 1 },
      right: { label: 'Say nothing', cash: 0, hype: -2, ego: -2, heat: -1 },
    },
    {
      place: 'Bar',
      text: `The bar is too loud. A stranger is buying rounds for ${boxer.name}.`,
      left: { label: 'Send him home', cash: -1, hype: -1, ego: -2, heat: -2 },
      right: { label: 'Let him stay', cash: 2, hype: 2, ego: 3, heat: 4 },
    },
  ];
}

export function pushBoxer(ludus: Ludus, id: string): Ludus {
  if (ludus.stage !== 'STABLE_ROOM') throw new Error('Pick a fighter from the room');
  if (ludus.ending) return ludus;
  const boxer = ludus.boxers.find((entry) => entry.id === id);
  if (!boxer) throw new Error(`No boxer ${id}`);
  return {
    ...cloneLudus(ludus),
    stage: 'CAMP_VIGNETTE',
    focusId: id,
    phone: null,
    vignette: { beats: beatsFor(boxer), index: 0, awaitingPhone: false },
  };
}

export function chooseBeat(ludus: Ludus, side: Side): Ludus {
  const vignette = ludus.vignette;
  if (ludus.stage !== 'CAMP_VIGNETTE' || !vignette || vignette.awaitingPhone) throw new Error('No beat to play');
  const beat = vignette.beats[vignette.index];
  if (!beat) throw new Error('Beat is missing');
  const meters = shiftLudusMeters(ludus.meters, beat[side]);
  const index = vignette.index + 1;
  return {
    ...cloneLudus(ludus),
    meters,
    ending: ludusEndingFor(meters),
    vignette: { ...vignette, index, awaitingPhone: index >= vignette.beats.length },
  };
}

const OPPONENT_NAMES = ['Marty Voss', 'Ike Gallon', 'Ned Cybulski', 'Saul Briggs'] as const;

export function ringHim(ludus: Ludus, text: string): Ludus {
  if (ludus.stage !== 'CAMP_VIGNETTE' || !ludus.vignette?.awaitingPhone) throw new Error('Nobody to ring');
  if (ludus.ending) return ludus;
  return withLudusRng(ludus, (rng, draft) => {
    const boxer = draft.boxers.find((entry) => entry.id === draft.focusId);
    if (!boxer) throw new Error('No fighter on the call');
    const phone = resolveCall({ text, ego: boxer.ego, traits: boxer.traits, rng });
    draft.phone = phone;
    const delta = phone.verdict === 'DEFY' ? { cash: 0, hype: -4, ego: 8, heat: 3 } : { ...ZERO_DELTA, cash: -2, hype: 4, ego: -2, heat: 1 };
    if (phone.verdict === 'DEFY') boxer.ego = Math.min(100, boxer.ego + 4);
    draft.meters = shiftLudusMeters(draft.meters, delta);
    draft.ending = ludusEndingFor(draft.meters);
    if (draft.ending) return;
    const opponent = bodyFromBoxer(
      {
        ...boxer,
        id: 'opponent',
        name: pick(rng, OPPONENT_NAMES) ?? 'Marty Voss',
        nick: 'The Other Man',
        traits: [],
        ego: 40,
        colour: '#6d3947',
        hp: boxer.maxHp,
        stamina: boxer.maxStamina,
        strength: clamp(boxer.strength - 6 + intBetween(rng, 0, 8), 36, 92),
        agility: clamp(boxer.agility - 4 + intBetween(rng, 0, 6), 36, 92),
        reach: clamp(boxer.reach - 2 + intBetween(rng, 0, 4), 60, 84),
      },
      214,
      -1,
    );
    draft.fight = createSkeletonFight(bodyFromBoxer(boxer, 108, 1), opponent, rng.seed(), 4);
    draft.stage = 'ARENA';
    draft.vignette = null;
  });
}

function nightPurse(winner: 'blue' | 'red' | 'draw' | null, method: string | null): MeterDelta {
  if (winner === 'blue') return { cash: 22, hype: 7, ego: 4, heat: method === 'KO' ? 4 : 1 };
  if (winner === 'draw') return { cash: 12, hype: 1, ego: 0, heat: 1 };
  return { cash: 8, hype: -6, ego: -2, heat: 2 };
}

function sealFight(ludus: Ludus): Ludus {
  const fight = ludus.fight;
  if (!fight || fight.phase !== 'done') return ludus;
  const meters = shiftLudusMeters(ludus.meters, nightPurse(fight.winner, fight.method));
  const growth = growthFromTelemetry(fight.blue);
  return {
    ...ludus,
    stage: 'POST_FIGHT',
    meters,
    ending: ludusEndingFor(meters),
    growth: [growth],
  };
}

/** If the skeleton fight has already ended, bank the meters and the growth note. */
export function observeFight(ludus: Ludus): Ludus {
  if (ludus.stage !== 'ARENA' || ludus.fight?.phase !== 'done') return ludus;
  return sealFight(ludus);
}

export function playArenaRound(ludus: Ludus): Ludus {
  if (ludus.stage !== 'ARENA' || !ludus.fight) throw new Error('No fight');
  if (ludus.fight.phase !== 'fighting') throw new Error('Corner is waiting');
  return observeFight({ ...ludus, fight: playRound(ludus.fight) });
}

export function promoterCall(ludus: Ludus, side: Side): Ludus {
  if (ludus.stage !== 'ARENA' || !ludus.fight || ludus.fight.phase !== 'intermission') throw new Error('No promoter call');
  return { ...ludus, fight: answerSkeletonCorner(ludus.fight, side) };
}

function applyGrowth(boxer: LudusBoxer, growth: StatGrowth): void {
  boxer.agility = Math.min(99, boxer.agility + growth.agility);
  boxer.strength = Math.min(99, boxer.strength + growth.strength);
  boxer.reach = Math.min(99, boxer.reach + growth.reach);
  boxer.maxStamina = Math.min(99, boxer.maxStamina + growth.maxStamina);
  boxer.maxHp = Math.min(140, boxer.maxHp + growth.maxHp);
  boxer.hp = boxer.maxHp;
  boxer.stamina = boxer.maxStamina;
  boxer.fights += 1;
  if (growth.trait && !boxer.traits.includes(growth.trait)) boxer.traits = [...boxer.traits, growth.trait];
}

export function bankProgress(ludus: Ludus): Ludus {
  if (ludus.stage !== 'POST_FIGHT') throw new Error('Nothing to bank');
  if (ludus.ending) return ludus;
  return withLudusRng(ludus, (rng, draft) => {
    const growth = draft.growth[0];
    const boxer = draft.boxers.find((entry) => entry.id === growth?.boxerId);
    if (boxer && growth) applyGrowth(boxer, growth);
    draft.week += 1;
    draft.stage = 'STABLE_ROOM';
    draft.fight = null;
    draft.growth = [];
    draft.phone = null;
    draft.focusId = null;
    draft.roomLines = linesFor(rng, draft.boxers);
  });
}
