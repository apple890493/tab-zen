import { UnlockRequirements } from '@/shared/types';

export const MESSAGE_TYPES = {
  SET_MAIN_TAB: 'SET_MAIN_TAB',
  TRACK_LINK_CLICK: 'TRACK_LINK_CLICK',
  GET_QUEUE_STATE: 'GET_QUEUE_STATE',
  SELECT_NEXT_TAB: 'SELECT_NEXT_TAB',
  RESET_QUEUE: 'RESET_QUEUE',
  ADD_ALLOWED_DOMAIN: 'ADD_ALLOWED_DOMAIN',
  REMOVE_ALLOWED_DOMAIN: 'REMOVE_ALLOWED_DOMAIN',
  ADD_TO_QUEUE: 'ADD_TO_QUEUE',
} as const;

export const RESPONSE_TYPES = {
  SUCCESS: 'success',
  QUEUE_STATE: 'queue_state',
} as const;

export const ACTIONS = {
  START_TRACKING: 'START_TRACKING',
  SHOW_TOAST: 'SHOW_TOAST',
  SHOW_INCOMPLETE_MODAL: 'SHOW_INCOMPLETE_MODAL',
  GET_PROGRESS: 'GET_PROGRESS',
} as const;

export const DEFAULT_UNLOCK_REQUIREMENTS: UnlockRequirements = {
  minTime: 10,
  minScroll: 85,
};

export const UPDATE_INTERVAL = 1000;

export const UPDATE_SECONDS = 5;

export const MODAL_TYPES = {
  COMPLETED: 'completed',
  INCOMPLETE: 'incomplete',
} as const;


// https://theoutsiderstory.com/oversea-job-hunting-5-steps/
// https://theoutsiderstory.com/software-engineer-canada-facing-fear/
// https://www.cw.com.tw/article/5044993
// chrome://extensions/