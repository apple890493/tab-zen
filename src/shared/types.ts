import { MESSAGE_TYPES, RESPONSE_TYPES, MODAL_TYPES } from '@/shared/constants';

export interface MainTab {
  tabId: number;
  url: string;
  title: string;
  addedAt: number;
  progress: {
    timeSpent: number;
    maxScroll: number;
    pageStableAt: number | null;
    lastActiveAt: number;
  };
}

export interface MinorTab {
  tabId: number;
  url: string;
  title: string;
  openedFrom: number;
  addedAt: number;
}

export interface QueueState {
  mainTab: MainTab | null;
  minorTabs: Record<string, MinorTab>;
  allowedDomains: string[];
  pendingModal: PendingModal | null;
}

export interface PendingModal {
  type: 'incomplete';
  minorTabs: MinorTab[];
}

export interface UnlockRequirements {
  minTime: number;
  minScroll: number;
}

export const DEFAULT_ALLOWED_DOMAINS = [
  'mail.google.com',
  'slack.com',
  'app.asana.com',
];

export type MessageAction =
  | { type: typeof MESSAGE_TYPES.SET_MAIN_TAB; tabId: number; url: string; title: string }
  | { type: typeof MESSAGE_TYPES.TRACK_LINK_CLICK; url: string }
  | { type: typeof MESSAGE_TYPES.GET_QUEUE_STATE }
  | { type: typeof MESSAGE_TYPES.SELECT_NEXT_TAB; tabId: number }
  | { type: typeof MESSAGE_TYPES.RESET_QUEUE }
  | { type: typeof MESSAGE_TYPES.ADD_ALLOWED_DOMAIN; domain: string }
  | { type: typeof MESSAGE_TYPES.REMOVE_ALLOWED_DOMAIN; domain: string }
  | { type: typeof MESSAGE_TYPES.ADD_TO_QUEUE; tabId: number; url: string; title: string };

export type MessageResponse =
  | { type: typeof RESPONSE_TYPES.SUCCESS; success: boolean; error?: string }
  | { type: typeof RESPONSE_TYPES.QUEUE_STATE; state: QueueState };

export type ModalType = typeof MODAL_TYPES[keyof typeof MODAL_TYPES];