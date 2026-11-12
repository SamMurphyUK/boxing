import type { Fighter } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function money(amount: number): string {
  if (amount >= 1e6) return `£${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `£${Math.round(amount / 1e3)}k`;
  return `£${amount}`;
}

export function record(fighter: Fighter): string {
  return `${fighter.wins}-${fighter.losses}${fighter.draws ? `-${fighter.draws}` : ''} (${fighter.kos} KO)`;
}

export function standing(fighter: { champ: boolean; rank: number }): string {
  return fighter.champ ? 'Champion' : `#${fighter.rank}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2);
}

export function fillTemplate(
  template: string,
  fighterName: string,
  opponentName = '',
  round: number | '' = '',
): string {
  return template
    .replace(/\{F\}/g, fighterName)
    .replace(/\{O\}/g, opponentName)
    .replace(/\{R\}/g, String(round));
}
