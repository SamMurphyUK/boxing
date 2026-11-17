// The Caesar eye cut-in, dressed as a referee. Pupil timing is the same:
// center, glance left, glance right, then back to center.

import { LOGIC_HEIGHT, LOGIC_WIDTH } from '../primitives';

export function drawRefereeEyes(ctx: CanvasRenderingContext2D, phaseTime: number) {
  const boxW = Math.floor(LOGIC_WIDTH / 3);
  const boxH = 50;
  const boxX = Math.floor((LOGIC_WIDTH - boxW) / 2);
  const boxY = Math.floor((LOGIC_HEIGHT - boxH) / 2);

  ctx.fillStyle = '#2A1B19';
  ctx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
  ctx.fillStyle = '#8C7A6B';
  ctx.fillRect(boxX - 2, boxY - 2, boxW + 4, boxH + 4);
  ctx.fillStyle = '#2A1B19';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);
  ctx.clip();

  ctx.fillStyle = '#1D1312';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  const speed = 360;
  for (let i = 0; i < 18; i++) {
    const lineY = boxY + 3 + i * 2.5;
    const lineW = 10 + ((i * 13) % 28);
    const lineX = boxX + ((i * 29 + phaseTime * speed) % (boxW + 40)) - 20;
    ctx.fillStyle = i % 3 === 0 ? '#ded095' : i % 3 === 1 ? '#ffffff' : '#8C7A6B';
    ctx.fillRect(lineX, lineY, lineW, 1);
  }

  const cx = boxX + Math.floor(boxW / 2);
  const cy = boxY + Math.floor(boxH / 2);

  ctx.fillStyle = '#3f363b';
  ctx.fillRect(cx - 34, cy - 18, 68, 6);
  ctx.fillStyle = '#1D1312';
  ctx.fillRect(cx - 32, cy - 14, 64, 3);

  ctx.fillStyle = '#2A1B19';
  ctx.fillRect(cx - 30, cy - 9, 26, 4);
  ctx.fillRect(cx + 4, cy - 9, 26, 4);
  ctx.fillRect(cx - 2, cy - 12, 4, 6);
  ctx.fillRect(cx - 1, cy - 8, 2, 4);

  ctx.fillStyle = '#cb9f6b';
  ctx.fillRect(cx - 28, cy - 5, 23, 11);
  ctx.fillRect(cx + 5, cy - 5, 23, 11);

  ctx.fillStyle = '#ba7654';
  ctx.fillRect(cx - 3, cy - 6, 6, 18);
  ctx.fillStyle = '#ded095';
  ctx.fillRect(cx - 1, cy - 5, 2, 17);

  let pupilOffset = 0;
  if (phaseTime >= 1.0 && phaseTime < 1.3) pupilOffset = -2;
  else if (phaseTime >= 1.3 && phaseTime < 1.6) pupilOffset = 2;

  const leftEyeX = cx - 24;
  const eyeY = cy - 2;
  ctx.fillStyle = '#2A1B19';
  ctx.fillRect(leftEyeX - 1, eyeY - 2, 16, 8);
  ctx.fillStyle = '#ded095';
  ctx.fillRect(leftEyeX, eyeY - 1, 14, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftEyeX + 2, eyeY, 10, 4);
  const leftPupilX = leftEyeX + 5 + pupilOffset;
  ctx.fillStyle = '#574b50';
  ctx.fillRect(leftPupilX, eyeY - 1, 4, 6);
  ctx.fillStyle = '#000000';
  ctx.fillRect(leftPupilX + 1, eyeY, 2, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftPupilX + 1, eyeY, 1, 1);

  const rightEyeX = cx + 10;
  ctx.fillStyle = '#2A1B19';
  ctx.fillRect(rightEyeX - 1, eyeY - 2, 16, 8);
  ctx.fillStyle = '#ded095';
  ctx.fillRect(rightEyeX, eyeY - 1, 14, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rightEyeX + 2, eyeY, 10, 4);
  const rightPupilX = rightEyeX + 5 + pupilOffset;
  ctx.fillStyle = '#574b50';
  ctx.fillRect(rightPupilX, eyeY - 1, 4, 6);
  ctx.fillStyle = '#000000';
  ctx.fillRect(rightPupilX + 1, eyeY, 2, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rightPupilX + 1, eyeY, 1, 1);

  ctx.fillStyle = '#ba7654';
  ctx.fillRect(leftEyeX, eyeY + 5, 14, 1);
  ctx.fillRect(rightEyeX, eyeY + 5, 14, 1);
  ctx.fillStyle = '#8C7A6B';
  ctx.fillRect(leftEyeX - 2, eyeY - 3, 18, 1);
  ctx.fillRect(rightEyeX - 2, eyeY - 3, 18, 1);

  ctx.fillStyle = '#3f363b';
  ctx.fillRect(cx - 36, cy + 14, 72, 14);
  ctx.fillStyle = '#ded095';
  ctx.fillRect(cx - 8, cy + 12, 6, 8);
  ctx.fillRect(cx + 2, cy + 12, 6, 8);
  ctx.fillStyle = '#3f363b';
  ctx.fillRect(cx - 7, cy + 16, 14, 4);
  ctx.fillRect(cx - 11, cy + 15, 5, 6);
  ctx.fillRect(cx + 6, cy + 15, 5, 6);

  ctx.restore();
}
