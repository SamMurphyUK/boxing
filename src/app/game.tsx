import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { activeFighter, record, viewCard, type Side } from '@game/index';
import { MetersBar } from '@/components/meters-bar';
import { NewsTicker } from '@/components/news-ticker';
import { Screen } from '@/components/screen';
import { StableRoom } from '@/components/stable-room';
import { SwipeCard, type SwipeCardHandle } from '@/components/swipe-card';
import { Toast } from '@/components/toast';
import { haptics } from '@services/haptics';
import { useLudusStore } from '@/store/ludus-store';
import { usePromoterStore } from '@/store/promoter-store';
import { colors, fonts } from '@/theme';

const CARD_ASPECT = 1.43;
const MAX_CARD_WIDTH = 380;
const HINT_CARD_COUNT = 3;

export default function GameScreen() {
  const ludus = useLudusStore((s) => s.ludus);
  if (ludus?.stage === 'ARENA' || ludus?.stage === 'POST_FIGHT') return <Redirect href="/fight" />;
  if (ludus) {
    return (
      <Screen>
        <StableRoom />
      </Screen>
    );
  }
  return <SwipeGame />;
}

function SwipeGame() {
  const career = usePromoterStore((s) => s.career);
  const ending = usePromoterStore((s) => s.ending);
  const toast = usePromoterStore((s) => s.toast);
  const clearToast = usePromoterStore((s) => s.clearToast);
  const choose = usePromoterStore((s) => s.choose);
  const beginFight = usePromoterStore((s) => s.beginFight);
  const [preview, setPreview] = useState<Side | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const cardRef = useRef<SwipeCardHandle>(null);

  const view = useMemo(() => (career ? viewCard(career) : null), [career]);

  const commit = useCallback(
    (side: Side) => {
      setPreview(null);
      haptics.trigger('light');
      if (view?.isFight) {
        beginFight(side);
        router.push('/fight');
        return;
      }
      if (choose(side) === 'ended') router.replace('/ending');
    },
    [beginFight, choose, view?.isFight],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') cardRef.current?.fling('left');
      if (event.key === 'ArrowRight') cardRef.current?.fling('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (ending) return <Redirect href="/ending" />;
  if (!career || !view) return <Redirect href="/" />;

  const fighter = activeFighter(career);
  const cardWidth = Math.min(stage.width * 0.94, MAX_CARD_WIDTH, stage.height / CARD_ASPECT);
  const onStageLayout = (e: LayoutChangeEvent) => setStage(e.nativeEvent.layout);
  const cardKey = `${career.week}-${career.seen}-${career.current?.type === 'decision' ? career.current.id : 'fight'}`;

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>RINGSIDE</Text>
        <Text style={styles.weekLine}>
          Week {career.week} · {career.division}
        </Text>
      </View>
      <MetersBar meters={career.meters} preview={preview ? view[preview].fx : null} />
      <NewsTicker items={career.news} />

      <View style={styles.stage} onLayout={onStageLayout}>
        {stage.width > 0 && (
          <SwipeCard
            key={cardKey}
            ref={cardRef}
            view={view}
            width={cardWidth}
            height={cardWidth * CARD_ASPECT}
            onPreview={setPreview}
            onCommit={commit}
          />
        )}
        <Toast message={toast} onDone={clearToast} />
      </View>
      <Text style={[styles.hint, career.seen >= HINT_CARD_COUNT && styles.hintHidden]}>Swipe to decide</Text>

      <View style={styles.roster}>
        {career.fighters.map((f) => (
          <View key={f.name} style={[styles.rosterItem, f === fighter && styles.rosterActive]}>
            <Text style={styles.rosterName} numberOfLines={1}>
              {f.name}
            </Text>
            <Text style={styles.rosterRecord} numberOfLines={1}>
              {record(f)} · <Text style={styles.rosterRank}>{f.champ ? 'CHAMP' : `#${f.rank}`}</Text>
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingTop: 10, paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  wordmark: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 5, color: colors.gold },
  weekLine: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.6, color: colors.muted, textTransform: 'uppercase' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  hintHidden: { opacity: 0 },
  roster: { flexDirection: 'row', gap: 8 },
  rosterItem: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rosterActive: { borderColor: colors.gold },
  rosterName: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  rosterRecord: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  rosterRank: { fontFamily: fonts.bodyBold, color: colors.gold },
});
