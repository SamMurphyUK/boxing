// The slice of Blood and Gold's types the copied renderer actually names.

export type Culture = 'roman' | 'celt' | 'berber' | 'scythian' | 'hunnic';

export type SlotType = 'RIGHT' | 'LEFT' | 'BOTH';

export interface WeaponDef {
  id: string;
  name: string;
  slotType: SlotType;
  tier: 1 | 2 | 3;
  cost: number;
  atkBonus: number;
  defBonus: number;
  spdBonus: number;
  critBonus?: number;
  pinBonus?: number;
  description: string;
  icon: string;
  isExotic?: boolean;
  isRanged?: boolean;
  isThrowingTrident?: boolean;
}

export interface LudusUpgrades {
  trainingGrounds: number;
  medicalBay: number;
  breedingPens: number;
}

export type ArenaMapTheme =
  | 'standard'
  | 'rome_flames'
  | 'river_rubicon'
  | 'alpine_rampart'
  | 'gallic_crossing'
  | 'camp_defense';

export interface ArenaFortification {
  type: 'river' | 'low_wall';
  x: number;
  y: number;
  w: number;
  h: number;
}
