export interface GameState {
  coins: number;
  coinsPerTap: number;
  coinsPerSecond: number;
  elapsedSeconds: number;
  taps: number;
  rngSeed: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  baseCost: number;
  costGrowth: number;
  effect: (state: GameState) => GameState;
}
