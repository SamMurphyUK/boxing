import { Image } from 'expo-image';
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { CardView, Side } from '@game/index';
import { Avatar } from '@/components/avatar';
import { PORTRAITS } from '@/game-content/portraits';
import { colors, fonts } from '@/theme';

const COMMIT_DISTANCE = 90;
const PREVIEW_DISTANCE = 14;
const LABEL_FADE_DISTANCE = 80;

export interface SwipeCardHandle {
  fling: (side: Side) => void;
}

interface Props {
  view: CardView;
  width: number;
  height: number;
  onPreview: (side: Side | null) => void;
  onCommit: (side: Side) => void;
  ref?: Ref<SwipeCardHandle>;
}

const toSide = (direction: number): Side | null => (direction < 0 ? 'left' : direction > 0 ? 'right' : null);

export function SwipeCard({ view, width, height, onPreview, onCommit, ref }: Props) {
  const x = useSharedValue(0);
  const previewDirection = useSharedValue(0);
  const enter = useSharedValue(0);
  const committed = useSharedValue(false);
  const callbacks = useRef({ onPreview, onCommit });
  useLayoutEffect(() => {
    callbacks.current = { onPreview, onCommit };
  });

  useEffect(() => {
    enter.set(withTiming(1, { duration: 260 }));
  }, [enter]);

  const emitPreview = (direction: number) => callbacks.current.onPreview(toSide(direction));
  const emitCommit = (direction: number) => {
    const side = toSide(direction);
    if (side) callbacks.current.onCommit(side);
  };

  const flyOff = (direction: number) => {
    'worklet';
    committed.set(true);
    x.set(
      withTiming(direction * width * 1.5, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(emitCommit, direction);
      }),
    );
  };

  useImperativeHandle(ref, () => ({
    fling: (side) => {
      if (committed.get()) return;
      const direction = side === 'left' ? -1 : 1;
      previewDirection.set(direction);
      emitPreview(direction);
      x.set(
        withTiming(direction * 60, { duration: 140 }, (finished) => {
          if (finished) flyOff(direction);
        }),
      );
    },
  }));

  const pan = usePanGesture({
    minDistance: 4,
    onUpdate: (event) => {
      'worklet';
      if (committed.get()) return;
      x.set(event.translationX);
      const direction = event.translationX < -PREVIEW_DISTANCE ? -1 : event.translationX > PREVIEW_DISTANCE ? 1 : 0;
      if (direction !== previewDirection.get()) {
        previewDirection.set(direction);
        scheduleOnRN(emitPreview, direction);
      }
    },
    onDeactivate: (event) => {
      'worklet';
      if (committed.get()) return;
      if (!event.canceled && Math.abs(event.translationX) > COMMIT_DISTANCE) {
        flyOff(event.translationX < 0 ? -1 : 1);
        return;
      }
      x.set(withSpring(0, { damping: 18, stiffness: 220 }));
      previewDirection.set(0);
      scheduleOnRN(emitPreview, 0);
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [
      { translateX: x.get() },
      { rotate: `${x.get() * 0.05}deg` },
      { scale: interpolate(enter.get(), [0, 1], [0.94, 1]) },
    ],
  }));
  const leftLabel = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-LABEL_FADE_DISTANCE, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const rightLabel = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [0, LABEL_FADE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  const portrait = view.speakerId ? PORTRAITS[view.speakerId] : undefined;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID="swipe-card"
        style={[styles.card, { width, height }, view.isFight && styles.fightCard, cardStyle]}
      >
        {portrait && (
          <View style={[styles.hero, { backgroundColor: view.speaker.colour }]}>
            <Image
              source={portrait}
              style={styles.heroImage}
              contentFit="cover"
              contentPosition={{ top: '20%', left: '50%' }}
            />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.who}>
            <Avatar characterId={view.speakerId} name={view.speaker.name} color={view.speaker.colour} />
            <View style={styles.whoText}>
              <Text style={styles.name}>{view.speaker.name}</Text>
              <Text style={styles.role}>{view.speaker.role}</Text>
            </View>
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.text, !portrait && styles.textLarge]}>{view.text}</Text>
          </View>
          <View style={styles.foot}>
            <Text style={styles.footText}>{view.isFight ? 'Fight night' : view.footer}</Text>
          </View>
        </View>
        <Animated.View pointerEvents="none" style={[styles.option, styles.optionLeft, leftLabel]}>
          <Text style={styles.optionText}>{view.left.label}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.option, styles.optionRight, rightLabel]}>
          <Text style={[styles.optionText, styles.optionTextRight]}>{view.right.label}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: colors.panelHigh,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  fightCard: { borderColor: colors.gold, borderWidth: 2 },
  hero: { height: '42%', borderBottomWidth: 3, borderBottomColor: colors.bg },
  heroImage: { width: '100%', height: '100%' },
  body: { flex: 1, padding: 18, paddingTop: 16 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whoText: { flex: 1 },
  name: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.5, color: colors.ink },
  role: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.4, color: colors.muted, textTransform: 'uppercase' },
  textWrap: { flex: 1, justifyContent: 'center' },
  text: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24, color: colors.ink },
  textLarge: { fontSize: 21, lineHeight: 30 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end' },
  footText: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.6, color: colors.muted, textTransform: 'uppercase' },
  option: {
    position: 'absolute',
    top: 14,
    maxWidth: '72%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(11,11,16,0.88)',
    borderWidth: 2,
  },
  optionLeft: { left: 14, borderColor: colors.ink },
  optionRight: { right: 14, borderColor: colors.gold },
  optionText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, letterSpacing: 0.5, color: colors.ink },
  optionTextRight: { color: colors.gold, textAlign: 'right' },
});
