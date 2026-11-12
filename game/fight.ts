import { activeFighter, activeFighterIndex, applyEffects } from './career';
import { HEADLINES, LINES } from './content/text';
import { clamp, fillTemplate, money, record, standing } from './format';
import { between, chance, createRng, intBetween, pick, type Rng } from './rng';
import type {
  Career,
  CornerPrompt,
  Fighter,
  FighterStats,
  FightOffer,
  FightResult,
  FightState,
  LogLine,
  Meters,
  RoundReport,
  TaleOfTheTape,
} from './types';

type LineKey = keyof typeof LINES;

function effectiveStats(fighter: Fighter): FighterStats {
  const base = { skill: fighter.skill, power: fighter.power, chin: fighter.chin, stamina: fighter.stamina };
  return fighter.hurt ? { ...base, skill: base.skill - 6, chin: base.chin - 8 } : base;
}

function average(stats: FighterStats): number {
  return (stats.skill + stats.power + stats.chin + stats.stamina) / 4;
}

export function winChance(us: FighterStats, them: FighterStats): number {
  return 1 / (1 + Math.exp(-(average(us) - average(them)) * 0.09));
}

function roundEffectiveness(stats: FighterStats, round: number): number {
  return stats.skill * 0.5 + stats.power * 0.2 + stats.stamina * 0.3 - (round * (100 - stats.stamina)) / 28;
}

export function fightTitle(fight: FightState, division: string): string {
  if (fight.kind === 'title') return 'World title fight';
  if (fight.kind === 'mandatory' || fight.kind === 'voluntary') return 'Title defence';
  return `${fight.rounds} rounds · ${division}`;
}

export function startFight(career: Career, offer: FightOffer, seed: number): { fight: FightState; opening: LogLine } {
  const fighter = activeFighter(career);
  const fight: FightState = {
    fighterIndex: activeFighterIndex(career),
    fighterName: fighter.name,
    us: effectiveStats(fighter),
    opp: offer.opp,
    purse: offer.purse,
    kind: offer.kind,
    rounds: offer.rounds,
    round: 0,
    momentum: 0,
    ourDamage: 0,
    theirDamage: 0,
    ourKnockdowns: 0,
    theirKnockdowns: 0,
    mode: 'normal',
    roundMarks: [],
    outcome: null,
    seed,
  };
  return {
    fight,
    opening: { text: `${fighter.name} vs ${offer.opp.name}. ${offer.rounds} rounds. The bell goes.`, tone: 'big' },
  };
}

export function taleOfTheTape(career: Career, fight: FightState): TaleOfTheTape {
  const fighter = career.fighters[fight.fighterIndex];
  return {
    us: { ...fight.us, name: fighter.name, nick: fighter.nick, record: record(fighter), standing: standing(fighter) },
    them: { ...fight.opp, name: fight.opp.name, nick: fight.opp.nick, record: fight.opp.record, standing: standing(fight.opp) },
    winChance: winChance(fight.us, fight.opp),
    injured: fighter.hurt,
    purse: fight.purse,
    title: fightTitle(fight, career.division),
  };
}

function line(rng: Rng, fight: FightState, key: LineKey, tone: LogLine['tone']): LogLine {
  const template = pick(rng, LINES[key]) ?? '';
  return { text: fillTemplate(template, fight.fighterName, fight.opp.name), tone };
}

function cornerPromptFor(fight: FightState, round: number): CornerPrompt | null {
  if (round >= fight.rounds || fight.outcome) return null;
  if (fight.ourDamage > fight.us.chin * 0.85) {
    return {
      kind: 'towel',
      text: `${fight.fighterName} is badly hurt. The doctor is looking at the corner.`,
      left: 'Throw in the towel',
      right: 'Let him fight',
    };
  }
  const early = round === Math.ceil(fight.rounds / 4);
  const late = round === Math.ceil(fight.rounds * 0.65);
  if (!early && !late) return null;
  const lead = fight.roundMarks.reduce((sum, mark) => sum + (mark === 'win' ? 1 : mark === 'loss' ? -1 : 0), 0);
  if (lead > 0) {
    return {
      kind: 'ahead',
      text: `${fight.fighterName} is ahead on the cards. What’s the call?`,
      left: 'Push for the stoppage',
      right: 'Protect the lead',
    };
  }
  return {
    kind: 'behind',
    text: `${fight.fighterName} ${lead < 0 ? 'is behind' : 'is level'}. What’s the call?`,
    left: 'Go to the body',
    right: 'Box and move',
  };
}

