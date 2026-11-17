// Offline burner phone. Keyword and n-gram intent, no network.
// Blood and Gold equivalent: the pep-talk statuses in gladiatorStats.ts
// (Inspire, Petulant, Panic, Reckless). Those were buttons. This is the same
// idea read off the player's own sentence.

import { chance, type Rng } from '../rng';
import type { PhoneIntent, PhoneRead, PhoneResolution, PhoneTone, PhoneVerdict } from '../types';

const INTENTS: readonly PhoneIntent[] = ['THREATEN', 'BRIBE', 'HYPE_UP', 'HUMBLE', 'TACTICAL'];

const GRAMS: Record<PhoneIntent, readonly string[]> = {
  THREATEN: ['or else', 'you will regret', 'i will ruin', 'kneecap', 'threat', 'hurt you', 'destroy you', 'last chance', 'ruin'],
  BRIBE: ['bribe', 'envelope', 'cash', 'money', 'pay you', 'your cut', 'grand', 'wire it'],
  HYPE_UP: ['star', 'legend', 'crowd', 'poster', 'famous', 'hype', 'they will chant', 'main event'],
  HUMBLE: ['please', 'sorry', 'for the team', 'we need', 'respect', 'humble', 'quietly', 'i am asking'],
  TACTICAL: ['jab', 'guard', 'body', 'clinch', 'stick and move', 'left hand', 'round', 'feet', 'hands up'],
};

const TONE: Record<PhoneIntent, PhoneTone> = {
  THREATEN: 'harsh',
  BRIBE: 'slick',
  HYPE_UP: 'hot',
  HUMBLE: 'soft',
  TACTICAL: 'flat',
};

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'you', 'your', 'yours', 'for', 'this', 'that', 'with', 'have', 'will',
  'just', 'about', 'from', 'they', 'them', 'his', 'her', 'she', 'him', 'are', 'was', 'were', 'please',
  'sorry', 'into', 'onto', 'over', 'under', 'then', 'than', 'keep', 'tonight', 'again', 'nothing',
  'else', 'dont', "don't", 'what', 'when', 'where', 'who', 'how', 'not', 'but', 'its', "it's",
]);

function scoreIntent(hay: string, grams: readonly string[]): number {
  let score = 0;
  for (const gram of grams) {
    if (hay.includes(gram)) score += gram.includes(' ') ? 2 : 1;
  }
  return score;
}

export function keyNouns(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z][a-z']+/g) ?? [];
  const nouns: string[] = [];
  for (const word of words) {
    const bare = word.replace(/'/g, '');
    if (bare.length < 3 || STOP.has(bare) || nouns.includes(bare)) continue;
    nouns.push(bare);
  }
  return nouns.slice(0, 4);
}

export function classifyUtterance(text: string): PhoneRead {
  const hay = text.toLowerCase();
  let best: PhoneIntent = 'TACTICAL';
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = scoreIntent(hay, GRAMS[intent]);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return {
    intent: best,
    tone: bestScore === 0 ? 'flat' : TONE[best],
    nouns: keyNouns(text),
  };
}

/** Above 1 always defies. At or below 0 always obeys. Otherwise the seed rolls. */
export function defyChance(intent: PhoneIntent, ego: number, traits: readonly string[]): number {
  let defy = ego / 100;
  const has = (trait: string) => traits.includes(trait);
  if (intent === 'THREATEN' && (has('proud') || has('volatile'))) defy += 0.35;
  if (intent === 'THREATEN' && has('loyal')) defy -= 0.15;
  if (intent === 'HUMBLE' && (has('loyal') || has('quiet'))) defy -= 0.45;
  if (intent === 'BRIBE' && has('hungry')) defy -= 0.4;
  if (intent === 'BRIBE' && has('proud')) defy += 0.25;
  if (intent === 'HYPE_UP' && has('showman')) defy -= 0.35;
  if (intent === 'HYPE_UP' && has('quiet')) defy += 0.2;
  if (intent === 'TACTICAL' && has('loyal')) defy -= 0.3;
  if (intent === 'TACTICAL' && has('volatile')) defy += 0.1;
  return defy;
}

function verdictFor(defy: number, rng: Rng): PhoneVerdict {
  if (defy >= 1) return 'DEFY';
  if (defy <= 0) return 'OBEY';
  return chance(rng, defy) ? 'DEFY' : 'OBEY';
}

function echo(noun: string): string {
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

function replyFor(intent: PhoneIntent, verdict: PhoneVerdict, nouns: readonly string[]): string {
  const noun = echo(nouns[0] ?? 'the fight');
  const line: Record<PhoneIntent, Record<PhoneVerdict, string>> = {
    THREATEN: {
      OBEY: `Fine. You said ${noun}. I will be in the ring. Do not say ${noun} again.`,
      DEFY: `You do not threaten me with ${noun}. Find another body.`,
    },
    BRIBE: {
      OBEY: `Put the ${noun} where I can see it. Then I walk.`,
      DEFY: `Keep your ${noun}. I am not for sale.`,
    },
    HYPE_UP: {
      OBEY: `Say ${noun} again under the lights. I will give them that.`,
      DEFY: `${noun} is noise. I do not fight for a poster.`,
    },
    HUMBLE: {
      OBEY: `Alright. ${noun}. We do it your way tonight.`,
      DEFY: `Do not dress it up as ${noun}. I heard the order underneath.`,
    },
    TACTICAL: {
      OBEY: `Got it. ${noun}. I will fight that and nothing else.`,
      DEFY: `I do not take ${noun} from a man outside the ropes.`,
    },
  };
  return line[intent][verdict];
}

export function resolveCall(input: {
  text: string;
  ego: number;
  traits: readonly string[];
  rng: Rng;
}): PhoneResolution {
  const read = classifyUtterance(input.text);
  const verdict = verdictFor(defyChance(read.intent, input.ego, input.traits), input.rng);
  return { ...read, verdict, reply: replyFor(read.intent, verdict, read.nouns) };
}
