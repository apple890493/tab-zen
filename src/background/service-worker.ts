import { 
  MessageAction,
  MessageResponse, 
  MainTab, 
  MinorTab
} from '@/shared/types';
import { 
  getQueueState, 
  updateQueueState, 
  isAllowedDomain,
  checkUnlockStatus 
} from '@/shared/storage';
import { MESSAGE_TYPES, ACTIONS, DEFAULT_UNLOCK_REQUIREMENTS, RESPONSE_TYPES } from '@/shared/constants';

chrome.runtime.onMessage.addListener((
  message: MessageAction,
  sender,
  sendResponse: (response: MessageResponse) => void
) => {
  handleMessage(message, sender).then(sendResponse);
  return true;
});

type MessageHandler = (message: MessageAction, sender: chrome.runtime.MessageSender) => Promise<MessageResponse>;
const messageHandlers: Record<MessageAction['type'], MessageHandler> = {
  [MESSAGE_TYPES.SET_MAIN_TAB]: async (message) => {
    const { tabId, url, title } = message as Extract<MessageAction, { type: typeof MESSAGE_TYPES.SET_MAIN_TAB }>;
    return await handleSetMainTab(tabId, url, title);
  },
  [MESSAGE_TYPES.GET_QUEUE_STATE]: async () => {
    const state = await getQueueState();
    return { type: RESPONSE_TYPES.QUEUE_STATE, state };
  },
  [MESSAGE_TYPES.TRACK_LINK_CLICK]: async (message, sender) => {
    const { url } = message as Extract<MessageAction, { type: typeof MESSAGE_TYPES.TRACK_LINK_CLICK }>;
    const fromTabId = sender.tab?.id ?? 0;
    return await handleTrackLinkClick(url, fromTabId);
  },
  [MESSAGE_TYPES.SELECT_NEXT_TAB]: async (message) => {
    const { tabId } = message as Extract<MessageAction, { type: typeof MESSAGE_TYPES.SELECT_NEXT_TAB }>;
    return await selectNextMainTab(tabId);
  },
  [MESSAGE_TYPES.RESET_QUEUE]: async () => await resetQueue(),
  [MESSAGE_TYPES.ADD_ALLOWED_DOMAIN]: async (message) => {
    const { domain } = message as Extract<MessageAction, { type: typeof MESSAGE_TYPES.ADD_ALLOWED_DOMAIN }>;
    return await addAllowedDomain(domain);
  },
  [MESSAGE_TYPES.REMOVE_ALLOWED_DOMAIN]: async (message) => {
    const { domain } = message as Extract<MessageAction, { type: typeof MESSAGE_TYPES.REMOVE_ALLOWED_DOMAIN }>;
    return await removeAllowedDomain(domain);
  },
  [MESSAGE_TYPES.ADD_TO_QUEUE]: async (message) => {
    const { tabId, url, title } = message as Extract<MessageAction, { type: typeof MESSAGE_TYPES.ADD_TO_QUEUE }>;
    return await handleSetMainTab(tabId, url, title);
  },
};