export function runRound(input: FightState): RoundReport {
  if (input.outcome) throw new Error('Fight is already over');
  const rng = createRng(input.seed);
  const fight: FightState = { ...input, roundMarks: [...input.roundMarks] };
  const round = fight.round + 1;
  fight.round = round;
  const lines: LogLine[] = [{ text: `ROUND ${round}`, tone: 'round' }];
  let knockdown: RoundReport['knockdown'] = null;
  const mode = fight.mode;
  const noise = () => between(rng, -14, 14) * (mode === 'protect' ? 0.6 : 1);
  const ourScore = roundEffectiveness(fight.us, round) + (mode === 'box' ? -4 : mode === 'protect' ? -3 : 0) + noise();
  const theirScore = roundEffectiveness(fight.opp, round) - (mode === 'body' ? round * 1.2 : 0) + noise();
  const diff = ourScore - theirScore;
  const damageMultiplier = mode === 'push' ? 1.5 : mode === 'protect' ? 0.6 : 1;
  const knockdownMultiplier =
    mode === 'push' ? 1.6 : mode === 'box' || mode === 'protect' ? 0.6 : mode === 'body' ? 1.2 : 1;
  const ourPower = fight.us.power + (mode === 'body' ? 10 : 0);
  const bucket: LineKey = diff > 15 ? 'dom' : diff > 0 ? 'edge' : diff > -15 ? 'ledge' : 'ldom';
  lines.push(line(rng, fight, bucket, diff > 0 ? 'good' : 'bad'));

  fight.theirDamage += (Math.max(0, diff) * 0.5 + ourPower * 0.08 + between(rng, 0, 6)) * damageMultiplier;
  fight.ourDamage +=
    (Math.max(0, -diff) * 0.5 + fight.opp.power * 0.08 + between(rng, 0, 6)) *
    damageMultiplier *
    (mode === 'box' ? 0.7 : mode === 'body' ? 1.1 : 1);

  let theirKnockdownsThisRound = 0;
  if (diff > 12 && chance(rng, (ourPower / 100) * 0.45 * knockdownMultiplier)) {
    fight.theirKnockdowns += 1;
    theirKnockdownsThisRound += 1;
    fight.theirDamage += 16;
    knockdown = 'them';
    lines.push(line(rng, fight, 'kdThem', 'big'));
  }
  if (diff < -12 && chance(rng, (fight.opp.power / 100) * 0.42 * knockdownMultiplier)) {
    fight.ourKnockdowns += 1;
    fight.ourDamage += 16;
    knockdown = 'us';
    lines.push(line(rng, fight, 'kdUs', 'bigBad'));
  }

  if (fight.theirDamage > fight.opp.chin * 1.15 || theirKnockdownsThisRound >= 2) {
    const method = theirKnockdownsThisRound ? 'KO' : 'TKO';
    fight.outcome = { win: true, draw: false, method, round, towel: false };
    lines.push(line(rng, fight, method === 'KO' ? 'koThem' : 'tkoThem', 'big'));
  } else if (fight.ourDamage > fight.us.chin * 1.15) {
    const method = fight.ourKnockdowns ? 'KO' : 'TKO';
    fight.outcome = { win: false, draw: false, method, round, towel: false };
    lines.push(line(rng, fight, method === 'KO' ? 'koUs' : 'tkoUs', 'bigBad'));
  } else {
    if (fight.theirDamage > fight.opp.chin * 0.85) lines.push(line(rng, fight, 'hurtThem', 'good'));
    if (fight.ourDamage > fight.us.chin * 0.85) lines.push(line(rng, fight, 'hurtUs', 'bad'));
    fight.roundMarks.push(diff > 2 ? 'win' : diff < -2 ? 'loss' : 'even');
    fight.momentum = clamp(fight.momentum + diff * 0.7, -100, 100);
    if (round >= fight.rounds) {
      const lead = fight.roundMarks.reduce((sum, mark) => sum + (mark === 'win' ? 1 : mark === 'loss' ? -1 : 0), 0);
      fight.outcome = { win: lead > 0, draw: lead === 0, method: 'Points', round: fight.rounds, towel: false };
      lines.push({ text: 'Final bell. We go to the scorecards.', tone: 'round' });
      lines.push({
        text:
          lead === 0
            ? 'A split draw. Nobody is happy.'
            : lead > 0
              ? `${fight.fighterName} wins on points.`
              : `${fight.opp.name} takes the decision.`,
        tone: 'big',
      });
    }
  }
  fight.seed = rng.seed();
  return { fight, lines, knockdown, prompt: cornerPromptFor(fight, round) };
}

export function answerCorner(input: FightState, prompt: CornerPrompt, choice: 'left' | 'right'): { fight: FightState; lines: LogLine[] } {
  const rng = createRng(input.seed);
  const fight: FightState = { ...input, roundMarks: [...input.roundMarks] };
  const lines: LogLine[] = [];
  if (prompt.kind === 'towel') {
    if (choice === 'left') {
      fight.outcome = { win: false, draw: false, method: 'TKO', round: fight.round + 1, towel: true };
      lines.push(line(rng, fight, 'towel', 'bigBad'));
    }
  } else {
    fight.mode = prompt.kind === 'ahead' ? (choice === 'left' ? 'push' : 'protect') : choice === 'left' ? 'body' : 'box';
    const instruction = {
      push: 'Go and get him.',
      protect: 'Stay tight, don’t get caught.',
      body: 'Rip the body, take his legs.',
      box: 'Box him, use the ring.',
      normal: '',
    }[fight.mode];
    lines.push({ text: `Corner: “${instruction}”`, tone: 'good' });
  }
  fight.seed = rng.seed();
  return { fight, lines };
}

