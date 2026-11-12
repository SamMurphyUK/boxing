import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DIVISIONS, PROSPECTS, type DivisionName, type FighterStats } from '@game/index';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { usePromoterStore } from '@/store/promoter-store';
import { colors, fonts } from '@/theme';

const STATS: (keyof FighterStats)[] = ['skill', 'power', 'chin', 'stamina'];

export default function SetupScreen() {
  const startCareer = usePromoterStore((s) => s.startCareer);
  const [division, setDivision] = useState<DivisionName>('Welterweight');
  const [pick, setPick] = useState(0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.wordmark}>RINGSIDE</Text>
        <Text style={styles.title}>Build your promotion</Text>

        <Text style={styles.section}>Division</Text>
        <View style={styles.pills}>
          {(Object.keys(DIVISIONS) as DivisionName[]).map((name) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => setDivision(name)}
              style={[styles.pill, name === division && styles.pillSelected]}
            >
              <Text style={[styles.pillText, name === division && styles.pillTextSelected]}>{name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Your first fighter</Text>
        {PROSPECTS.map((prospect, index) => (
          <Pressable
            key={prospect.name}
            testID={`prospect-${index}`}
            accessibilityRole="button"
            onPress={() => setPick(index)}
            style={[styles.prospect, index === pick && styles.prospectSelected]}
          >
            <Avatar characterId={null} name={prospect.name} color={prospect.colour} size={48} />
            <View style={styles.prospectBody}>
              <Text style={styles.prospectName}>
                {prospect.name} <Text style={styles.nick}>“{prospect.nick}”</Text>
              </Text>
              <Text style={styles.arch}>{prospect.arch}</Text>
              <Text style={styles.bio}>{prospect.bio}</Text>
              <View style={styles.stats}>
                {STATS.map((stat) => (
                  <View key={stat} style={styles.stat}>
                    <View style={styles.statHead}>
                      <Text style={styles.statLabel}>{stat}</Text>
                      <Text style={styles.statValue}>{prospect[stat]}</Text>
                    </View>
                    <View style={styles.statTrack}>
                      <View style={[styles.statFill, { width: `${prospect[stat]}%`, backgroundColor: prospect.colour }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="Open the doors"
          testID="start-career"
          onPress={() => {
            startCareer(division, pick);
            router.replace('/game');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 24, gap: 12 },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 6, color: colors.gold },
  title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, color: colors.ink },
  section: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  pillTextSelected: { color: colors.bg },
  prospect: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prospectSelected: { borderColor: colors.gold },
  prospectBody: { flex: 1, gap: 4 },
  prospectName: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  nick: { color: colors.gold },
  arch: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.4, color: colors.muted, textTransform: 'uppercase' },
  bio: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink, opacity: 0.85 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  stat: { width: '46%', gap: 4 },
  statHead: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  statTrack: { height: 5, borderRadius: 3, backgroundColor: colors.panelHigh, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 3 },
  footer: { paddingVertical: 12 },
});
