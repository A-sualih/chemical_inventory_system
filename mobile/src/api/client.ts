import axios from 'axios';
import { API_BASE_URL } from './config';
import { storageDelete, storageGet, storageSet } from '../utils/storage';

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

export async function saveSession(token: string, user: unknown) {
  await storageSet(TOKEN_KEY, token);
  await storageSet(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await storageDelete(TOKEN_KEY);
  await storageDelete(USER_KEY);
}

export async function loadSession(): Promise<{ token: string | null; user: unknown | null }> {
  const token = await storageGet(TOKEN_KEY);
  const raw = await storageGet(USER_KEY);
  return { token, user: raw ? JSON.parse(raw) : null };
}
