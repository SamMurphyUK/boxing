import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { initials } from '@game/index';
import { PORTRAITS } from '@/game-content/portraits';
import { colors, fonts } from '@/theme';

interface Props {
  characterId: string | null;
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ characterId, name, color, size = 52 }: Props) {
  const portrait = characterId ? PORTRAITS[characterId] : undefined;
  const shape = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
  return (
    <View style={[styles.circle, shape]}>
      {portrait ? (
        <Image source={portrait} style={styles.image} contentFit="cover" contentPosition={{ top: '18%', left: '50%' }} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.42 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initials: { fontFamily: fonts.display, color: colors.bg, letterSpacing: 1 },
});
