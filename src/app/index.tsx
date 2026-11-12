import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { usePromoterStore } from '@/store/promoter-store';
import { colors, fonts } from '@/theme';

export default function TitleScreen() {
  const hasSave = usePromoterStore((s) => s.hasSave);
  const wipe = usePromoterStore((s) => s.wipe);
  const [confirming, setConfirming] = useState(false);

  const startNew = () => {
    if (hasSave) setConfirming(true);
    else router.push('/setup');
  };

  return (
    <Screen style={styles.container}>
      <Text style={styles.wordmark}>RINGSIDE</Text>
      <View style={styles.hero}>
        <Text style={styles.kicker}>A boxing promotion game</Text>
        <Text style={styles.title}>THE{'\n'}PROMOTER</Text>
        <Text style={styles.tagline}>
          Sign fighters. Make the matches. Keep the cash, the hype, the stable and your reputation alive. Push any of
          them too far and it is over.
        </Text>
      </View>
      <View style={styles.actions}>
        {hasSave && <Button label="Continue" onPress={() => router.push('/game')} testID="continue" />}
        <Button
          label="New career"
          variant={hasSave ? 'ghost' : 'gold'}
          onPress={startNew}
          testID="new-career"
        />
      </View>

      <Modal transparent visible={confirming} animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Wipe the current career?</Text>
            <Text style={styles.dialogText}>Your saved run will be deleted. The fighters will not forgive you.</Text>
            <Button
              label="Wipe it"
              variant="red"
              small
              onPress={() => {
                wipe();
                setConfirming(false);
                router.push('/setup');
              }}
            />
            <Button label="Keep it" variant="ghost" small onPress={() => setConfirming(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', paddingVertical: 20 },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 6, color: colors.gold },
  hero: { gap: 14 },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 92, lineHeight: 88, color: colors.ink },
  tagline: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.muted, maxWidth: 380 },
  actions: { gap: 12 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: colors.panel, borderRadius: 18, padding: 22, gap: 12 },
  dialogTitle: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  dialogText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: 6 },
});
