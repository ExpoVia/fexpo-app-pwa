export const LIVE = import.meta.env.VITE_DATA_MODE === 'live';
export const LOCAL = import.meta.env.VITE_DATA_MODE === 'local';
export const EVENT_ID = import.meta.env.VITE_EVENT_ID?.trim() || '';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const eventReady = UUID.test(EVENT_ID);
