import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';

import type { Ludus } from '@game/index';
import { SKIN, TRUNKS } from '@/bng/boxing/drawBoxer';
import { BloodGoldStage, type BoxingPlace, type GladiatorPose, type StageActor } from '@/components/blood-gold-stage';
import { useLudusStore } from '@/store/ludus-store';
import { colors, fonts } from '@/theme';

export function StableRoom() {
  const ludus = useLudusStore((s) => s.ludus);
  const push = useLudusStore((s) => s.push);
  const beat = useLudusStore((s) => s.beat);
  const call = useLudusStore((s) => s.call);
  const clear = useLudusStore((s) => s.clear);
  const [width, setWidth] = useState(0);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (ludus?.stage === 'ARENA') router.push('/fight');
  }, [ludus?.stage]);

  if (!ludus) return null;

  const vignette = ludus.vignette;
  const beatIndex = vignette ? Math.min(vignette.index, vignette.beats.length - 1) : 0;
  const place = ludus.stage === 'CAMP_VIGNETTE' ? (vignette?.beats[beatIndex]?.place ?? 'Bar') : 'Stable';
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setPhoneOpen(false);
    setDraft('');
    call(text);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.wordmark}>RINGSIDE</Text>
      <MeterRow ludus={ludus} />
      <View onLayout={onLayout}>
        {width > 0 && <BloodGoldStage place={stagePlace(place)} actors={campActors(ludus, place)} width={width} />}
      </View>

      {ludus.ending ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{ludus.ending.title}</Text>
          <Text style={styles.copy}>{ludus.ending.reason}</Text>
          <Pressable onPress={() => { clear(); router.replace('/'); }} style={styles.choice}>
            <Text style={styles.choiceText}>Leave the building</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          {ludus.stage === 'STABLE_ROOM' &&
            ludus.roomLines.map((line) => (
              <Text key={line.speakerId} style={styles.copy}>
                {line.text}
              </Text>
            ))}
          {ludus.stage === 'CAMP_VIGNETTE' && ludus.vignette && !ludus.vignette.awaitingPhone && (
            <Text style={styles.copy}>{ludus.vignette.beats[ludus.vignette.index]?.text}</Text>
          )}
          {ludus.phone && <Text style={styles.reply}>{ludus.phone.reply}</Text>}
          {ludus.stage === 'STABLE_ROOM' &&
            ludus.boxers.map((boxer) => (
              <Pressable key={boxer.id} onPress={() => push(boxer.id)} style={styles.choice} testID={`push-${boxer.id}`}>
                <Text style={styles.choiceText}>Push {boxer.name}</Text>
              </Pressable>
            ))}
          {ludus.stage === 'CAMP_VIGNETTE' && ludus.vignette && !ludus.vignette.awaitingPhone && (
            <View style={styles.row}>
              <Pressable onPress={() => beat('left')} style={styles.choice}>
                <Text style={styles.choiceText}>{ludus.vignette.beats[ludus.vignette.index]?.left.label}</Text>
              </Pressable>
              <Pressable onPress={() => beat('right')} style={styles.choice}>
                <Text style={styles.choiceText}>{ludus.vignette.beats[ludus.vignette.index]?.right.label}</Text>
              </Pressable>
            </View>
          )}
          {ludus.vignette?.awaitingPhone && !ludus.ending && (
            <Pressable onPress={() => setPhoneOpen(true)} style={styles.choice} testID="ring-him">
              <Text style={styles.choiceText}>Ring him</Text>
            </Pressable>
          )}
        </View>
      )}

      <Modal transparent visible={phoneOpen} animationType="fade" onRequestClose={() => setPhoneOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.phone}>
            <Text style={styles.cardTitle}>Burner</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Say it plain"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoFocus
              onSubmitEditing={send}
            />
            <Pressable onPress={send} style={styles.choice}>
              <Text style={styles.choiceText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function kitFor(id: string) {
  if (id === 'danny') return { trunks: TRUNKS.danny, skin: SKIN.danny };
  if (id === 'ezra') return { trunks: TRUNKS.ezra, skin: SKIN.ezra };
  if (id === 'kofi') return { trunks: TRUNKS.kofi, skin: SKIN.kofi };
  return { trunks: TRUNKS.opponent, skin: SKIN.opponent };
}

function stagePlace(place: string): BoxingPlace {
  if (place === 'Press') return 'press';
  if (place === 'Bar') return 'bar';
  return 'gym';
}

function poseFor(ludus: Ludus, id: string, place: string): GladiatorPose {
  if (ludus.focusId !== id) return 'idle';
  if (place === 'Gym') return 'sparring';
  if (place === 'Bar') return 'sitting';
  return 'idle';
}

function campActors(ludus: Ludus, place: string): StageActor[] {
  const spots = [96, 172, 248];
  return ludus.boxers
    .filter((boxer) => ludus.focusId === null || ludus.focusId === boxer.id)
    .map((boxer) => {
      const slot = ludus.boxers.findIndex((entry) => entry.id === boxer.id);
      return {
        x: place === 'Bar' && ludus.focusId === boxer.id ? 86 : (spots[slot] ?? 172),
        y: place === 'Bar' && ludus.focusId === boxer.id ? 172 : 176,
        ...kitFor(boxer.id),
        state: poseFor(ludus, boxer.id, place),
        flipX: slot === 2,
      };
    });
}

function MeterRow({ ludus }: { ludus: Ludus }) {
  const items = [
    ['Cash', String(ludus.meters.cash)],
    ['Hype', String(ludus.meters.hype)],
    ['Ego', String(ludus.meters.ego)],
    ['Heat', String(ludus.meters.heat)],
  ] as const;
  return (
    <View style={styles.meters}>
      {items.map(([label, value]) => (
        <Text key={label} style={styles.meter}>
          {label} {value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 10, paddingTop: 8 },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 5, color: colors.gold },
  meters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meter: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1, color: colors.ink, textTransform: 'uppercase' },
  card: { gap: 8 },
  cardTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.gold },
  copy: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  reply: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.gold },
  row: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: colors.gold, paddingVertical: 8, paddingHorizontal: 10 },
  choiceText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 },
  phone: { backgroundColor: colors.panel, padding: 16, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    padding: 10,
  },
});
