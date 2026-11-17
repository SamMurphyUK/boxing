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

/** Five-stage ludus loop. Separate from the swipe `Career` meters so existing saves stay valid. */
export type LudusStage = 'INTRO' | 'STABLE_ROOM' | 'CAMP_VIGNETTE' | 'ARENA' | 'POST_FIGHT';

/**
 * Asymmetric promotion meters.
 * cash loses at <= 0 and is uncapped upward.
 * hype loses at <= 0 and is uncapped upward.
 * ego loses at >= 100 (the star walks out).
 * heat loses at >= 100 (the licence is suspended).
 */
export interface LudusMeters {
  cash: number;
  hype: number;
  ego: number;
  heat: number;
}

export interface MeterDelta {
  cash: number;
  hype: number;
  ego: number;
  heat: number;
}

export type LudusTrait = 'proud' | 'hungry' | 'loyal' | 'volatile' | 'showman' | 'quiet';

export interface LudusBoxer {
  id: string;
  name: string;
  nick: string;
  traits: LudusTrait[];
  /** Personal pride. The promotion meter `meters.ego` is separate. */
  ego: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  agility: number;
  strength: number;
  reach: number;
  fights: number;
  colour: string;
}

export type VignettePlace = 'Gym' | 'Press' | 'Bar';

export interface VignetteChoice extends MeterDelta {
  label: string;
}

export interface VignetteBeat {
  place: VignettePlace;
  text: string;
  left: VignetteChoice;
  right: VignetteChoice;
}

export interface RoomLine {
  speakerId: string;
  text: string;
}

export type PhoneIntent = 'THREATEN' | 'BRIBE' | 'HYPE_UP' | 'HUMBLE' | 'TACTICAL';
export type PhoneTone = 'harsh' | 'slick' | 'hot' | 'soft' | 'flat';
export type PhoneVerdict = 'OBEY' | 'DEFY';

export interface PhoneRead {
  intent: PhoneIntent;
  tone: PhoneTone;
  nouns: string[];
}

export interface PhoneResolution extends PhoneRead {
  verdict: PhoneVerdict;
  reply: string;
}

export type JointName = 'root' | 'torso' | 'head' | 'leadHand' | 'rearHand' | 'leadFoot' | 'rearFoot';
export type PunchName = 'jab' | 'cross' | 'leadHook' | 'bodyRip' | 'overhand';
export type CornerPlan = 'normal' | 'press' | 'shell' | 'body' | 'box';

/** Ground plane. `x` runs across the 320-wide frame, `z` runs into the room. */
export interface JointPoint {
  x: number;
  z: number;
}

export type Pose = Record<JointName, JointPoint>;

export interface PunchTelemetry {
  thrown: Record<PunchName, number>;
  landed: Record<PunchName, number>;
  damageDealt: number;
  damageTaken: number;
}

export interface SkeletonBody {
  id: string;
  name: string;
  traits: LudusTrait[];
  ego: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  agility: number;
  strength: number;
  reach: number;
  facing: 1 | -1;
  anchorX: number;
  anchorZ: number;
  /** Pixel hand height. Stamina, ego, agility, and the corner plan all move it. */
  guardHeight: number;
  pose: Pose;
  telemetry: PunchTelemetry;
  colour: string;
}

export interface PromoterCall {
  text: string;
  left: string;
  right: string;
  leftPlan: CornerPlan;
  rightPlan: CornerPlan;
}

export type SkeletonPhase = 'fighting' | 'intermission' | 'done';

export interface ExchangeMark {
  actor: 'blue' | 'red';
  punch: PunchName;
  landed: boolean;
}

export interface SkeletonFight {
  round: number;
  maxRounds: number;
  exchange: number;
  phase: SkeletonPhase;
  blue: SkeletonBody;
  red: SkeletonBody;
  plan: CornerPlan;
  call: PromoterCall | null;
  lastExchange: ExchangeMark | null;
  winner: 'blue' | 'red' | 'draw' | null;
  method: FightMethod | null;
  seed: number;
  log: string[];
}

export interface StatGrowth {
  boxerId: string;
  agility: number;
  strength: number;
  reach: number;
  maxStamina: number;
  maxHp: number;
  trait: LudusTrait | null;
  note: string;
}

export interface LudusEnding {
  key: 'cash' | 'hype' | 'ego' | 'heat';
  title: string;
  reason: string;
}

export interface LudusVignette {
  beats: VignetteBeat[];
  index: number;
  awaitingPhone: boolean;
}

export interface Ludus {
  stage: LudusStage;
  meters: LudusMeters;
  boxers: LudusBoxer[];
  focusId: string | null;
  roomLines: RoomLine[];
  vignette: LudusVignette | null;
  phone: PhoneResolution | null;
  fight: SkeletonFight | null;
  growth: StatGrowth[];
  week: number;
  seed: number;
  ending: LudusEnding | null;
}
