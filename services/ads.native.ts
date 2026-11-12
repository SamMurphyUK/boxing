import type { AdsService } from './types';

// Ad SDKs (e.g. react-native-google-mobile-ads) need a development build, not Expo Go,
// so this stays a logging placeholder until the ad network is chosen.
export const ads: AdsService = {
  initialize: async () => {
    console.log('[ads] initialize');
  },
  showRewarded: async () => {
    console.log('[ads] showRewarded');
    return { rewarded: false };
  },
};
