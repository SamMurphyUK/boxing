export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export interface HapticsService {
  trigger: (kind: HapticKind) => Promise<void>;
}

export interface AdsService {
  available: boolean;
  initialize: () => Promise<void>;
  showRewarded: () => Promise<{ rewarded: boolean }>;
}

export interface Product {
  id: string;
  title: string;
  price: string;
}

export interface IapService {
  initialize: () => Promise<void>;
  getProducts: (ids: string[]) => Promise<Product[]>;
  purchase: (productId: string) => Promise<{ success: boolean }>;
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

export interface ShareService {
  shareText: (text: string) => Promise<ShareOutcome>;
}

export interface StorageService {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}
