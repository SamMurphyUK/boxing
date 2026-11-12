import type { ShareService } from './types';

export const share: ShareService = {
  shareText: async (text) => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed';
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  },
};
