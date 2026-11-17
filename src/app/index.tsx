import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { BloodGoldStage } from '@/components/blood-gold-stage';
import { SKIN, TRUNKS } from '@/bng/boxing/drawBoxer';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useLudusStore } from '@/store/ludus-store';
import { usePromoterStore } from '@/store/promoter-store';
import { colors, fonts } from '@/theme';

const COLD_OPEN = [
  { x: 132, y: 172, trunks: TRUNKS.danny, skin: SKIN.danny, state: 'sparring' as const },
  { x: 210, y: 172, trunks: TRUNKS.kofi, skin: SKIN.kofi, state: 'attack' as const, flipX: true },
];

export default function TitleScreen() {
  const hasSave = usePromoterStore((s) => s.hasSave);
  const begin = useLudusStore((s) => s.begin);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1600);
    return () => clearTimeout(id);
  }, []);

  const enter = useCallback(() => {
    begin();
    router.push('/game');
  }, [begin]);

  useEffect(() => {
    if (!ready || Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        enter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enter, ready]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));

  return (
    <Screen style={styles.container}>
      <Text style={styles.wordmark}>RINGSIDE</Text>
      <View onLayout={onLayout}>
        {width > 0 && <BloodGoldStage place="ring" actors={COLD_OPEN} width={width} />}
      </View>
      {ready ? (
        <Pressable onPress={enter} style={styles.prompt} testID="press-space">
          <Text style={styles.promptText}>PRESS SPACE / TAP</Text>
        </Pressable>
      ) : (
        <Text style={styles.waiting}>The lights come up.</Text>
      )}
      {ready && hasSave && (
        <Button label="Continue saved promotion" variant="ghost" onPress={() => router.push('/game')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', paddingVertical: 16, gap: 12 },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 6, color: colors.gold },
  prompt: { alignItems: 'center', paddingVertical: 12 },
  promptText: { fontFamily: fonts.display, fontSize: 28, letterSpacing: 2, color: colors.ink },
  waiting: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
