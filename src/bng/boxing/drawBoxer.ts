// Same construction as Blood and Gold's gladiator: integer rects, dithered
// foot shadow, block torso, block head. Drawn larger, dressed as a boxer.

import { PALETTE } from '../palette';
import { drawDitherShadow } from '../primitives';

export type BoxerKit = 'ring' | 'gym' | 'street';
export type BoxerPose = 'idle' | 'walking' | 'sparring' | 'resting' | 'sitting' | 'attack' | 'hurt' | 'down';

export const TRUNKS = {
  kofi: PALETTE[7],
  danny: PALETTE[3],
  ezra: PALETTE[15],
  opponent: PALETTE[4],
} as const;

export const SKIN = {
  kofi: PALETTE[14],
  danny: PALETTE[1],
  ezra: PALETTE[9],
  opponent: PALETTE[10],
} as const;

export function drawBoxer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: BoxerPose,
  flipX: boolean,
  anim: number,
  kit: BoxerKit,
  trunks: string,
  skin: string,
  flash = false,
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flipX) ctx.scale(-1, 1);
  const tone = (color: string) => {
    ctx.fillStyle = flash ? '#ffffff' : color;
  };

  const frame = Math.floor(anim * 8);
  const bob = state === 'hurt' ? 2 : frame % 2 === 0 ? 0 : -1;
  drawDitherShadow(ctx, 0, 2, 14, 3, PALETTE[5]);

  if (state === 'down') {
    drawDown(ctx, trunks, skin, tone);
    ctx.restore();
    return;
  }

  if (state === 'sitting') {
    drawSeated(ctx, trunks, skin, kit);
    ctx.restore();
    return;
  }

  const stride = state === 'walking' ? Math.round(Math.sin(anim * 10) * 3) : 0;
  const lunge = state === 'attack' ? 6 : state === 'hurt' ? -5 : 0;
  const punching = state === 'attack' || (state === 'sparring' && frame % 6 < 2);
  const ox = lunge;

  tone(PALETTE[5]);
  ctx.fillRect(ox - 7 - stride, -4, 8, 4);
  ctx.fillRect(ox + 2 + stride, -4, 8, 4);
  tone(PALETTE[0]);
  ctx.fillRect(ox - 7 - stride, -4, 2, 2);
  ctx.fillRect(ox + 2 + stride, -4, 2, 2);

  tone(skin);
  ctx.fillRect(ox - 4 - stride, -16, 4, 12);
  ctx.fillRect(ox + 2 + stride, -16, 4, 12);

  tone(trunks);
  ctx.fillRect(ox - 8, -26 + bob, 16, 10);
  tone(PALETTE[0]);
  ctx.fillRect(ox - 8, -26 + bob, 16, 2);
  ctx.fillRect(ox - 1, -24 + bob, 2, 8);

  if (kit === 'street') {
    tone(PALETTE[6]);
    ctx.fillRect(ox - 9, -44 + bob, 18, 18);
    tone(PALETTE[5]);
    ctx.fillRect(ox - 8, -50 + bob, 16, 6);
    tone(PALETTE[11]);
    ctx.fillRect(ox - 2, -38 + bob, 4, 8);
  } else if (kit === 'gym') {
    tone(skin);
    ctx.fillRect(ox - 8, -44 + bob, 16, 18);
    tone(PALETTE[10]);
    ctx.fillRect(ox - 8, -44 + bob, 4, 12);
    ctx.fillRect(ox + 4, -44 + bob, 4, 12);
  } else {
    tone(skin);
    ctx.fillRect(ox - 8, -44 + bob, 16, 18);
    tone(PALETTE[2]);
    ctx.fillRect(ox - 4, -40 + bob, 2, 6);
    ctx.fillRect(ox + 2, -40 + bob, 2, 6);
  }

  tone(skin);
  ctx.fillRect(ox - 12, -40 + bob, 4, punching ? 8 : 12);
  if (punching) ctx.fillRect(ox + 6, -36 + bob, 14, 4);
  else ctx.fillRect(ox + 6, -42 + bob, 4, 10);

  const glove = kit === 'gym' ? PALETTE[0] : trunks;
  tone(glove);
  ctx.fillRect(ox - 14, (punching ? -34 : -30) + bob, 6, 6);
  ctx.fillRect(ox + (punching ? 18 : 8), (punching ? -38 : -46) + bob, punching ? 8 : 6, 6);
  tone(PALETTE[5]);
  ctx.fillRect(ox - 12, -26 + bob, 4, 2);
  ctx.fillRect(ox + (punching ? 18 : 8), (punching ? -32 : -40) + bob, 4, 2);

  tone(skin);
  ctx.fillRect(ox - 6, -58 + bob, 12, 12);
  tone(PALETTE[5]);
  ctx.fillRect(ox - 6, -62 + bob, 12, 4);
  ctx.fillRect(ox - 4, -54 + bob, 2, 2);
  ctx.fillRect(ox + 2, -54 + bob, 2, 2);
  if (kit === 'ring') {
    tone(PALETTE[0]);
    ctx.fillRect(ox - 2, -50 + bob, 6, 2);
  } else {
    tone(PALETTE[3]);
    ctx.fillRect(ox - 2, -50 + bob, 4, 2);
  }

  ctx.restore();
}

function drawDown(
  ctx: CanvasRenderingContext2D,
  trunks: string,
  skin: string,
  tone: (color: string) => void,
) {
  tone(PALETTE[5]);
  ctx.fillRect(-2, -4, 8, 3);
  ctx.fillRect(18, -4, 8, 3);
  tone(skin);
  ctx.fillRect(0, -10, 8, 6);
  ctx.fillRect(16, -10, 8, 6);
  tone(trunks);
  ctx.fillRect(6, -14, 16, 8);
  tone(skin);
  ctx.fillRect(20, -16, 14, 8);
  ctx.fillRect(32, -18, 10, 10);
  tone(PALETTE[5]);
  ctx.fillRect(32, -20, 10, 3);
  tone(trunks);
  ctx.fillRect(22, -20, 6, 5);
}

function drawSeated(ctx: CanvasRenderingContext2D, trunks: string, skin: string, kit: BoxerKit) {
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(-10, -6, 20, 4);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(-8, -2, 4, 4);
  ctx.fillRect(4, -2, 4, 4);

  ctx.fillStyle = trunks;
  ctx.fillRect(-10, -16, 20, 10);
  ctx.fillStyle = kit === 'street' ? PALETTE[6] : skin;
  ctx.fillRect(-8, -32, 16, 16);
  ctx.fillStyle = skin;
  ctx.fillRect(-6, -44, 12, 12);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(-6, -48, 12, 4);
  ctx.fillRect(-4, -40, 2, 2);
  ctx.fillRect(2, -40, 2, 2);

  ctx.fillStyle = trunks;
  ctx.fillRect(-16, -24, 6, 6);
  ctx.fillRect(10, -24, 6, 6);
}
