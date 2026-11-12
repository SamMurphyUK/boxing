import * as Haptics from 'expo-haptics';

import type { HapticKind, HapticsService } from './types';

const impact: Record<Exclude<HapticKind, 'success' | 'error'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export const haptics: HapticsService = {
  trigger: async (kind) => {
    if (kind === 'success') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (kind === 'error') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return Haptics.impactAsync(impact[kind]);
  },
};
