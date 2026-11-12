import { Redirect, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { money, taleOfTheTape, type FighterStats, type LogLine, type Meter, type RoundMark } from '@game/index';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { haptics } from '@services/haptics';
import { usePromoterStore } from '@/store/promoter-store';
import { colors, fonts } from '@/theme';

type Phase = 'tape' | 'running' | 'result';

const STATS: (keyof FighterStats)[] = ['skill', 'power', 'chin', 'stamina'];
const DELTA_LABELS: Record<Meter, string> = { cash: 'Cash', hype: 'Hype', stable: 'Stable', rep: 'Rep' };
const LINE_DELAY: Record<LogLine['tone'], number> = { round: 500, plain: 600, good: 600, bad: 600, big: 1000, bigBad: 1000 };

export default function FightScreen() {
  const career = usePromoterStore((s) => s.career);
  const fight = usePromoterStore((s) => s.fight);
  const prompt = usePromoterStore((s) => s.prompt);
  const result = usePromoterStore((s) => s.result);
  const [phase, setPhase] = useState<Phase>('tape');
  const [log, setLog] = useState<LogLine[]>([]);
  const [fast, setFast] = useState(false);
  const speed = useRef(1);
  const alive = useRef(true);
  const answerResolver = useRef<((choice: 'left' | 'right') => void) | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [tape] = useState(() => (career && fight ? taleOfTheTape(career, fight) : null));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const momentum = useSharedValue(50);
  useEffect(() => {
    momentum.set(withTiming(50 + (fight?.momentum ?? 0) / 2, { duration: 500 }));
  }, [momentum, fight?.momentum]);
  const momentumStyle = useAnimatedStyle(() => ({ width: `${momentum.get()}%` }));

  if (!fight || !career || !tape) return <Redirect href="/game" />;

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms / speed.current));
  const append = async (line: LogLine) => {
    if (!alive.current) return;
    setLog((current) => [...current, line]);
    await wait(LINE_DELAY[line.tone]);
  };

  const run = async (opening: LogLine) => {
    const store = usePromoterStore.getState();
    setPhase('running');
    haptics.trigger('medium');
    await append(opening);
    for (;;) {
      if (!alive.current) return;
      const report = store.playRound();
      for (const line of report.lines) {
        if (line.tone === 'big' || line.tone === 'bigBad') haptics.trigger('heavy');
        await append(line);
      }
      if (report.fight.outcome) break;
      if (report.prompt) {
        const choice = await new Promise<'left' | 'right'>((resolve) => (answerResolver.current = resolve));
        for (const line of store.answer(choice)) await append(line);
        if (usePromoterStore.getState().fight?.outcome) break;
      }
    }
    await wait(1200);
    if (!alive.current) return;
    const finished = store.finishFight();
    if (finished.outcome === 'win') haptics.trigger(finished.newChampion ? 'success' : 'medium');
    setPhase('result');
  };

  const ringBell = () => {
    const opening = { text: `${tape.us.name} vs ${tape.them.name}. ${fight.rounds} rounds. The bell goes.`, tone: 'big' as const };
    run(opening);
  };

  const answer = (choice: 'left' | 'right') => {
    answerResolver.current?.(choice);
    answerResolver.current = null;
  };

  const toggleSpeed = () => {
    speed.current = speed.current === 1 ? 3 : 1;
    setFast(speed.current === 3);
  };

  const leave = () => {
    const next = usePromoterStore.getState().leaveFight();
    router.replace(next === 'ended' ? '/ending' : '/game');
  };

  const marks: (RoundMark | 'current' | 'todo')[] = Array.from(
    { length: fight.rounds },
    (_, i) => fight.roundMarks[i] ?? (i === fight.round ? 'current' : 'todo'),
  );

  return (
    <Screen style={styles.container}>
      <Text style={styles.wordmark}>RINGSIDE</Text>
      <Text style={styles.title}>{tape.title}</Text>

      <View style={styles.tape}>
        <View style={styles.sides}>
          <Corner name={tape.us.name} nick={tape.us.nick} line={`${tape.us.record} · ${tape.us.standing}`} />
          <Text style={styles.vs}>VS</Text>
          <Corner name={tape.them.name} nick={tape.them.nick} line={`${tape.them.record} · ${tape.them.standing}`} alignRight />
        </View>
        {phase === 'tape' && (
          <Animated.View entering={FadeIn} style={styles.statsBlock}>
            {STATS.map((stat) => (
              <View key={stat} style={styles.statRow}>
                <View style={[styles.statTrack, styles.statTrackLeft]}>
                  <View style={[styles.statFill, { width: `${tape.us[stat]}%`, backgroundColor: colors.gold }]} />
                </View>
                <Text style={styles.statLabel}>{stat}</Text>
                <View style={styles.statTrack}>
                  <View style={[styles.statFill, { width: `${tape.them[stat]}%`, backgroundColor: colors.red }]} />
                </View>
              </View>
            ))}
            <Text style={styles.odds}>
              Win chance <Text style={styles.oddsValue}>{Math.round(tape.winChance * 100)}%</Text>
              {tape.injured ? <Text style={styles.injured}> · carrying an injury</Text> : null}
            </Text>
            <Text style={styles.purse}>Purse {money(tape.purse)}</Text>
          </Animated.View>
        )}
      </View>

      {phase !== 'tape' && (
        <>
          <View style={styles.momentum}>
            <View style={styles.momentumTrack}>
              <Animated.View style={[styles.momentumFill, momentumStyle]} />
            </View>
            <View style={styles.dots}>
              {marks.map((mark, i) => (
                <View key={i} style={[styles.dot, mark !== 'todo' && styles[`dot_${mark}`]]} />
              ))}
            </View>
          </View>
          <Pressable style={styles.logWrap} onPress={toggleSpeed} accessibilityHint="Tap to toggle fast forward">
            <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
              {log.map((line, i) => (
                <Animated.Text key={i} entering={FadeInDown.duration(220)} style={[styles.line, styles[`line_${line.tone}`]]}>
                  {line.text}
                </Animated.Text>
              ))}
            </ScrollView>
            <Text style={styles.speed}>{fast ? 'Fast forward · tap for normal' : 'Tap to fast forward'}</Text>
          </Pressable>
        </>
      )}

      {phase === 'tape' && (
        <View style={styles.footer}>
          <Button label="Ring the bell" onPress={ringBell} testID="ring-bell" />
        </View>
      )}

      {prompt && phase === 'running' && (
        <Animated.View entering={FadeInDown} style={styles.corner}>
          <Text style={styles.cornerTitle}>{prompt.kind === 'towel' ? 'The towel' : 'Corner call'}</Text>
          <Text style={styles.cornerText}>{prompt.text}</Text>
          <View style={styles.cornerButtons}>
            <Button label={prompt.left} small variant={prompt.kind === 'towel' ? 'red' : 'gold'} onPress={() => answer('left')} style={styles.flex} testID="corner-left" />
            <Button label={prompt.right} small variant="ghost" onPress={() => answer('right')} style={styles.flex} testID="corner-right" />
          </View>
        </Animated.View>
      )}

      {phase === 'result' && result && (
        <View style={styles.scrim}>
          <Animated.View entering={FadeInDown} style={styles.result}>
            <Text style={[styles.resultBig, styles[`result_${result.outcome}`]]}>{result.outcome.toUpperCase()}</Text>
            <Text style={styles.resultHeadline}>{result.headline}</Text>
            <Text style={styles.resultSummary}>{result.summary}</Text>
            <View style={styles.deltas}>
              {(Object.keys(DELTA_LABELS) as Meter[]).map((meter) => (
                <View key={meter} style={styles.delta}>
                  <Text style={styles.deltaLabel}>{DELTA_LABELS[meter]}</Text>
                  <Text style={[styles.deltaValue, result.deltas[meter] > 0 && styles.up, result.deltas[meter] < 0 && styles.down]}>
                    {result.deltas[meter] > 0 ? '+' : ''}
                    {result.deltas[meter]}
                  </Text>
                </View>
              ))}
              <View style={styles.delta}>
                <Text style={styles.deltaLabel}>Record</Text>
                <Text style={styles.deltaValue}>{result.record}</Text>
              </View>
              <View style={styles.delta}>
                <Text style={styles.deltaLabel}>Ranking</Text>
                <Text style={[styles.deltaValue, result.rankingMove === 'up' && styles.up, result.rankingMove === 'down' && styles.down]}>
                  {result.ranking}
                </Text>
              </View>
            </View>
            <Button label="Back to the office" onPress={leave} testID="leave-fight" />
          </Animated.View>
        </View>
      )}
    </Screen>
  );
}

