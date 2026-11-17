import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { answerSkeletonCorner, ROUND_LIMIT, tapeRound, type RoundTape, type TapeBeat } from '@game/index';
import { useLudusStore } from '@/store/ludus-store';
import { colors, fonts } from '@/theme';

import { SKIN, TRUNKS } from '@/bng/boxing/drawBoxer';
import { BloodGoldStage, type GladiatorPose, type StageActor, type StageScene } from './blood-gold-stage';

const EYE_HOLD = 3.6;
const HOME_BLUE = 118;
const HOME_RED = 228;

type Corner = { trunks: string; skin: string };

type Live = {
  tape: RoundTape | null;
  mode: 'round' | 'eyes' | 'idle';
  roundT: number;
  eyeT: number;
  handed: boolean;
  blueHp: number;
  redHp: number;
  blueMaxHp: number;
  redMaxHp: number;
  blueStamina: number;
  redStamina: number;
  blueMaxStamina: number;
  redMaxStamina: number;
  blue: Corner;
  red: Corner;
};

function colours(id: string): Corner {
  const key = id as keyof typeof TRUNKS;
  return { trunks: TRUNKS[key] ?? TRUNKS.opponent, skin: SKIN[key] ?? SKIN.opponent };
}

function blankLive(): Live {
  return {
    tape: null,
    mode: 'idle',
    roundT: 0,
    eyeT: 0,
    handed: false,
    blueHp: 1,
    redHp: 1,
    blueMaxHp: 1,
    redMaxHp: 1,
    blueStamina: 1,
    redStamina: 1,
    blueMaxStamina: 1,
    redMaxStamina: 1,
    blue: colours('danny'),
    red: colours('opponent'),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function poseOf(beats: readonly TapeBeat[], t: number, tape: RoundTape): {
  blueX: number;
  redX: number;
  blueState: GladiatorPose;
  redState: GladiatorPose;
  blueFlash: boolean;
  redFlash: boolean;
  flash: number;
  line: { text: string; x: number } | null;
} {
  const sway = Math.round(Math.sin(t * 1.15) * 12);
  let blueX = HOME_BLUE + sway;
  let redX = HOME_RED - sway;
  let blueState: GladiatorPose = 'sparring';
  let redState: GladiatorPose = 'sparring';
  let blueFlash = false;
  let redFlash = false;
  let flash = 0;
  let line: { text: string; x: number } | null = null;

  const coming = beats.find((beat) => beat.at > t && beat.at - t < 0.45 && beat.kind !== 'taunt' && beat.kind !== 'breath');
  if (coming) {
    const step = Math.round((1 - (coming.at - t) / 0.45) * 12);
    if (coming.actor === 'blue') blueX += step;
    else redX -= step;
  }

  const recent = [...beats].reverse().find((beat) => t >= beat.at && t - beat.at < 0.8);
  if (recent) {
    const age = t - recent.at;
    const lung = age < 0.28 ? 18 : Math.max(0, Math.round(18 * (1 - (age - 0.28) / 0.5)));
    if (recent.kind === 'taunt') {
      if (recent.actor === 'blue') {
        blueX -= 16;
        blueState = 'idle';
      } else {
        redX += 16;
        redState = 'idle';
      }
    } else if (recent.kind === 'breath') {
      blueX -= 18;
      redX += 18;
      blueState = 'idle';
      redState = 'idle';
    } else if (recent.actor === 'blue') {
      blueX += lung;
      blueState = age < 0.42 ? 'attack' : 'sparring';
      if (recent.landed) {
        redX += age < 0.3 ? 16 : 8;
        redState = 'hurt';
        redFlash = age < 0.22;
      } else {
        redX -= 14;
        redState = 'idle';
      }
    } else {
      redX -= lung;
      redState = age < 0.42 ? 'attack' : 'sparring';
      if (recent.landed) {
        blueX -= age < 0.3 ? 16 : 8;
        blueState = 'hurt';
        blueFlash = age < 0.22;
      } else {
        blueX += 14;
        blueState = 'idle';
      }
    }
    if (recent.landed && age < 0.14) flash = 0.55 * (1 - age / 0.14);
    if (recent.line && age < 1.3) line = { text: recent.line, x: recent.actor === 'blue' ? blueX : redX };
  }

  const stoppage = tape.next.phase === 'done' && tape.next.winner && tape.next.winner !== 'draw';
  const lastHit = [...beats].reverse().find((beat) => beat.landed);
  if (stoppage && lastHit && t >= lastHit.at + 0.35) {
    if (tape.next.winner === 'blue') {
      redState = 'down';
      redFlash = false;
    } else {
      blueState = 'down';
      blueFlash = false;
    }
  }

  if (redX - blueX < 36) {
    const mid = (blueX + redX) / 2;
    blueX = Math.round(mid - 18);
    redX = Math.round(mid + 18);
  }

  return {
    blueX: clamp(Math.round(blueX), 78, 168),
    redX: clamp(Math.round(redX), 184, 270),
    blueState,
    redState,
    blueFlash,
    redFlash,
    flash,
    line,
  };
}

export function SkeletonRing() {
  const ludus = useLudusStore((s) => s.ludus);
  const resolve = useLudusStore((s) => s.resolve);
  const bank = useLudusStore((s) => s.bank);
  const clear = useLudusStore((s) => s.clear);
  const fight = ludus?.fight ?? null;
  const [width, setWidth] = useState(0);
  const liveRef = useRef<Live>(blankLive());
  const advanceRef = useRef<((dt: number) => StageScene | null) | null>(null);

  const tape = useMemo(() => (fight && fight.phase === 'fighting' ? tapeRound(fight) : null), [fight]);
  if (liveRef.current.tape !== tape) {
    liveRef.current = tape
      ? {
          tape,
          mode: 'round',
          roundT: 0,
          eyeT: 0,
          handed: false,
          blueHp: fight?.blue.hp ?? 1,
          redHp: fight?.red.hp ?? 1,
          blueMaxHp: fight?.blue.maxHp ?? 1,
          redMaxHp: fight?.red.maxHp ?? 1,
          blueStamina: fight?.blue.stamina ?? 1,
          redStamina: fight?.red.stamina ?? 1,
          blueMaxStamina: fight?.blue.maxStamina ?? 1,
          redMaxStamina: fight?.red.maxStamina ?? 1,
          blue: colours(fight?.blue.id ?? 'danny'),
          red: colours('opponent'),
        }
      : blankLive();
  }

  advanceRef.current = (dt) => {
    const live = liveRef.current;
    const current = live.tape;
    if (!current || live.mode === 'idle') return null;
    if (live.mode === 'round') {
      live.roundT = Math.min(current.duration, live.roundT + dt);
      const seen = current.beats.filter((beat) => beat.at <= live.roundT);
      const latest = seen[seen.length - 1];
      if (latest) {
        live.blueHp = latest.blueHp;
        live.redHp = latest.redHp;
        live.blueStamina = latest.blueStamina;
        live.redStamina = latest.redStamina;
      }
      if (live.roundT >= current.duration) {
        live.mode = 'eyes';
        live.eyeT = 0;
      }
    } else {
      live.eyeT += dt;
      if (live.eyeT >= EYE_HOLD && !live.handed) {
        live.handed = true;
        let next = current.next;
        if (next.phase === 'intermission') {
          next = answerSkeletonCorner(next, next.round % 2 === 0 ? 'left' : 'right');
        }
        resolve(next);
      }
    }

    const clock = live.mode === 'round' ? live.roundT : current.duration;
    const pose = poseOf(current.beats, clock, current);
    const seen = current.beats.filter((beat) => beat.at <= clock);
    let bluePoints = 0;
    let redPoints = 0;
    for (const beat of seen) {
      if (beat.scorer === 'blue') bluePoints += beat.points;
      if (beat.scorer === 'red') redPoints += beat.points;
    }
    const left = Math.max(0, Math.ceil(ROUND_LIMIT - clock - 1e-4));
    return {
      actors: [
        {
          x: pose.blueX,
          y: pose.blueState === 'down' ? 178 : 172,
          trunks: live.blue.trunks,
          skin: live.blue.skin,
          state: pose.blueState,
          flash: pose.blueFlash,
        },
        {
          x: pose.redX,
          y: pose.redState === 'down' ? 178 : 172,
          trunks: live.red.trunks,
          skin: live.red.skin,
          state: pose.redState,
          flipX: true,
          flash: pose.redFlash,
        },
      ],
      bars: [
        { x: 8, y: 6, value: live.blueHp, max: live.blueMaxHp, fill: '#9e4a42' },
        { x: 8, y: 12, value: live.blueStamina, max: live.blueMaxStamina, fill: '#55796f' },
        { x: 284, y: 6, value: live.redHp, max: live.redMaxHp, fill: '#9e4a42' },
        { x: 284, y: 12, value: live.redStamina, max: live.redMaxStamina, fill: '#55796f' },
      ],
      flash: pose.flash,
      dialogue: pose.line ? { text: pose.line.text, x: pose.line.x, y: 86 } : null,
      countdown: live.mode === 'round' ? `0:${String(left).padStart(2, '0')}` : null,
      points: { blue: bluePoints, red: redPoints },
      eyes: live.mode === 'eyes' ? live.eyeT : null,
      caption: live.mode === 'eyes' ? current.caption : null,
      subcaption: live.mode === 'eyes' ? current.subcaption : null,
    };
  };

  if (!ludus || !fight) return null;

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const leave = () => {
    if (ludus.ending) {
      clear();
      router.replace('/');
      return;
    }
    bank();
    router.replace('/game');
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.wordmark}>RINGSIDE</Text>
      <Text style={styles.round}>
        {fight.phase === 'done' ? (fight.method ?? 'Decision') : `Round ${fight.round + 1}`}
      </Text>
      <View onLayout={onLayout}>
        {width > 0 && (
          <BloodGoldStage
            place="ring"
            actors={ringActors(fight)}
            bars={[
              { x: 8, y: 6, value: fight.blue.hp, max: fight.blue.maxHp, fill: '#9e4a42' },
              { x: 8, y: 12, value: fight.blue.stamina, max: fight.blue.maxStamina, fill: '#55796f' },
              { x: 284, y: 6, value: fight.red.hp, max: fight.red.maxHp, fill: '#9e4a42' },
              { x: 284, y: 12, value: fight.red.stamina, max: fight.red.maxStamina, fill: '#55796f' },
            ]}
            width={width}
            advanceRef={advanceRef}
          />
        )}
      </View>

      {ludus.ending && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{ludus.ending.title}</Text>
          <Text style={styles.copy}>{ludus.ending.reason}</Text>
          <Pressable onPress={leave} style={styles.choice}>
            <Text style={styles.choiceText}>Leave the building</Text>
          </Pressable>
        </View>
      )}

      {!ludus.ending && fight.phase === 'intermission' && fight.call && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>The stool</Text>
          <Text style={styles.copy}>{fight.call.text}</Text>
          <View style={styles.row}>
            <Pressable onPress={() => useLudusStore.getState().corner('left')} style={styles.choice}>
              <Text style={styles.choiceText}>{fight.call.left}</Text>
            </Pressable>
            <Pressable onPress={() => useLudusStore.getState().corner('right')} style={styles.choice}>
              <Text style={styles.choiceText}>{fight.call.right}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!ludus.ending && ludus.stage === 'POST_FIGHT' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{fight.winner === 'blue' ? 'Win' : fight.winner === 'draw' ? 'Draw' : 'Loss'}</Text>
          <Text style={styles.copy}>{ludus.growth[0]?.note}</Text>
          <Pressable onPress={leave} style={styles.choice} testID="back-to-room">
            <Text style={styles.choiceText}>Back to the room</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ringActors(fight: NonNullable<ReturnType<typeof useLudusStore.getState>['ludus']>['fight']): StageActor[] {
  if (!fight) return [];
  const blueDown = fight.phase === 'done' && fight.winner === 'red';
  const redDown = fight.phase === 'done' && fight.winner === 'blue';
  const blue = colours(fight.blue.id);
  return [
    {
      x: 132,
      y: blueDown ? 178 : 172,
      trunks: blue.trunks,
      skin: blue.skin,
      state: blueDown ? 'down' : 'idle',
    },
    {
      x: 210,
      y: redDown ? 178 : 172,
      trunks: TRUNKS.opponent,
      skin: SKIN.opponent,
      state: redDown ? 'down' : 'idle',
      flipX: true,
    },
  ];
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 10, paddingTop: 8 },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 5, color: colors.gold },
  round: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase' },
  card: { gap: 8 },
  cardTitle: { fontFamily: fonts.display, fontSize: 32, color: colors.gold },
  copy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: colors.gold, paddingVertical: 10, paddingHorizontal: 10 },
  choiceText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
});
