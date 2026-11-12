import { Share } from 'react-native';

import type { ShareService } from './types';

export const share: ShareService = {
  shareText: async (text) => {
    try {
      const result = await Share.share({ message: text });
      return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
    } catch {
      return 'failed';
    }
  },
};
