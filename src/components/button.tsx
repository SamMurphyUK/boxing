import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/theme';

type Variant = 'gold' | 'red' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BACKGROUND: Record<Variant, string> = { gold: colors.gold, red: colors.red, ghost: 'transparent' };
const INK: Record<Variant, string> = { gold: colors.bg, red: colors.ink, ghost: colors.ink };

export function Button({ label, onPress, variant = 'gold', small, style, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: BACKGROUND[variant] },
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, small && styles.labelSmall, { color: INK[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  small: { minHeight: 48 },
  ghost: { borderWidth: 1, borderColor: colors.line },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  label: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 1.5 },
  labelSmall: { fontSize: 20 },
});