export function resolveFight(input: Career, fight: FightState): { career: Career; result: FightResult } {
  const outcome = fight.outcome;
  if (!outcome) throw new Error('Fight has not finished');
  const rng = createRng(fight.seed);
  const career: Career = JSON.parse(JSON.stringify(input)) as Career;
  const fighter = career.fighters[fight.fighterIndex];
  const opp = fight.opp;
  const title = fight.kind === 'title';
  const defence = fight.kind === 'mandatory' || fight.kind === 'voluntary';
  const opponentRank = opp.champ ? 1 : opp.rank;
  const before = { rank: fighter.rank, champ: fighter.champ };
  const headline = (key: keyof typeof HEADLINES) =>
    fillTemplate(pick(rng, HEADLINES[key]) ?? '', fighter.name, opp.name, outcome.round);

  career.fights += 1;
  fighter.fights += 1;
  const purse = outcome.draw
    ? Math.round(fight.purse * 0.75)
    : outcome.win
      ? fight.purse
      : Math.round(fight.purse * 0.5);
  career.purses += purse;
  const deltas: Meters = {
    cash: Math.round((outcome.win ? 3 : 1) + (21 - opponentRank) / 3 + (title || defence ? 6 : 0)),
    hype: 0,
    stable: 0,
    rep: 0,
  };
  const stoppage = outcome.method !== 'Points';
  if (outcome.draw) {
    fighter.draws += 1;
    deltas.hype = 2;
    career.news = [headline('draw'), ...career.news].slice(0, 3);
  } else if (outcome.win) {
    fighter.wins += 1;
    if (stoppage) {
      fighter.kos += 1;
      career.kos += 1;
    }
    career.wins += 1;
    deltas.hype = Math.round(2 + (21 - opponentRank) / 4 + (stoppage ? 3 : 0) + (title ? 10 : 0));
    deltas.rep = fight.kind === 'step' || title || fight.kind === 'mandatory' ? 4 : 1;
    deltas.stable = 4;
    let news: string;
    if (title) {
      fighter.champ = true;
      career.titleWon = true;
      fighter.rank = 1;
      news = headline('title');
    } else if (defence) {
      news = headline('win');
    } else {
      fighter.rank = fight.kind === 'step' ? Math.min(fighter.rank, opponentRank) : Math.max(1, fighter.rank - 1);
      news = headline(stoppage ? 'ko' : 'win');
    }
    career.news = [news, ...career.news].slice(0, 3);
    fighter.skill = Math.min(95, fighter.skill + 1);
    fighter.stamina = Math.min(95, fighter.stamina + 1);
  } else {
    fighter.losses += 1;
    career.flags.lostfight = true;
    deltas.hype = -6;
    deltas.rep = -2;
    deltas.stable = outcome.towel ? -4 : outcome.method === 'KO' ? -14 : outcome.method === 'TKO' ? -10 : -7;
    if (!outcome.towel && stoppage) fighter.hurt = true;
    if (defence) {
      fighter.champ = false;
      fighter.rank = 2;
    } else if (title) {
      fighter.rank = 2;
    } else {
      fighter.rank = Math.min(20, fighter.rank + 3);
    }
    career.news = [headline(stoppage ? 'kolost' : 'loss'), ...career.news].slice(0, 3);
  }
  if (outcome.win && fighter.hurt && chance(rng, 0.5)) fighter.hurt = false;
  career.bestRank = Math.min(career.bestRank, fighter.rank);
  applyEffects(career, { c: deltas.cash, h: deltas.hype, s: deltas.stable, r: deltas.rep });
  career.week += 1;
  career.cardsLeft = intBetween(rng, 4, 6);
  career.pending = null;
  career.current = null;
  career.seed = rng.seed();

  const rankingMove: FightResult['rankingMove'] =
    (fighter.champ && !before.champ) || fighter.rank < before.rank
      ? 'up'
      : fighter.rank > before.rank || (before.champ && !fighter.champ)
        ? 'down'
        : 'same';
  const verb = outcome.draw ? 'draws with' : outcome.win ? 'beats' : 'loses to';
  return {
    career,
    result: {
      outcome: outcome.draw ? 'draw' : outcome.win ? 'win' : 'loss',
      headline: title && outcome.win ? 'NEW WORLD CHAMPION' : `${outcome.method}${stoppage ? ` · Round ${outcome.round}` : ''}`,
      summary: `${fighter.name} ${verb} ${opp.name}. Purse ${money(purse)}.`,
      purse,
      deltas,
      record: `${fighter.wins}-${fighter.losses}`,
      ranking: standing(fighter),
      rankingMove,
      newChampion: title && outcome.win,
      celebrate: outcome.win && (title || stoppage),
    },
  };
}
