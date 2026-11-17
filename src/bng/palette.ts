// Blood and Gold 16-color antiquity palette. Same list as constants.ts there.

export const PALETTE = [
  '#ded095',
  '#cb9f6b',
  '#ba7654',
  '#9e4a42',
  '#6d3947',
  '#3f363b',
  '#47505c',
  '#55796f',
  '#88997a',
  '#574b50',
  '#817475',
  '#a4968d',
  '#6f705a',
  '#9da056',
  '#7f644b',
  '#9c8053',
] as const;

export type PaletteColor = (typeof PALETTE)[number] | string;