const handleMessage = async (
  message: MessageAction,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> => {
  const handler = messageHandlers[message.type];
  if (!handler) {
    return { type: RESPONSE_TYPES.SUCCESS, success: false, error: 'Unknown message type' };
  }
  return await handler(message, sender);
}

const handleSetMainTab = async (
  tabId: number,
  url: string,
  title: string
): Promise<MessageResponse> => {
  const newMainTab: MainTab = {
    tabId,
    url,
    title,
    addedAt: Date.now(),
    progress: {
      timeSpent: 0,
      maxScroll: 0,
      pageStableAt: null,
      lastActiveAt: Date.now(),
    },
  };

  await updateQueueState(state => ({
    ...state,
    mainTab: newMainTab,
    minorTabs: {},
    pendingModal: null,
  }));
  
  chrome.tabs.sendMessage(tabId, { 
    action: ACTIONS.START_TRACKING,
    requirements: DEFAULT_UNLOCK_REQUIREMENTS 
  });
  return { type: RESPONSE_TYPES.SUCCESS, success: true };
}

const handleTrackLinkClick = async (
  url: string,
  fromTabId: number
): Promise<MessageResponse> => {
  const state = await getQueueState();
  
  if (!state.mainTab || state.mainTab.tabId !== fromTabId) {
    return { type: RESPONSE_TYPES.SUCCESS, success: false, error: 'Not from main tab' };
  }
  
  if (isAllowedDomain(url, state.allowedDomains)) {
    console.log('Link is to allowed domain, not tracking:', url);
    return { type: RESPONSE_TYPES.SUCCESS, success: false, error: 'Allowed domain' };
  }
  
  if (state.minorTabs[url]) {
    console.log('Link already tracked:', url);
    return { type: RESPONSE_TYPES.SUCCESS, success: false, error: 'Already tracked' };
  }
  const tempMinor: MinorTab = {
    tabId: -1,
    url,
    title: url,
    openedFrom: fromTabId,
    addedAt: Date.now(),
  };
  
  await updateQueueState(state => ({
    ...state,
    minorTabs: {
      ...state.minorTabs,
      [url]: tempMinor,
    },
  }));
  return { type: RESPONSE_TYPES.SUCCESS, success: true };
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url || !tab.title) return;
  
  const state = await getQueueState();
  if (!state.mainTab) return;
  
  if (state.minorTabs[tab.url]) {
    await updateQueueState(state => ({
      ...state,
      minorTabs: {
        ...state.minorTabs,
        [tab.url!]: {
          ...state.minorTabs[tab.url!],
          tabId: tabId,
          title: tab.title!,
        },
      },
    }));
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const state = await getQueueState();
  
  if (!state.mainTab) {
    console.log('No main tab set, allowing switch');
    return;
  }
  
  if (activeInfo.tabId === state.mainTab.tabId) {
    console.log('Switching to main tab itself, allowing');
    return;
  }

  let targetTab: chrome.tabs.Tab;
  try {
    targetTab = await chrome.tabs.get(activeInfo.tabId);
  } catch (error) {
    console.log('Failed to get target tab info:', error);
    return;
  }
  
  if (!targetTab.url) {
    console.log('Target tab has no URL, allowing switch');
    return;
  }
  
  console.log('Target tab URL:', targetTab.url);
  
  if (isAllowedDomain(targetTab.url, state.allowedDomains)) {
    console.log('Switching to allowed domain:', targetTab.url);
    return;
  }
  
  const isMinorTab = Object.values(state.minorTabs).some(
    minor => minor.tabId === activeInfo.tabId || minor.url === targetTab.url
  );
  if (isMinorTab) {
    console.log('Switching to tracked minor tab, allowing');
    return;
  }

  const progress = await getProgressFromContentScript(state.mainTab.tabId);
  console.log('Current progress:', progress);
  
  const unlocked = checkUnlockStatus(
    progress.timeSpent,
    progress.maxScroll,
    DEFAULT_UNLOCK_REQUIREMENTS
  );
  
  if (unlocked) {
    console.log('Main tab completed, allowing switch');
    return;
  }
  
  const currentState = await getQueueState();
  if (!currentState.mainTab) {
    console.log('Main tab no longer exists, allowing switch');
    return;
  }
  
  console.log('Blocking switch, returning to main tab:', currentState.mainTab.tabId);
  
  const switched = await switchToTabWithRetry(currentState.mainTab.tabId);
  
  if (switched) {
    try {
      chrome.tabs.sendMessage(currentState.mainTab.tabId, {
        action: ACTIONS.SHOW_TOAST,
        message: `⏰ Please complete reading first\nProgress: ${Math.round(progress.maxScroll)}%`,
      });
    } catch (error) {
      console.error('Failed to send toast message:', error);
    }
  }
});

