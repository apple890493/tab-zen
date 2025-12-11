import { QueueState, DEFAULT_ALLOWED_DOMAINS } from '@/shared/types';

const STORAGE_KEY = 'tabZenState';

export const getQueueState = async (): Promise<QueueState> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  
  if (!result[STORAGE_KEY]) {
    const defaultState: QueueState = {
      mainTab: null,
      minorTabs: {},
      allowedDomains: DEFAULT_ALLOWED_DOMAINS,
      pendingModal: null,
    };
    await saveQueueState(defaultState);
    return defaultState;
  }
  
  return result[STORAGE_KEY] as QueueState;
}

export const saveQueueState = async (state: QueueState): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export const updateQueueState = async (
  updater: (state: QueueState) => QueueState
): Promise<QueueState> => {
  const currentState = await getQueueState();
  const newState = updater(currentState);
  await saveQueueState(newState);
  return newState;
}

export const isAllowedDomain = (url: string, allowedDomains: string[]): boolean => {
  try {
    const hostname = new URL(url).hostname;
    return allowedDomains.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export const checkUnlockStatus = (
  timeSpent: number,
  scrollPercent: number,
  requirements: { minTime: number; minScroll: number }
): boolean => {
  return timeSpent >= requirements.minTime && scrollPercent >= requirements.minScroll;
}