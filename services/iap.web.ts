import type { IapService } from './types';

export const iap: IapService = {
  initialize: async () => {},
  getProducts: async () => [],
  purchase: async () => ({ success: false }),
};
