import type { GameState, UpgradeDefinition } from './types';

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'glove',
    name: 'Heavier gloves',
    baseCost: 10,
    costGrowth: 1.5,
    effect: (state) => ({ ...state, coinsPerTap: state.coinsPerTap + 1 }),
  },
  {
    id: 'trainer',
    name: 'Hire a trainer',
    baseCost: 50,
    costGrowth: 1.6,
    effect: (state) => ({ ...state, coinsPerSecond: state.coinsPerSecond + 1 }),
  },
];

export function upgradeCost(upgrade: UpgradeDefinition, timesBought: number): number {
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costGrowth, timesBought));
}

export function canAfford(state: GameState, cost: number): boolean {
  return state.coins >= cost;
}
