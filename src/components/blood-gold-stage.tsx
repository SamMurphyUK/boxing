import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { drawGym, drawModernRing, drawPressRoom, drawVipBar } from '@/bng/boxing/city';
import { drawBoxer, type BoxerKit, type BoxerPose } from '@/bng/boxing/drawBoxer';
import { drawRefereeEyes } from '@/bng/boxing/refereeEyes';
import { PALETTE } from '@/bng/palette';
import { LOGIC_HEIGHT, LOGIC_WIDTH } from '@/bng/primitives';

export type BoxingPlace = 'gym' | 'press' | 'bar' | 'ring';
export type GladiatorPose = BoxerPose;

export interface StageActor {
  x: number;
  y: number;
  trunks: string;
  skin: string;
  state: BoxerPose;
  flipX?: boolean;
  flash?: boolean;
}

export interface StageScene {
  actors: readonly StageActor[];
  bars?: readonly StageBar[];
  flash?: number;
  dialogue?: { text: string; x: number; y: number } | null;
  countdown?: string | null;
  points?: { blue: number; red: number } | null;
  eyes?: number | null;
  caption?: string | null;
  subcaption?: string | null;
}

export interface StageBar {
  x: number;
  y: number;
  value: number;
  max: number;
  fill: string;
}

function drawBar(ctx: CanvasRenderingContext2D, bar: StageBar) {
  const width = 52;
  const inner = Math.max(0, Math.round((width - 2) * Math.max(0, Math.min(1, bar.value / Math.max(1, bar.max)))));
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(bar.x, bar.y, width, 4);
  ctx.fillStyle = bar.fill;
  ctx.fillRect(bar.x + 1, bar.y + 1, inner, 2);
}

function drawPlate(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  const width = Math.min(168, Math.max(28, Math.ceil(ctx.measureText(text).width) + 8));
  const left = Math.round(Math.max(6, Math.min(LOGIC_WIDTH - width - 6, x - width / 2)));
  const top = Math.round(y);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(left - 1, top - 1, width + 2, 14);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(left, top, width, 12);
  ctx.fillStyle = PALETTE[5];
  ctx.fillText(text, left + 3, top + 2);
}

function drawCenterText(ctx: CanvasRenderingContext2D, text: string, y: number, color = PALETTE[0]) {
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color === PALETTE[0] ? PALETTE[5] : PALETTE[0];
  const width = Math.ceil(ctx.measureText(text).width);
  const x = Math.round((LOGIC_WIDTH - width) / 2);
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function BloodGoldStage({
  place,
  actors,
  bars,
  width,
  advanceRef,
}: {
  place: BoxingPlace;
  actors: readonly StageActor[];
  bars?: readonly StageBar[];
  width: number;
  advanceRef?: { current: ((dt: number) => StageScene | null) | null };
}) {
  const hostRef = useRef<HTMLElement | null>(null);
  const actorsRef = useRef(actors);
  const barsRef = useRef(bars);
  const placeRef = useRef(place);
  actorsRef.current = actors;
  barsRef.current = bars;
  placeRef.current = place;
  const height = Math.max(1, Math.round((width * LOGIC_HEIGHT) / LOGIC_WIDTH));

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width <= 0 || typeof document === 'undefined' || !('appendChild' in host)) return;

    const off = document.createElement('canvas');
    off.width = LOGIC_WIDTH;
    off.height = LOGIC_HEIGHT;
    const view = document.createElement('canvas');
    view.style.width = '100%';
    view.style.height = '100%';
    view.style.imageRendering = 'pixelated';
    view.style.display = 'block';
    host.replaceChildren(view);

    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      const cssW = host.clientWidth || width;
      const cssH = Math.max(1, Math.round((cssW * LOGIC_HEIGHT) / LOGIC_WIDTH));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pxW = Math.max(1, Math.round(cssW * dpr));
      const pxH = Math.max(1, Math.round(cssH * dpr));
      if (view.width !== pxW) view.width = pxW;
      if (view.height !== pxH) view.height = pxH;

      const low = off.getContext('2d');
      const high = view.getContext('2d');
      if (!low || !high) return;
      const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const scene = advanceRef?.current?.(dt) ?? null;
      const drawnActors = scene?.actors ?? actorsRef.current;
      const drawnBars = scene?.bars ?? barsRef.current;
      low.setTransform(1, 0, 0, 1, 0, 0);
      low.imageSmoothingEnabled = false;
      low.fillStyle = PALETTE[5];
      low.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);
      const placeNow = placeRef.current;
      const kit: BoxerKit = placeNow === 'ring' ? 'ring' : placeNow === 'bar' ? 'street' : 'gym';
      if (placeNow === 'gym') drawGym(low, t);
      else if (placeNow === 'press') drawPressRoom(low, t);
      else if (placeNow === 'bar') drawVipBar(low, t);
      else drawModernRing(low, t, 'back');
      for (const actor of drawnActors) {
        drawBoxer(low, actor.x, actor.y, actor.state, !!actor.flipX, t, kit, actor.trunks, actor.skin, !!actor.flash);
      }
      if (placeNow === 'ring') drawModernRing(low, t, 'front');
      for (const bar of drawnBars ?? []) drawBar(low, bar);
      if (scene?.flash && scene.flash > 0) {
        low.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, scene.flash))})`;
        low.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);
      }
      if (scene?.countdown) drawCenterText(low, scene.countdown, 16, PALETTE[5]);
      if (scene?.points) {
        low.font = '8px monospace';
        low.textBaseline = 'top';
        low.fillStyle = PALETTE[5];
        low.fillText(String(scene.points.blue), 128, 16);
        const red = String(scene.points.red);
        low.fillText(red, 206 - red.length * 5, 16);
      }
      if (scene?.dialogue) drawPlate(low, scene.dialogue.text, scene.dialogue.x, scene.dialogue.y);
      if (scene?.eyes != null) {
        low.fillStyle = 'rgba(29,19,18,0.62)';
        low.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);
        drawRefereeEyes(low, scene.eyes);
        if (scene.caption) drawCenterText(low, scene.caption, 132);
        if (scene.subcaption) drawCenterText(low, scene.subcaption, 144);
      }
      high.setTransform(1, 0, 0, 1, 0, 0);
      high.imageSmoothingEnabled = false;
      high.drawImage(off, 0, 0, pxW, pxH);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      if ('replaceChildren' in host) host.replaceChildren();
    };
  }, [width]);

  return (
    <View
      ref={(node) => {
        hostRef.current = node as unknown as HTMLElement | null;
      }}
      style={{ width: '100%', height, overflow: 'hidden' }}
    />
  );
}
