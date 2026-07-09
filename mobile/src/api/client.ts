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
