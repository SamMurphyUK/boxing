import { create } from 'zustand';

import { advance, buyUpgrade, createInitialState, tap, type GameState } from '@game/index';

interface GameStore {
  state: GameState;
  purchases: Record<string, number>;
  tap: () => void;
  tick: (deltaSeconds: number) => void;
  buy: (upgradeId: string) => boolean;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(Date.now() % 100000),
  purchases: {},
  tap: () => set({ state: tap(get().state) }),
  tick: (deltaSeconds) => set({ state: advance(get().state, deltaSeconds) }),
  buy: (upgradeId) => {
    const { state, purchases } = get();
    const result = buyUpgrade(state, upgradeId, purchases[upgradeId] ?? 0);
    if (!result.bought) return false;
    set({
      state: result.state,
      purchases: { ...purchases, [upgradeId]: (purchases[upgradeId] ?? 0) + 1 },
    });
    return true;
  },
  reset: () => set({ state: createInitialState(Date.now() % 100000), purchases: {} }),
}));
