import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { METER_LABELS, METERS, type Effects, type Meter, type Meters } from '@game/index';
import { MeterIcon } from '@/components/meter-icon';
import { colors, fonts, meterColors } from '@/theme';

const EFFECT_FOR: Record<Meter, keyof Effects> = { cash: 'c', hype: 'h', stable: 's', rep: 'r' };

function MeterItem({ meter, value, effect }: { meter: Meter; value: number; effect: number }) {
  const fill = useSharedValue(value);
  useEffect(() => {
    fill.set(withTiming(value, { duration: 450 }));
  }, [fill, value]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get()}%` }));
  const danger = value <= 12 || value >= 88;
  const dot = effect === 0 ? null : Math.abs(effect) >= 8 ? 'big' : 'small';
  return (
    <View style={styles.meter} accessibilityLabel={`${METER_LABELS[meter]} ${value} of 100`}>
      <View style={styles.dotRow}>
        {dot && <View style={[styles.dot, dot === 'big' && styles.dotBig]} />}
      </View>
      <MeterIcon meter={meter} color={danger ? colors.red : colors.ink} />
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: meterColors[meter] }, fillStyle]} />
      </View>
      <Text style={[styles.label, danger && styles.labelDanger]}>{METER_LABELS[meter]}</Text>
    </View>
  );
}

export function MetersBar({ meters, preview }: { meters: Meters; preview: Effects | null }) {
  return (
    <View style={styles.row}>
      {METERS.map((meter) => (
        <MeterItem key={meter} meter={meter} value={meters[meter]} effect={preview?.[EFFECT_FOR[meter]] ?? 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  meter: { flex: 1, alignItems: 'center', gap: 5 },
  dotRow: { height: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  dotBig: { width: 10, height: 10, borderRadius: 5 },
  track: { height: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: colors.panelHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  labelDanger: { color: colors.red },
});
