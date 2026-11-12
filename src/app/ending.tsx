import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Toast } from '@/components/toast';
import { ads } from '@services/ads';
import { share } from '@services/share';
import { usePromoterStore } from '@/store/promoter-store';
import { colors, fonts } from '@/theme';

const SHARE_MESSAGES = { shared: null, dismissed: null, copied: 'Copied to clipboard', failed: 'Could not share' } as const;

export default function EndingScreen() {
  const ending = usePromoterStore((s) => s.ending);
  const takeSecondChance = usePromoterStore((s) => s.takeSecondChance);
  const [message, setMessage] = useState<string | null>(null);

  if (!ending) return <Redirect href="/" />;

  const onShare = async () => setMessage(SHARE_MESSAGES[await share.shareText(ending.shareText)]);
  const onSecondChance = async () => {
    if (await takeSecondChance()) router.replace('/game');
    else setMessage('No second chance this time');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.wordmark}>RINGSIDE</Text>
        <Text style={styles.kicker}>Career over</Text>
        <Text style={styles.title}>{ending.title}</Text>
        <Text style={styles.story}>{ending.story}</Text>
        <View style={styles.stats}>
          {ending.stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{ending.score.toLocaleString('en-GB')}</Text>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Share your run" onPress={onShare} testID="share" />
        {ads.available && <Button label="Second chance" variant="red" onPress={onSecondChance} />}
        <Button label="Run it back" variant="ghost" onPress={() => router.replace('/setup')} testID="run-it-back" />
      </View>
      <Toast message={message} onDone={() => setMessage(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 16, gap: 10 },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 6, color: colors.gold },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase', marginTop: 12 },
  title: { fontFamily: fonts.display, fontSize: 72, lineHeight: 72, color: colors.red },
  story: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: colors.panel, borderRadius: 12, padding: 12 },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  score: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    marginTop: 6,
  },
  scoreLabel: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase' },
  scoreValue: { fontFamily: fonts.display, fontSize: 44, color: colors.gold },
  actions: { gap: 10, paddingVertical: 12 },
});
