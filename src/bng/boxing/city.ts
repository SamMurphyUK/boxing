// Urban rooms in the Blood and Gold procedure: palette rects, dither, bloom.
// Logic canvas is still 344x192.

import { PALETTE } from '../palette';
import { LOGIC_HEIGHT, LOGIC_WIDTH, drawDitherRect, drawDitherShadow, drawSoftAmbientBloom } from '../primitives';

function skyline(ctx: CanvasRenderingContext2D, horizon: number) {
  ctx.fillStyle = PALETTE[6];
  ctx.fillRect(0, 0, LOGIC_WIDTH, horizon);
  drawDitherRect(ctx, 0, horizon - 10, LOGIC_WIDTH, 10, PALETTE[6], PALETTE[9], 0.5);
  for (let i = 0; i < 16; i++) {
    const x = i * 24 - 10;
    const height = 14 + ((i * 19) % 30);
    const width = 16 + (i % 3) * 5;
    ctx.fillStyle = i % 2 === 0 ? PALETTE[5] : PALETTE[9];
    ctx.fillRect(x, horizon - height, width, height);
    for (let wy = horizon - height + 3; wy < horizon - 3; wy += 5) {
      for (let wx = x + 2; wx < x + width - 3; wx += 4) {
        if ((wx + wy + i) % 6 !== 0) continue;
        ctx.fillStyle = (wx + i) % 3 === 0 ? PALETTE[0] : PALETTE[15];
        ctx.fillRect(wx, wy, 2, 1);
      }
    }
  }
}

function floorMat(ctx: CanvasRenderingContext2D, y: number, base: string, line: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, y, LOGIC_WIDTH, LOGIC_HEIGHT - y);
  ctx.fillStyle = line;
  for (let fy = y + 8; fy < LOGIC_HEIGHT; fy += 12) ctx.fillRect(0, fy, LOGIC_WIDTH, 1);
}

export function drawGym(ctx: CanvasRenderingContext2D, anim: number) {
  skyline(ctx, 28);
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(0, 22, LOGIC_WIDTH, 106);
  drawDitherRect(ctx, 0, 22, LOGIC_WIDTH, 106, PALETTE[2], PALETTE[14], 0.25);
  ctx.fillStyle = PALETTE[10];
  ctx.fillRect(0, 22, LOGIC_WIDTH, 3);

  for (let wx = 36; wx < LOGIC_WIDTH - 30; wx += 78) {
    ctx.fillStyle = PALETTE[6];
    ctx.fillRect(wx, 30, 34, 20);
    ctx.fillStyle = PALETTE[6];
    ctx.fillRect(wx + 2, 32, 30, 16);
    ctx.fillStyle = PALETTE[5];
    ctx.fillRect(wx + 4, 34, 8, 12);
    ctx.fillRect(wx + 14, 38, 6, 8);
    ctx.fillRect(wx + 22, 34, 8, 12);
    for (let p = 0; p < 3; p++) {
      ctx.fillStyle = (Math.floor(anim) + p + wx) % 3 === 0 ? PALETTE[0] : PALETTE[15];
      ctx.fillRect(wx + 6 + p * 8, 40, 2, 2);
    }
  }

  drawSoftAmbientBloom(ctx, 80, 78, 22, anim, 0.55, 0);
  drawSoftAmbientBloom(ctx, 260, 78, 22, anim, 0.45, 1.2);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(48, 74, 64, 3);
  ctx.fillRect(228, 74, 64, 3);

  floorMat(ctx, 128, PALETTE[9], PALETTE[5]);
  ctx.fillStyle = PALETTE[6];
  ctx.fillRect(18, 140, 56, 36);
  drawDitherRect(ctx, 18, 140, 56, 36, PALETTE[6], PALETTE[5], 0.25);

  drawDitherShadow(ctx, 312, 168, 12, 4, PALETTE[5]);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(310, 70, 3, 98);
  ctx.fillStyle = PALETTE[3];
  ctx.fillRect(300, 108, 22, 40);
  ctx.fillStyle = PALETTE[4];
  ctx.fillRect(304, 114, 14, 12);
  const swing = Math.round(Math.sin(anim * 1.6) * 3);
  ctx.fillRect(300 + swing, 144, 22, 8);

  ctx.fillStyle = PALETTE[11];
  ctx.fillRect(28, 150, 10, 24);
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(29, 142, 8, 10);

  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, 0, 10, LOGIC_HEIGHT);
  ctx.fillRect(LOGIC_WIDTH - 10, 0, 10, LOGIC_HEIGHT);
}

export function drawPressRoom(ctx: CanvasRenderingContext2D, anim: number) {
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);
  skyline(ctx, 48);
  ctx.fillStyle = PALETTE[9];
  ctx.fillRect(18, 40, LOGIC_WIDTH - 36, 36);
  for (let x = 22; x < LOGIC_WIDTH - 22; x += 16) {
    ctx.fillStyle = x % 32 === 6 ? PALETTE[3] : PALETTE[0];
    ctx.fillRect(x, 48, 10, 14);
    ctx.fillStyle = PALETTE[5];
    ctx.fillRect(x + 2, 52, 6, 2);
  }

  floorMat(ctx, 100, PALETTE[9], PALETTE[10]);
  drawDitherShadow(ctx, 172, 132, 40, 4, PALETTE[5]);
  ctx.fillStyle = PALETTE[14];
  ctx.fillRect(90, 118, 164, 8);
  ctx.fillRect(98, 126, 4, 16);
  ctx.fillRect(242, 126, 4, 16);

  const mics = [120, 156, 196];
  for (const mx of mics) {
    ctx.fillStyle = PALETTE[5];
    ctx.fillRect(mx, 108, 2, 12);
    ctx.fillStyle = PALETTE[10];
    ctx.fillRect(mx - 2, 104, 6, 5);
  }

  const flash = Math.floor(anim * 3) % 7 === 0;
  if (flash) {
    drawSoftAmbientBloom(ctx, 60, 110, 18, anim, 0.9, 0);
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(52, 100, 16, 10);
  } else {
    ctx.fillStyle = PALETTE[5];
    ctx.fillRect(50, 96, 20, 16);
    ctx.fillStyle = PALETTE[11];
    ctx.fillRect(54, 100, 12, 8);
  }
}

