import { create } from 'zustand';

import {
  bankProgress,
  chooseBeat,
  enterStable,
  newLudus,
  observeFight,
  promoterCall,
  pushBoxer,
  ringHim,
  stepExchange,
  type Ludus,
  type Side,
  type SkeletonFight,
} from '@game/index';

interface LudusStore {
  ludus: Ludus | null;
  begin: () => void;
  clear: () => void;
  push: (id: string) => void;
  beat: (side: Side) => void;
  call: (text: string) => void;
  tick: () => void;
  resolve: (fight: SkeletonFight) => void;
  corner: (side: Side) => void;
  bank: () => void;
}

function freshSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) || 1;
}

export const useLudusStore = create<LudusStore>((set, get) => ({
  ludus: null,
  begin: () => set({ ludus: enterStable(newLudus(freshSeed())) }),
  clear: () => set({ ludus: null }),
  push: (id) => {
    const ludus = get().ludus;
    if (!ludus) return;
    set({ ludus: pushBoxer(ludus, id) });
  },
  beat: (side) => {
    const ludus = get().ludus;
    if (!ludus) return;
    set({ ludus: chooseBeat(ludus, side) });
  },
  call: (text) => {
    const ludus = get().ludus;
    if (!ludus) return;
    set({ ludus: ringHim(ludus, text) });
  },
  tick: () => {
    const ludus = get().ludus;
    if (!ludus?.fight || ludus.stage !== 'ARENA' || ludus.fight.phase !== 'fighting') return;
    set({ ludus: observeFight({ ...ludus, fight: stepExchange(ludus.fight) }) });
  },
  resolve: (fight) => {
    const ludus = get().ludus;
    if (!ludus || ludus.stage !== 'ARENA') return;
    set({ ludus: observeFight({ ...ludus, fight }) });
  },
  corner: (side) => {
    const ludus = get().ludus;
    if (!ludus) return;
    set({ ludus: promoterCall(ludus, side) });
  },
  bank: () => {
    const ludus = get().ludus;
    if (!ludus) return;
    set({ ludus: bankProgress(ludus) });
  },
}));
