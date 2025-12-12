import { MessageResponse, ModalType } from '@/shared/types';
import { MESSAGE_TYPES, ACTIONS, DEFAULT_UNLOCK_REQUIREMENTS, UPDATE_INTERVAL, RESPONSE_TYPES, MODAL_TYPES } from '@/shared/constants';
import { buildModal } from '@/content/modal-builder';

let isTracking = false;
let requirements = DEFAULT_UNLOCK_REQUIREMENTS;
let startTime: number | null = null;
let timeSpent = 0;
let maxScroll = 0;
let pageStableAt: number | null = null;
let timerInterval: number | null = null;
let lastScrollHeight = 0;
let stabilityCheckInterval: number | null = null;

// 監聽來自 background 的訊息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received:', message);
  
  if (message.action === ACTIONS.START_TRACKING) {
    startTracking(message.requirements);
    sendResponse({ success: true });
  }
  
  if (message.action === ACTIONS.SHOW_TOAST) {
    showToast(message.message);
    sendResponse({ success: true });
  }
  
  if (message.action === ACTIONS.SHOW_INCOMPLETE_MODAL) {
    showIncompleteModal(message.data);
    sendResponse({ success: true });
  }
  
  if (message.action === ACTIONS.GET_PROGRESS) {
    sendResponse({ 
      success: true, 
      timeSpent, 
      maxScroll,
      isTracking,
    });
  }
  
  return true;
});

const startTracking = (reqs: { minTime: number; minScroll: number }) => {
  if (isTracking) return;

  isTracking = true;
  requirements = reqs;
  
  checkPageStability();
  
  window.addEventListener('scroll', handleScroll);
  document.addEventListener('click', handleLinkClick, true);
}

const checkPageStability = () => {
  if (document.readyState !== 'complete') {
    window.addEventListener('load', checkPageStability);
    return;
  }
  lastScrollHeight = document.documentElement.scrollHeight;
  
  stabilityCheckInterval = window.setInterval(() => {
    const currentHeight = document.documentElement.scrollHeight;

    if (currentHeight !== lastScrollHeight) {
      lastScrollHeight = currentHeight;
      pageStableAt = null;
      return;
    }

    if (pageStableAt) return;

    pageStableAt = Date.now();
    startTimer();

    if (stabilityCheckInterval) {
      clearInterval(stabilityCheckInterval);
      stabilityCheckInterval = null;
    }
  }, UPDATE_INTERVAL);
}

const startTimer = () => {
  startTime = Date.now();
  let hasReachedMinTime = false;

  timerInterval = window.setInterval(() => {
    if (!isTracking) {
      if (timerInterval) clearInterval(timerInterval);
      return;
    }
    
    timeSpent = Math.floor((Date.now() - startTime!) / UPDATE_INTERVAL);
  
    if (!hasReachedMinTime && timeSpent >= requirements.minTime) {
      hasReachedMinTime = true;
      const currentScroll = getCurrentScrollPercent();
      maxScroll = Math.max(maxScroll, currentScroll);
    }

    if (timeSpent >= requirements.minTime && maxScroll >= requirements.minScroll) {
      handleUnlocked();
    }
  }, UPDATE_INTERVAL);
}

const getCurrentScrollPercent = (): number => {
  const scrollTop = window.scrollY;
  const windowHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  
  const scrollableHeight = docHeight - windowHeight;
  return scrollableHeight > 0 
    ? (scrollTop / scrollableHeight) * 100 
    : 100;
}

const handleScroll = () => {
  if (!isTracking || !pageStableAt) return;
  
  if (timeSpent < requirements.minTime) return;
  
  const scrollPercent = getCurrentScrollPercent();
  maxScroll = Math.max(maxScroll, scrollPercent);
  
  if (maxScroll >= requirements.minScroll) {
    handleUnlocked();
  }
}

const handleUnlocked = () => {
  if (!isTracking) return;
  
  isTracking = false;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleLinkClick, true);
  showCompletionModal();
}

const handleLinkClick = (event: MouseEvent) => {
  if (!isTracking) return;
  
  const target = event.target as HTMLElement;
  const link = target.closest('a');
  
  if (!link || !link.href) return;
  
  const opensNewTab = 
    link.target === '_blank' ||
    event.ctrlKey ||
    event.metaKey ||
    event.button === 1;
  
  if (opensNewTab) {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TRACK_LINK_CLICK,
      url: link.href,
    });
  }
}

const showCompletionModal = () => {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_QUEUE_STATE }, (response: MessageResponse) => {
    if (response.type !== RESPONSE_TYPES.QUEUE_STATE) {
      console.error('Failed to get queue state:', response);
      return;
    }
    
    const minorTabs = Object.values(response.state.minorTabs || {});
    const modal = createModal({
      type: MODAL_TYPES.COMPLETED,
      minorTabs: minorTabs
    });
    
    document.body.appendChild(modal);
  });
}

const showIncompleteModal = (data: any) => {
  const modal = createModal({
    type: MODAL_TYPES.INCOMPLETE,
    minorTabs: data.minorTabs,
  });
  
  document.body.appendChild(modal);
}

const createModal = (data: { type: ModalType; minorTabs: any[] }) => {
  return buildModal(data, {
    onSelectTab: (tabId: number) => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SELECT_NEXT_TAB,
        tabId,
      });
    },
    onSkipAll: () => {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_QUEUE });
    },
  });
}

/**
 * 目前先保留現狀；未來需要擴展 Toast 功能
 * 再移到 toast-builder.ts 管理
 */
const showToast = (message: string) => {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-line;
    max-width: 300px;
  `;
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}