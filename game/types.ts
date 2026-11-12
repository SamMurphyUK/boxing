export type Meter = 'cash' | 'hype' | 'stable' | 'rep';
export type Meters = Record<Meter, number>;
export type EffectKey = 'c' | 'h' | 's' | 'r';
export type Effects = Partial<Record<EffectKey, number>>;
export type Side = 'left' | 'right';

export type DivisionName = 'Lightweight' | 'Welterweight' | 'Heavyweight';

export interface DivisionDef {
  scale: number;
  first: string[];
  last: string[];
  nicks: string[];
  champ: { name: string; nick: string };
}

export interface CharacterDef {
  name: string;
  role: string;
  colour: string;
}

export interface CardOption {
  label: string;
  fx: Effects;
  set?: string;
  sign?: boolean;
}

export interface CardDef {
  id: number;
  who: string;
  text: string;
  left: CardOption;
  right: CardOption;
  req?: string;
  signing?: boolean;
}

export interface FighterStats {
  skill: number;
  power: number;
  chin: number;
  stamina: number;
}

export interface FighterTemplate extends FighterStats {
  name: string;
  nick: string;
  arch: string;
  bio?: string;
  colour: string;
}

export interface Fighter extends FighterTemplate {
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  rank: number;
  champ: boolean;
  hurt: boolean;
  fights: number;
}

export interface Opponent extends FighterStats {
  name: string;
  nick: string;
  rank: number;
  champ: boolean;
  record: string;
}

export type FightKind = 'busy' | 'step' | 'title' | 'voluntary' | 'mandatory';

export interface FightOffer {
  opp: Opponent;
  purse: number;
  kind: FightKind;
  rounds: number;
}

export type CurrentCard = { type: 'decision'; id: number } | { type: 'fight' };

export interface Career {
  version: 1;
  division: DivisionName;
  week: number;
  meters: Meters;
  fighters: Fighter[];
  flags: Record<string, true>;
  used: Record<number, number>;
  recent: number[];
  cardsLeft: number;
  signed: string[];
  news: string[];
  fights: number;
  wins: number;
  kos: number;
  purses: number;
  peakCash: number;
  bestRank: number;
  titleWon: boolean;
  pending: { left: FightOffer; right: FightOffer } | null;
  current: CurrentCard | null;
  seen: number;
  seed: number;
}

export interface CardView {
  speakerId: string | null;
  speaker: CharacterDef;
  text: string;
  left: { label: string; fx: Effects };
  right: { label: string; fx: Effects };
  isFight: boolean;
  footer: string;
}

export type EndingKey = `${Meter}_${'lo' | 'hi'}`;

export interface EndingDef {
  title: string;
  story: string;
}

export interface EndingSummary {
  key: EndingKey;
  title: string;
  story: string;
  stats: { label: string; value: string }[];
  score: number;
  shareText: string;
  careerBeforeEnd: Career;
}

export type CornerMode = 'normal' | 'push' | 'protect' | 'body' | 'box';
export type FightMethod = 'KO' | 'TKO' | 'Points';

export interface FightOutcome {
  win: boolean;
  draw: boolean;
  method: FightMethod;
  round: number;
  towel: boolean;
}

export type RoundMark = 'win' | 'loss' | 'even';

export interface FightState {
  fighterIndex: number;
  fighterName: string;
  us: FighterStats;
  opp: Opponent;
  purse: number;
  kind: FightKind;
  rounds: number;
  round: number;
  momentum: number;
  ourDamage: number;
  theirDamage: number;
  ourKnockdowns: number;
  theirKnockdowns: number;
  mode: CornerMode;
  roundMarks: RoundMark[];
  outcome: FightOutcome | null;
  seed: number;
}

export type LogTone = 'plain' | 'round' | 'good' | 'bad' | 'big' | 'bigBad';

export interface LogLine {
  text: string;
  tone: LogTone;
}

export type CornerPrompt =
  | { kind: 'towel'; text: string; left: string; right: string }
  | { kind: 'ahead'; text: string; left: string; right: string }
  | { kind: 'behind'; text: string; left: string; right: string };

export interface RoundReport {
  fight: FightState;
  lines: LogLine[];
  knockdown: 'us' | 'them' | null;
  prompt: CornerPrompt | null;
}

export interface FightResult {
  outcome: 'win' | 'loss' | 'draw';
  headline: string;
  summary: string;
  purse: number;
  deltas: Meters;
  record: string;
  ranking: string;
  rankingMove: 'up' | 'down' | 'same';
  newChampion: boolean;
  celebrate: boolean;
}

export interface TaleOfTheTape {
  us: FighterStats & { name: string; nick: string; record: string; standing: string };
  them: FighterStats & { name: string; nick: string; record: string; standing: string };
  winChance: number;
  injured: boolean;
  purse: number;
  title: string;
}
