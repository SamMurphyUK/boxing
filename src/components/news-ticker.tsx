import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@/theme';

const PIXELS_PER_SECOND = 40;
const GAP = 48;

export function NewsTicker({ items }: { items: string[] }) {
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(0);
  const text = items.join('     ·     ');

  useEffect(() => {
    if (!width) return;
    offset.set(0);
    offset.set(withRepeat(
      withTiming(-(width + GAP), { duration: ((width + GAP) / PIXELS_PER_SECOND) * 1000, easing: Easing.linear }),
      -1,
    ));
    return () => cancelAnimation(offset);
  }, [offset, width, text]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <View style={styles.bar}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>RINGSIDE NEWS</Text>
      </View>
      <View style={styles.window}>
        <Animated.View style={[styles.strip, slide]}>
          <Text numberOfLines={1} style={styles.text} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {text}
          </Text>
          <Text numberOfLines={1} style={[styles.text, { marginLeft: GAP }]}>
            {text}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.panel,
    overflow: 'hidden',
  },
  badge: { paddingHorizontal: 10, height: '100%', justifyContent: 'center', backgroundColor: colors.gold },
  badgeText: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, color: colors.bg },
  window: { flex: 1, overflow: 'hidden', height: '100%', justifyContent: 'center' },
  strip: { flexDirection: 'row', position: 'absolute', left: 12 },
  text: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, flexShrink: 0 },
});
