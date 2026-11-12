import { canAfford, upgradeCost, UPGRADES } from './economy';
import type { GameState } from './types';

export function createInitialState(seed = 1): GameState {
  return {
    coins: 0,
    coinsPerTap: 1,
    coinsPerSecond: 0,
    elapsedSeconds: 0,
    taps: 0,
    rngSeed: seed,
  };
}

export function tap(state: GameState): GameState {
  return { ...state, coins: state.coins + state.coinsPerTap, taps: state.taps + 1 };
}

export function advance(state: GameState, deltaSeconds: number): GameState {
  if (deltaSeconds <= 0) return state;
  return {
    ...state,
    coins: state.coins + state.coinsPerSecond * deltaSeconds,
    elapsedSeconds: state.elapsedSeconds + deltaSeconds,
  };
}

export function buyUpgrade(
  state: GameState,
  upgradeId: string,
  timesBought: number,
): { state: GameState; bought: boolean } {
  const upgrade = UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return { state, bought: false };
  const cost = upgradeCost(upgrade, timesBought);
  if (!canAfford(state, cost)) return { state, bought: false };
  return { state: upgrade.effect({ ...state, coins: state.coins - cost }), bought: true };
}