const RETRY_TAB_ERRORS = [
  'user may be dragging',
  'cannot be edited right now',
  'tab is being dragged',
];
const MAX_RETRIES = 3;
const DELAY_MS = 100;

const shouldRetryTabErrors = (errorMessage: string): boolean => {
  return RETRY_TAB_ERRORS.some(pattern => errorMessage.includes(pattern));
};

const switchToTabWithRetry = async (
  tabId: number,
): Promise<boolean> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await chrome.tabs.update(tabId, { active: true });
      console.log(`Successfully switched to tab ${tabId} on attempt ${attempt + 1}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (shouldRetryTabErrors(errorMessage)) {
        console.log(`Tab switch attempt ${attempt + 1} failed, retrying in ${DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        continue;
      }
      console.error('Tab switch failed with unexpected error:', error);
      return false;
    }
  }
  
  console.error(`Failed to switch to tab ${tabId} after ${MAX_RETRIES} attempts`);
  return false;
}

const getProgressFromContentScript = async (tabId: number): Promise<{ timeSpent: number; maxScroll: number }> => {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: ACTIONS.GET_PROGRESS });
    if (response?.success) {
      return {
        timeSpent: response.timeSpent || 0,
        maxScroll: response.maxScroll || 0,
      };
    }
  } catch (error) {
    console.log('Failed to get progress from content script:', error);
  }
  return { timeSpent: 0, maxScroll: 0 };
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getQueueState();
  
  if (state.mainTab && state.mainTab.tabId === tabId) {
    await updateQueueState(state => ({
      ...state,
      mainTab: null,
      minorTabs: {},
    }));
    return;
  }
  

  const minorTabUrl = Object.entries(state.minorTabs).find(
    ([_, minor]) => minor.tabId === tabId
  )?.[0];

  if (!minorTabUrl) return;
  await updateQueueState(state => {
    const newMinorTabs = { ...state.minorTabs };
    delete newMinorTabs[minorTabUrl];
    return { ...state, minorTabs: newMinorTabs };
  });
});

const selectNextMainTab = async (tabId: number): Promise<MessageResponse> => {
  const state = await getQueueState();
  const selectedTab = Object.values(state.minorTabs).find(
    minor => minor.tabId === tabId
  );
  
  if (!selectedTab) {
    return { type: RESPONSE_TYPES.SUCCESS, success: false, error: 'Tab not found' };
  }
  
  const newMainTab: MainTab = {
    tabId: selectedTab.tabId,
    url: selectedTab.url,
    title: selectedTab.title,
    addedAt: Date.now(),
    progress: {
      timeSpent: 0,
      maxScroll: 0,
      pageStableAt: null,
      lastActiveAt: Date.now(),
    },
  };
  
  await updateQueueState(state => ({
    ...state,
    mainTab: newMainTab,
    minorTabs: {},
    pendingModal: null,
  }));
  
  await chrome.tabs.update(tabId, { active: true });
  chrome.tabs.sendMessage(tabId, {
    action: ACTIONS.START_TRACKING,
    requirements: DEFAULT_UNLOCK_REQUIREMENTS,
  });

  return { type: RESPONSE_TYPES.SUCCESS, success: true };
}

const resetQueue = async (): Promise<MessageResponse> => {
  await updateQueueState(state => ({
    ...state,
    mainTab: null,
    minorTabs: {},
    pendingModal: null,
  }));
  
  return { type: RESPONSE_TYPES.SUCCESS, success: true };
}

const addAllowedDomain = async (domain: string): Promise<MessageResponse> => {
  await updateQueueState(state => ({
    ...state,
    allowedDomains: [...state.allowedDomains, domain],
  }));

  return { type: RESPONSE_TYPES.SUCCESS, success: true };
}

const removeAllowedDomain = async (domain: string): Promise<MessageResponse> => {
  await updateQueueState(state => ({
    ...state,
    allowedDomains: state.allowedDomains.filter(d => d !== domain),
  }));
  
  return { type: RESPONSE_TYPES.SUCCESS, success: true };
}
