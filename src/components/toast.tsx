import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { colors, fonts } from '@/theme';

const VISIBLE_MS = 2000;

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(id);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.toast} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.gold,
    zIndex: 10,
  },
  text: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bg },
});