function Corner({ name, nick, line, alignRight }: { name: string; nick: string; line: string; alignRight?: boolean }) {
  const align = alignRight ? styles.right : null;
  return (
    <View style={styles.cornerSide}>
      <Text style={[styles.nick, align]}>“{nick}”</Text>
      <Text style={[styles.fighterName, align]}>{name}</Text>
      <Text style={[styles.fighterLine, align]}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingTop: 10, paddingBottom: 8 },
  flex: { flex: 1 },
  right: { textAlign: 'right' },
  wordmark: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 5, color: colors.gold },
  title: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase' },
  tape: { backgroundColor: colors.panel, borderRadius: 18, padding: 16, gap: 14 },
  sides: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cornerSide: { flex: 1, gap: 2 },
  vs: { fontFamily: fonts.display, fontSize: 30, color: colors.red },
  nick: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.gold },
  fighterName: { fontFamily: fonts.display, fontSize: 26, lineHeight: 26, color: colors.ink },
  fighterLine: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  statsBlock: { gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.panelHigh, overflow: 'hidden' },
  statTrackLeft: { transform: [{ scaleX: -1 }] },
  statFill: { height: '100%', borderRadius: 4 },
  statLabel: {
    width: 64,
    textAlign: 'center',
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  odds: { textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted, marginTop: 6 },
  oddsValue: { fontFamily: fonts.bodyBold, color: colors.ink },
  injured: { color: colors.red },
  purse: { textAlign: 'center', fontFamily: fonts.display, fontSize: 24, color: colors.gold },
  momentum: { gap: 8 },
  momentumTrack: { height: 10, borderRadius: 5, backgroundColor: colors.red, overflow: 'hidden' },
  momentumFill: { height: '100%', backgroundColor: colors.gold },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.panelHigh },
  dot_current: { backgroundColor: colors.ink },
  dot_win: { backgroundColor: colors.gold },
  dot_loss: { backgroundColor: colors.red },
  dot_even: { backgroundColor: colors.muted },
  logWrap: { flex: 1, backgroundColor: colors.panel, borderRadius: 18, padding: 14 },
  line: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink, marginBottom: 6 },
  line_plain: {},
  line_round: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.muted, marginTop: 6 },
  line_good: { color: colors.ink },
  line_bad: { color: colors.muted },
  line_big: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.gold },
  line_bigBad: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.red },
  speed: { textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase', marginTop: 6 },
  footer: { marginTop: 'auto' },
  corner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.panelHigh,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  cornerTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.gold },
  cornerText: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: colors.ink },
  cornerButtons: { flexDirection: 'row', gap: 10 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  result: { backgroundColor: colors.panel, borderRadius: 20, padding: 22, gap: 10 },
  resultBig: { fontFamily: fonts.display, fontSize: 84, lineHeight: 84, textAlign: 'center', color: colors.ink },
  result_win: { color: colors.gold },
  result_loss: { color: colors.red },
  result_draw: { color: colors.muted },
  resultHeadline: { fontFamily: fonts.display, fontSize: 26, textAlign: 'center', color: colors.ink },
  resultSummary: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, textAlign: 'center', color: colors.muted },
  deltas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  delta: { width: '31%', flexGrow: 1, backgroundColor: colors.panelHigh, borderRadius: 12, padding: 10, alignItems: 'center' },
  deltaLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  deltaValue: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  up: { color: colors.green },
  down: { color: colors.red },
});
