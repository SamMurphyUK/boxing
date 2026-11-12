import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StorageService } from './types';

export const storage: StorageService = {
  get: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
