export type { GameState, UpgradeDefinition } from './types';
export { UPGRADES, upgradeCost, canAfford } from './economy';
export { createInitialState, tap, advance, buyUpgrade } from './simulation';
export { nextRandom } from './rng';
