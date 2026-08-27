import axios from 'axios';
import { API_BASE_URL } from './config';
import { storageDelete, storageGet, storageSet, largeStorageGet, largeStorageSet, largeStorageDelete } from '../utils/storage';

export const TOKEN_KEY = 'cims_token';
export const USER_KEY = 'cims_user';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storageGet(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the runtime set multipart boundary — forcing Content-Type breaks multer parsing
  // (common cause of 500s when creating chemicals from Expo web / mobile).
  const data = config.data as any;
  const isFormData =
    (typeof FormData !== 'undefined' && data instanceof FormData) ||
    (data && typeof data.append === 'function');
  if (isFormData) {
    if (config.headers && typeof (config.headers as any).delete === 'function') {
      (config.headers as any).delete('Content-Type');
    } else if (config.headers) {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
    // File uploads can take longer than JSON calls
    if (!config.timeout || config.timeout < 60000) {
      config.timeout = 60000;
    }
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (status === 401 || (status === 403 && code === 'NO_LABS_ASSIGNED')) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/**
 * Save session – token goes into normal (small) storage, user JSON uses
 * the chunked large-storage helpers so it never exceeds the 2048-byte
 * SecureStore ceiling on native devices.
 */
export async function saveSession(token: string, user: unknown) {
  try {
    await storageSet(TOKEN_KEY, token);
    await largeStorageSet(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('[session] saveSession failed:', err);
  }
}

export async function clearSession() {
  try {
    await storageDelete(TOKEN_KEY);
    await largeStorageDelete(USER_KEY);
  } catch (err) {
    console.warn('[session] clearSession failed:', err);
  }
}

export async function loadSession(): Promise<{ token: string | null; user: unknown | null }> {
  try {
    const token = await storageGet(TOKEN_KEY);
    const raw = await largeStorageGet(USER_KEY);
    return { token, user: raw ? JSON.parse(raw) : null };
  } catch (err) {
    console.warn('[session] loadSession failed:', err);
    return { token: null, user: null };
  }
}
