import { CARDS } from './content/cards';
import { CHARACTERS } from './content/characters';
import { DIVISIONS } from './content/divisions';
import { MAX_FIGHTERS, PROSPECTS, SIGNABLE } from './content/fighters';
import { ENDINGS, HEADLINES } from './content/text';
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
  Meter,
  Side,
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
