import type { AdsService } from './types';

// Real ad SDKs need a development build, not Expo Go. Until one is wired in, this placeholder
// grants the reward so the second-chance flow can be exercised on a phone.
export const ads: AdsService = {
  available: true,
  initialize: async () => {},
  showRewarded: async () => ({ rewarded: true }),
};
