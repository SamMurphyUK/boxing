import { create } from 'zustand';

import {
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
  type Career,
  type CornerPrompt,
  type DivisionName,
  type EndingSummary,
  type FightResult,
  type FightState,
  type LogLine,
  type RoundReport,
  type Side,
} from '@game/index';
import { ads } from '@services/ads';
import { storage } from '@services/storage';

const SAVE_KEY = 'ringside.promoter.save.v1';

export type ChoiceOutcome = 'next' | 'fight' | 'ended';

interface PromoterStore {
  hydrated: boolean;
  hasSave: boolean;
  career: Career | null;
  ending: EndingSummary | null;
  fight: FightState | null;
  prompt: CornerPrompt | null;
  result: FightResult | null;
  toast: string | null;
  hydrate: () => Promise<void>;
  startCareer: (division: DivisionName, prospectIndex: number) => void;
  wipe: () => void;
  choose: (side: Side) => ChoiceOutcome;
  beginFight: (side: Side) => LogLine;
  playRound: () => RoundReport;
  answer: (choice: 'left' | 'right') => LogLine[];
  finishFight: () => FightResult;
  leaveFight: () => ChoiceOutcome;
  takeSecondChance: () => Promise<boolean>;
  clearToast: () => void;
}

function persist(career: Career | null): void {
  if (career) void storage.set(SAVE_KEY, serializeCareer(career));
  else void storage.remove(SAVE_KEY);
}

function freshSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

export const usePromoterStore = create<PromoterStore>((set, get) => ({
  hydrated: false,
  hasSave: false,
  career: null,
  ending: null,
  fight: null,
  prompt: null,
  result: null,
  toast: null,

  hydrate: async () => {
    const career = deserializeCareer(await storage.get(SAVE_KEY));
    set({ hydrated: true, hasSave: career !== null, career });
  },

  startCareer: (division, prospectIndex) => {
    const career = newCareer(division, prospectIndex, freshSeed());
    persist(career);
    set({ career, hasSave: true, ending: null, fight: null, prompt: null, result: null });
  },

  wipe: () => {
    persist(null);
    set({ career: null, hasSave: false, ending: null, fight: null, prompt: null, result: null });
  },

  choose: (side) => {
    const { career } = get();
    if (!career?.current) return 'next';
    if (career.current.type === 'fight') return 'fight';
    const outcome = decide(career, side);
    if (outcome.kind === 'ended') {
      persist(null);
      set({ career: null, hasSave: false, ending: outcome.ending });
      return 'ended';
    }
    persist(outcome.career);
    set({
      career: outcome.career,
      toast: outcome.signed ? `Signed ${outcome.signed.name} “${outcome.signed.nick}”` : get().toast,
    });
    return 'next';
  },

  beginFight: (side) => {
    const career = get().career;
    if (!career) throw new Error('No career');
    const { fight, opening } = startFight(career, chooseFight(career, side), (career.seed ^ 0x5bd1e995) >>> 0);
    set({ fight, prompt: null, result: null });
    return opening;
  },

  playRound: () => {
    const fight = get().fight;
    if (!fight) throw new Error('No fight running');
    const report = runRound(fight);
    set({ fight: report.fight, prompt: report.prompt });
    return report;
  },

  answer: (choice) => {
    const { fight, prompt } = get();
    if (!fight || !prompt) return [];
    const answered = answerCorner(fight, prompt, choice);
    set({ fight: answered.fight, prompt: null });
    return answered.lines;
  },

  finishFight: () => {
    const { career, fight } = get();
    if (!career || !fight) throw new Error('No fight to finish');
    const resolved = resolveFight(career, fight);
    persist(resolved.career);
    set({ career: resolved.career, result: resolved.result });
    return resolved.result;
  },

  leaveFight: () => {
    const career = get().career;
    if (!career) return 'ended';
    const outcome = continueAfterFight(career);
    if (outcome.kind === 'ended') {
      persist(null);
      set({ career: null, hasSave: false, ending: outcome.ending, fight: null, result: null, prompt: null });
      return 'ended';
    }
    persist(outcome.career);
    set({ career: outcome.career, fight: null, result: null, prompt: null });
    return 'next';
  },

  takeSecondChance: async () => {
    const ending = get().ending;
    if (!ending || !ads.available) return false;
    const { rewarded } = await ads.showRewarded();
    if (!rewarded) return false;
    const career = secondChance(ending);
    persist(career);
    set({ career, hasSave: true, ending: null });
    return true;
  },

  clearToast: () => set({ toast: null }),
}));
