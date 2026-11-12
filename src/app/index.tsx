import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { haptics } from '@services/haptics';
import { useGameStore } from '@/store/game-store';

const TICK_MS = 250;

export default function HomeScreen() {
  const coins = useGameStore((s) => s.state.coins);
  const taps = useGameStore((s) => s.state.taps);
  const tap = useGameStore((s) => s.tap);
  const tick = useGameStore((s) => s.tick);

  useEffect(() => {
    const id = setInterval(() => tick(TICK_MS / 1000), TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  const onPress = () => {
    tap();
    haptics.trigger('light');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.wordmark}>RINGSIDE</Text>
        <Text style={styles.title}>It runs.</Text>
        <Text style={styles.subtitle}>
          {Platform.OS === 'web' ? 'Web preview' : `Expo Go on ${Platform.OS}`}
        </Text>

        <View style={styles.stats}>
          <Text style={styles.statValue}>{Math.floor(coins)}</Text>
          <Text style={styles.statLabel}>coins · {taps} taps</Text>
        </View>

        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>TAP</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b10' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  wordmark: { color: '#e8b547', fontSize: 14, letterSpacing: 4, fontWeight: '700' },
  title: { color: '#f4f1ea', fontSize: 40, fontWeight: '800' },
  subtitle: { color: '#9a97a8', fontSize: 15 },
  stats: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  statValue: { color: '#f4f1ea', fontSize: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: '#9a97a8', fontSize: 14 },
  button: {
    backgroundColor: '#e0323c',
    paddingVertical: 20,
    paddingHorizontal: 64,
    borderRadius: 999,
    minHeight: 64,
    justifyContent: 'center',
  },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
});
