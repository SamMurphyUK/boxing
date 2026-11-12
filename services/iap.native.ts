import type { IapService } from './types';

// Store billing (react-native-iap or expo-iap) needs a development build, not Expo Go,
// so this stays a logging placeholder until products exist in App Store Connect / Play Console.
export const iap: IapService = {
  initialize: async () => {
    console.log('[iap] initialize');
  },
  getProducts: async (ids) => ids.map((id) => ({ id, title: id, price: '—' })),
  purchase: async (productId) => {
    console.log('[iap] purchase', productId);
    return { success: false };
  },
};
