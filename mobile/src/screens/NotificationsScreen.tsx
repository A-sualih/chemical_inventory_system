import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import {
  NOTIFICATION_TYPE_LABELS,
  roleNotificationTypes,
} from '../constants/notifications';
import { EmptyState, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';
import type { AppNotification } from '../types';

const SEVERITIES = ['', 'critical', 'high', 'medium', 'low'];
const STATUSES = ['', 'unread', 'read', 'dismissed'];

function severityTone(sev: string, colors: ThemeColors) {
  const s = sev.toLowerCase();
  if (s === 'critical') return { bg: colors.danger, fg: '#fff' };
  if (s === 'high') return { bg: colors.warn, fg: '#fff' };
  if (s === 'medium') return { bg: colors.accent2, fg: '#fff' };
  if (s === 'low') return { bg: colors.success, fg: '#fff' };
  return { bg: colors.muted, fg: '#fff' };
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const roleTypes = roleNotificationTypes(user?.role);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [testType, setTestType] = useState(roleTypes[0] || 'SYSTEM');
  const [toast, setToast] = useState('');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setItems(asList(data, ['notifications', 'data']) as AppNotification[]);
      if (!opts?.silent) {
        setToast('Alerts refreshed.');
        setTimeout(() => setToast(''), 2500);
      }
    } catch {
      if (!opts?.silent) {
        setToast('Refresh failed — check connection.');
        setTimeout(() => setToast(''), 3500);
      }
      /* keep previous items on error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ silent: true });
  }, [load]);

  const filtered = items.filter((n: any) => {
    if (typeFilter && String(n.type || '') !== typeFilter) return false;
    if (severity && String(n.severity || '').toLowerCase() !== severity.toLowerCase()) return false;
    const st = String(n.status || (n.is_read ? 'read' : 'unread')).toLowerCase();
    if (status && st !== status.toLowerCase()) return false;
    return true;
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true, status: 'read' as any } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const dismiss = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/dismiss`);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: 'dismissed' as any, is_read: true } : n))
      );
    } catch (e: any) {
      await dialog.alert('Dismiss', e.response?.data?.error || 'Failed');
    }
  };

  const testAlert = async () => {
    try {
      await api.post(`/notifications/test/${encodeURIComponent(testType.trim() || 'SYSTEM')}`);
      showToast(`[${testType}] test alert fired.`);
      await load({ silent: true });
    } catch (e: any) {
      await dialog.alert('Test alert', e.response?.data?.error || 'Failed to trigger test alert');
    }
  };

  const cleanup = async () => {
    const ok = await dialog.confirm({
      title: 'Cleanup old alerts',
      message: 'Delete read and dismissed notifications older than 30 days?',
      confirmLabel: 'Cleanup',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete('/notifications/cleanup');
      showToast('Cleanup complete.');
      await load({ silent: true });
    } catch (e: any) {
      await dialog.alert('Cleanup', e.response?.data?.error || 'Cleanup failed');
    }
  };

  const header = (
    <View style={styles.headerBlock}>
      <Title>Notification Center</Title>
      <Subtitle>Manage your alerts, safety warnings, and security events.</Subtitle>

      <Text style={styles.filterLabel}>Test type</Text>
      <ChipRow
        options={roleTypes}
        value={testType}
        onChange={setTestType}
        labelFn={(t) => NOTIFICATION_TYPE_LABELS[t] || t}
        colors={colors}
        styles={styles}
      />

      <View style={styles.actionRow}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => void testAlert()}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>Test alert</Text>
        </Pressable>
        <Pressable
          style={[styles.ghostBtn, loading && { opacity: 0.6 }]}
          onPress={() => void load()}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.ghostBtnText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.ghostBtn, styles.cleanupBtn]}
        onPress={() => void cleanup()}
        accessibilityRole="button"
      >
        <Text style={styles.ghostBtnText}>Cleanup old alerts</Text>
      </Pressable>

      {toast ? <Text style={styles.toast}>{toast}</Text> : null}

      <Text style={styles.filterLabel}>Alert type</Text>
      <ChipRow
        options={['', ...roleTypes]}
        value={typeFilter}
        onChange={setTypeFilter}
        labelFn={(t) => (t ? NOTIFICATION_TYPE_LABELS[t] || t : 'All types')}
        colors={colors}
        styles={styles}
      />

      <Text style={styles.filterLabel}>Severity</Text>
      <ChipRow
        options={SEVERITIES}
        value={severity}
        onChange={setSeverity}
        labelFn={(s) => s || 'All severities'}
        colors={colors}
        styles={styles}
      />

      <Text style={styles.filterLabel}>Status</Text>
      <ChipRow
        options={STATUSES}
        value={status}
        onChange={setStatus}
        labelFn={(s) => s || 'All status'}
        colors={colors}
        styles={styles}
      />
    </View>
  );

  return (
    <Screen>
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void load()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          !loading ? (
            <EmptyState title="Inbox is empty" body="No alerts matching your criteria." />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        renderItem={({ item }) => {
          const n = item as any;
          const sev = String(n.severity || '').toLowerCase();
          const read = n.is_read || String(n.status).toLowerCase() === 'read';
          const dismissed = String(n.status).toLowerCase() === 'dismissed';
          const typeLabel = NOTIFICATION_TYPE_LABELS[n.type] || n.type;
          const sevStyle = severityTone(sev, colors);

          return (
            <View style={[styles.card, !read && styles.cardUnread]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {n.title || typeLabel || 'Alert'}
                </Text>
                {sev ? (
                  <View style={[styles.sevPill, { backgroundColor: sevStyle.bg }]}>
                    <Text style={[styles.sevPillText, { color: sevStyle.fg }]}>
                      {sev.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              {n.type ? (
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{typeLabel}</Text>
                </View>
              ) : null}

              <Text style={styles.body}>{n.message}</Text>
              {n.related?.chemicalName ? (
                <Text style={styles.related}>Chemical: {n.related.chemicalName}</Text>
              ) : null}
              {n.related?.containerId ? (
                <Text style={styles.related}>Container: {n.related.containerId}</Text>
              ) : null}
              {n.createdAt ? (
                <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
              ) : null}

              {!dismissed ? (
                <View style={styles.actions}>
                  {!read ? (
                    <Pressable style={styles.primaryBtn} onPress={() => void markRead(n._id)}>
                      <Text style={styles.primaryBtnText}>Mark read</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.dismissBtn} onPress={() => void dismiss(n._id)}>
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.sevPill, { backgroundColor: colors.muted, alignSelf: 'flex-start', marginTop: 12 }]}>
                  <Text style={[styles.sevPillText, { color: '#fff' }]}>DISMISSED</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  labelFn,
  styles,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelFn: (v: string) => string;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <Pressable
            key={opt || 'all'}
            onPress={() => onChange(opt)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {labelFn(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerBlock: { marginBottom: 4, zIndex: 2 },
    listContent: { paddingBottom: 48, flexGrow: 1 },
    toast: { color: colors.success, fontWeight: '800', marginBottom: 8 },
    filterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 6,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    chip: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chipText: { color: colors.muted, fontWeight: '700', fontSize: 12, lineHeight: 16 },
    chipTextOn: { color: colors.accent },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      zIndex: 3,
      position: 'relative',
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      cursor: 'pointer' as any,
    },
    primaryBtnText: { color: colors.btnText, fontWeight: '800', fontSize: 13 },
    ghostBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
      cursor: 'pointer' as any,
    },
    cleanupBtn: {
      flex: 0,
      width: '100%',
      marginBottom: 12,
      zIndex: 3,
    },
    ghostBtnText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
    dismissBtn: {
      flex: 1,
      backgroundColor: colors.danger,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardUnread: { borderLeftColor: colors.accent },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
    sevPill: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    },
    sevPillText: { fontWeight: '800', fontSize: 10, letterSpacing: 0.4 },
    typePill: {
      alignSelf: 'flex-start',
      marginTop: 8,
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typePillText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
    body: { color: colors.text, marginTop: 10, fontSize: 13, lineHeight: 19 },
    related: { color: colors.muted, fontSize: 11, marginTop: 4 },
    time: { color: colors.muted, marginTop: 8, fontSize: 11 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  });
}
