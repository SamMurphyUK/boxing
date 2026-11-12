import type { AdsService } from './types';

export const ads: AdsService = {
  available: false,
  initialize: async () => {},
  showRewarded: async () => ({ rewarded: false }),
};
