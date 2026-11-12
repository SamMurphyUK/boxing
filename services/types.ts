export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export interface HapticsService {
  trigger: (kind: HapticKind) => Promise<void>;
}

export interface AdsService {
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
