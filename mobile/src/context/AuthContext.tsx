import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  api,
  clearSession,
  loadSession,
  saveSession,
  setUnauthorizedHandler,
} from '../api/client';
import type { User } from '../types';
import { normalizeRole } from '../utils/roles';

const rolePermissions: Record<string, string[]> = {
  Admin: [
    'view_reports', 'view_audit_logs', 'assign_roles', 'view_chemicals',
    'view_safety_info', 'manage_settings',
    'manage_waste', 'approve_disposal', 'perform_backup', 'perform_restore',
    'manage_security', 'view_financials', 'MANAGE_LABS', 'approve_cross_lab_transfer',
  ],
  'Lab Manager': [
    'create_chemical', 'edit_chemical', 'delete_chemical', 'approve_request', 'view_reports',
    'view_audit_logs', 'view_chemicals', 'submit_request', 'update_stock',
    'view_safety_info', 'manage_waste', 'approve_disposal', 'approve_cross_lab_transfer',
    'MANAGE_LABS', 'manage_locations', 'view_financials',
  ],
  'Lab Technician': [
    'view_chemicals', 'update_stock', 'submit_request', 'view_safety_info',
  ],
  'Safety Officer': [
    'view_chemicals', 'view_safety_info', 'view_reports', 'view_audit_logs',
    'manage_waste', 'edit_chemical',
  ],
  'Viewer / Auditor': [
    'view_chemicals', 'view_reports', 'view_audit_logs', 'view_safety_info',
  ],
};

type LoginResult =
  | { success: true }
  | { success: false; error: string; requireMfa?: boolean; userId?: string; mfaType?: string };

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (userId: string, otp: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  switchActiveLab: (labId: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: string) => boolean;
  updateUser: (patch: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

function canonicalizeUser(raw: any): User {
  const role = normalizeRole(raw?.role) || raw?.role;
  return { ...raw, role } as User;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    console.log('[auth] logout initiated');
    setUser(null);
    setToken(null);
    try {
      await clearSession();
      console.log('[auth] session cleared successfully');
    } catch (err) {
      console.warn('[auth] clearSession error during logout:', err);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    (async () => {
      try {
        console.log('[auth] restoring session…');
        const session = await loadSession();
        if (session.token && session.user) {
          const decoded = jwtDecode<{ exp?: number }>(session.token);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.log('[auth] token expired, clearing session');
            await clearSession();
          } else {
            console.log('[auth] session restored for', (session.user as any)?.email);
            setToken(session.token);
            setUser(canonicalizeUser(session.user));
          }
        } else {
          console.log('[auth] no saved session found');
        }
      } catch (err) {
        console.warn('[auth] session restore error:', err);
      } finally {
        setLoading(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const applySession = async (nextToken: string, nextUser: User) => {
    const userCanonical = canonicalizeUser(nextUser);
    console.log('[auth] applying session for', userCanonical?.email);
    setToken(nextToken);
    setUser(userCanonical);
    try {
      await saveSession(nextToken, userCanonical);
      console.log('[auth] session saved successfully');
    } catch (err) {
      console.warn('[auth] saveSession error:', err);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/profile/me');
      const next = data?.user || data?.data || data;
      if (!next || (!next.email && !next.role && !next._id && !next.id)) return;
      setUser((prev) => {
        const merged = canonicalizeUser({
          ...prev,
          ...next,
          id: next.id || next._id || prev?.id,
        });
        void saveSession(token || '', merged);
        return merged;
      });
    } catch {
      /* keep cached session if offline */
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      console.log('[auth] login attempt for', email);
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requireMfa) {
        return {
          success: false,
          error: 'MFA code required',
          requireMfa: true,
          userId: data.userId,
          mfaType: data.mfaType,
        };
      }
      await applySession(data.token, data.user);
      console.log('[auth] login succeeded');
      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Login failed';
      console.warn('[auth] login failed:', msg, 'status:', error.response?.status);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const verifyMfa = async (userId: string, otp: string): Promise<LoginResult> => {
    try {
      const { data } = await api.post('/auth/mfa/verify', { userId, code: otp });
      await applySession(data.token, data.user);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Invalid verification code',
      };
    }
  };

  const switchActiveLab = async (labId: string) => {
    try {
      const { data } = await api.post('/labs/switch', { labId });
      if (data.user) {
        setUser(data.user);
        await saveSession(data.token || token || '', data.user);
      }
      if (data.token) {
        setToken(data.token);
        await saveSession(data.token, data.user || user);
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || 'Failed to switch lab',
      };
    }
  };

  const updateUser = async (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void saveSession(token || '', next);
      return next;
    });
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const role = normalizeRole(user.role) || user.role;
    return (rolePermissions[role] || rolePermissions[user.role] || []).includes(permission);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      verifyMfa,
      logout,
      switchActiveLab,
      hasPermission,
      updateUser,
      refreshUser,
    }),
    [user, token, loading, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