export function drawVipBar(ctx: CanvasRenderingContext2D, anim: number) {
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, 0, LOGIC_WIDTH, 70);
  skyline(ctx, 34);
  ctx.fillStyle = PALETTE[4];
  ctx.fillRect(0, 34, LOGIC_WIDTH, 28);
  drawDitherRect(ctx, 0, 34, LOGIC_WIDTH, 28, PALETTE[4], PALETTE[5], 0.5);

  drawSoftAmbientBloom(ctx, 78, 52, 28, anim, 0.85, 0.4);
  ctx.fillStyle = PALETTE[3];
  ctx.fillRect(24, 40, 108, 16);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(32, 44, 10, 8);
  ctx.fillRect(48, 44, 8, 8);
  ctx.fillRect(62, 44, 12, 8);
  ctx.fillRect(80, 44, 8, 8);
  ctx.fillRect(94, 44, 10, 8);
  ctx.fillRect(110, 44, 12, 8);

  floorMat(ctx, 92, PALETTE[14], PALETTE[5]);
  ctx.fillStyle = PALETTE[9];
  ctx.fillRect(0, 108, LOGIC_WIDTH, 14);
  ctx.fillStyle = PALETTE[15];
  ctx.fillRect(0, 108, LOGIC_WIDTH, 2);

  for (let bx = 20; bx < 150; bx += 10) {
    const h = 12 + (bx % 3) * 4;
    ctx.fillStyle = bx % 20 === 0 ? PALETTE[7] : bx % 20 === 10 ? PALETTE[3] : PALETTE[11];
    ctx.fillRect(bx, 108 - h, 5, h);
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(bx + 1, 108 - h, 2, 2);
  }

  ctx.fillStyle = PALETTE[6];
  ctx.fillRect(188, 128, 140, 36);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(196, 134, 36, 20);
  ctx.fillRect(248, 134, 36, 20);
  ctx.fillRect(292, 134, 24, 20);
  drawDitherShadow(ctx, 258, 166, 50, 4, PALETTE[5]);
}

export function drawModernRing(ctx: CanvasRenderingContext2D, anim: number, pass: 'back' | 'front') {
  if (pass === 'front') {
    ctx.fillStyle = PALETTE[0];
    ctx.fillRect(46, 166, LOGIC_WIDTH - 92, 2);
    ctx.fillStyle = PALETTE[3];
    ctx.fillRect(46, 174, LOGIC_WIDTH - 92, 3);
    ctx.fillStyle = PALETTE[6];
    ctx.fillRect(46, 182, LOGIC_WIDTH - 92, 2);
    return;
  }

  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);
  drawSoftAmbientBloom(ctx, 172, 78, 70, anim, 0.85, 0);

  for (let row = 0; row < 4; row++) {
    for (let seat = 8; seat < LOGIC_WIDTH - 8; seat += 7) {
      const bob = Math.floor(anim * 3 + seat * 0.2 + row) % 3 === 0 ? -1 : 0;
      ctx.fillStyle = (seat + row) % 4 === 0 ? PALETTE[3] : (seat + row) % 4 === 1 ? PALETTE[7] : PALETTE[9];
      ctx.fillRect(seat, 18 + row * 8 + bob, 3, 3);
    }
  }
  ctx.fillStyle = PALETTE[10];
  ctx.fillRect(0, 48, LOGIC_WIDTH, 8);

  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(118, 8, 108, 22);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(122, 12, 100, 14);
  ctx.fillStyle = PALETTE[3];
  const ticker = Math.floor(anim * 18) % 90;
  ctx.fillRect(126 + ticker, 16, 18, 6);

  ctx.fillStyle = PALETTE[11];
  ctx.fillRect(36, 96, LOGIC_WIDTH - 72, 96);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(52, 112, LOGIC_WIDTH - 104, 68);
  ctx.fillStyle = PALETTE[11];
  ctx.fillRect(168, 140, 8, 8);
  ctx.fillRect(164, 144, 16, 2);

  for (const post of [40, LOGIC_WIDTH - 46]) {
    ctx.fillStyle = PALETTE[5];
    ctx.fillRect(post, 88, 6, 96);
    ctx.fillStyle = post < 80 ? PALETTE[3] : PALETTE[6];
    ctx.fillRect(post - 3, 88, 12, 14);
  }

  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(46, 108, LOGIC_WIDTH - 92, 2);
  ctx.fillStyle = PALETTE[3];
  ctx.fillRect(46, 120, LOGIC_WIDTH - 92, 3);
  ctx.fillStyle = PALETTE[6];
  ctx.fillRect(46, 134, LOGIC_WIDTH - 92, 2);
}
