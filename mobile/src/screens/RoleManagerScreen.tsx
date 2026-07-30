import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { isAdmin } from '../utils/roles';
import { Badge, Button, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const ROLES = ['Admin', 'Lab Manager', 'Lab Technician', 'Safety Officer', 'Viewer / Auditor'];

const ROLE_LEGEND: Array<{ role: string; desc: string; tone: string }> = [
  { role: 'ADMIN', desc: 'Highest authority. Total system control and audit review.', tone: '#ef4444' },
  { role: 'LAB MANAGER', desc: 'Operations head. Stock management and request approval.', tone: '#8b5cf6' },
  { role: 'LAB TECHNICIAN', desc: 'Frontline scientist. Record transactions and requests.', tone: '#22c55e' },
  { role: 'SAFETY OFFICER', desc: 'Compliance lead. Risk assessment and reporting.', tone: '#f59e0b' },
  { role: 'VIEWER / AUDITOR', desc: 'Restricted read-only access for compliance and stock audit.', tone: '#64748b' },
];

const MASTER_EMAIL = 'chemicalinventorysystem@gmail.com';

export default function RoleManagerScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user: me, refreshUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleTarget, setRoleTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(asList(data, ['users', 'data']));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin(me?.role)) {
    return (
      <Screen>
        <Title>Role Manager</Title>
        <Subtitle>Only Admins can assign roles.</Subtitle>
      </Screen>
    );
  }

  const myId = String(me?.id || (me as any)?._id || '');
  const iAmAdmin = isAdmin(me?.role);

  const isProtectedMaster = (u: any) => u.email === MASTER_EMAIL;
  const isSelf = (u: any) => String(u._id || u.id || '') === myId;
  const roleLocked = (u: any) => isProtectedMaster(u) || isSelf(u) || (u.role === 'Admin' && !iAmAdmin);

  const applyRole = async (user: any, role: string) => {
    const targetId = String(user._id || user.id || '');
    if (targetId && targetId === myId) {
      await dialog.alert('Not allowed', 'You cannot change your own role. Ask another Admin.');
      return;
    }
    if (user.role === 'Admin' && !iAmAdmin) {
      await dialog.alert('Not allowed', 'Only an Admin can modify another Admin.');
      return;
    }
    if (role === 'Admin' && !iAmAdmin) {
      await dialog.alert('Not allowed', 'Only an Admin can assign the Admin role.');
      return;
    }
    try {
      await api.put(`/auth/users/${user._id || user.id}/role`, { role });
      setRoleTarget(null);
      await load();
      await refreshUser();
      await dialog.alert('Role updated', `${user.name} is now ${role}`);
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Role update failed');
    }
  };

  const resetPassword = async (user: any) => {
    if (isProtectedMaster(user)) {
      await dialog.alert('Protected', 'Master account cannot be reset here.');
      return;
    }
    const ok = await dialog.confirm({
      title: 'Reset password',
      message: `Generate a temporary password for ${user.name}?`,
      confirmLabel: 'Reset',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    try {
      const { data } = await api.put(`/auth/users/${user._id || user.id}/reset-password`);
      await dialog.alert('Temporary password', data.tempPassword || 'Password reset.');
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Reset failed');
    }
  };

  const toggleStatus = async (user: any) => {
    if (isSelf(user)) {
      await dialog.alert('Not allowed', 'You cannot deactivate your own account.');
      return;
    }
    if (isProtectedMaster(user)) {
      await dialog.alert('Protected', 'Master account status is locked.');
      return;
    }
    const next = String(user.status).toLowerCase() === 'inactive' ? 'Active' : 'Inactive';
    const ok = await dialog.confirm({
      title: next === 'Inactive' ? 'Suspend' : 'Verify',
      message: `${next} ${user.name}?`,
      confirmLabel: next === 'Inactive' ? 'Suspend' : 'Activate',
      cancelLabel: 'Cancel',
      danger: next === 'Inactive',
    });
    if (!ok) return;
    try {
      await api.put(`/auth/users/${user._id || user.id}/status`, { status: next });
      await load();
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Status update failed');
    }
  };

  const scrub = async (user: any) => {
    if (isSelf(user)) {
      await dialog.alert('Not allowed', 'You cannot scrub your own account.');
      return;
    }
    if (isProtectedMaster(user)) {
      await dialog.alert('Protected', 'Master account cannot be deleted.');
      return;
    }
    const ok = await dialog.confirm({
      title: 'Scrub user',
      message: `Permanently delete ${user.name}? This cannot be undone.`,
      confirmLabel: 'Scrub',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/auth/users/${user._id || user.id}`);
      await load();
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Delete failed');
    }
  };

  const wipeAll = async () => {
    const ok = await dialog.confirm({
      title: 'System purge',
      message: 'Delete ALL non-protected users? This is irreversible.',
      confirmLabel: 'Purge',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.post('/auth/users/wipe-all');
      await load();
      await dialog.alert('Done', 'User directory purged.');
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Purge failed');
    }
  };

  const activeCount = users.filter(
    (u) => String(u.status || 'Active').toLowerCase() !== 'inactive'
  ).length;

  const header = (
    <View>
      <Title>Role Management</Title>
      <Subtitle>Configure permissions · {activeCount} active accounts</Subtitle>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, styles.tabOn]}>
          <Text style={styles.tabTextOn}>User Roles</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => navigation.navigate('Audit')}>
          <Text style={styles.tabText}>Master Audit</Text>
        </Pressable>
      </View>

      <Text style={styles.dirTitle}>Personnel Directory</Text>
    </View>
  );

  return (
    <Screen>
      <FlatList
        style={{ flex: 1 }}
        data={users}
        keyExtractor={(item) => String(item._id || item.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={!loading ? <EmptyState title="No users found" /> : null}
        ListFooterComponent={
          <View style={styles.legend}>
            <Text style={styles.dirTitle}>Access Authority</Text>
            {ROLE_LEGEND.map((r) => (
              <View key={r.role} style={styles.legendRow}>
                <Text style={[styles.legendRole, { color: r.tone }]}>{r.role}</Text>
                <Text style={styles.legendDesc}>{r.desc}</Text>
              </View>
            ))}
            <Button label="System purge" variant="danger" onPress={() => void wipeAll()} />
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        renderItem={({ item }) => {
          const inactive = String(item.status).toLowerCase() === 'inactive';
          const locked = roleLocked(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(item.name || '?')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                <Badge label={inactive ? 'Inactive' : 'Active'} tone={inactive ? 'warn' : 'ok'} />
              </View>

              <Text style={styles.label}>Authority level</Text>
              <Pressable
                disabled={locked}
                onPress={() => setRoleTarget(item)}
                style={[styles.roleBtn, locked && { opacity: 0.45 }]}
              >
                <Text style={styles.roleBtnText}>{item.role || '—'}</Text>
                <Text style={{ color: colors.accent, fontWeight: '800' }}>
                  {locked ? 'Locked' : 'Change'}
                </Text>
              </Pressable>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: '#fff7ed' }]}
                  onPress={() => void resetPassword(item)}
                >
                  <Text style={[styles.actionText, { color: '#ea580c' }]}>Reset</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
                  onPress={() => void toggleStatus(item)}
                >
                  <Text style={[styles.actionText, { color: colors.muted }]}>
                    {inactive ? 'Verify' : 'Suspend'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
                  onPress={() => void scrub(item)}
                >
                  <Text style={[styles.actionText, { color: colors.danger }]}>Scrub</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={!!roleTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRoleTarget(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Assign role</Text>
            <Text style={styles.meta}>{roleTarget?.name}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {ROLES.map((role) => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleOption,
                    roleTarget?.role === role && {
                      borderColor: colors.accent,
                      backgroundColor: colors.accentSoft,
                    },
                  ]}
                  onPress={() => void applyRole(roleTarget, role)}
                >
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{role}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Cancel" variant="ghost" onPress={() => setRoleTarget(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface2,
      borderRadius: 999,
      padding: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 1,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
    tabOn: { backgroundColor: colors.surface },
    tabText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    tabTextOn: { color: colors.text, fontWeight: '800', fontSize: 12 },
    dirTitle: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.accent, fontWeight: '900' },
    name: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    label: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    roleBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.surface2,
      marginBottom: 12,
    },
    roleBtnText: { color: colors.text, fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    actionText: { fontWeight: '800', fontSize: 12 },
    legend: {
      marginTop: 8,
      marginBottom: 24,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    legendRow: { marginBottom: 12 },
    legendRole: { fontWeight: '900', fontSize: 12, marginBottom: 2 },
    legendDesc: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 4 },
    roleOption: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginTop: 8,
      backgroundColor: colors.surface2,
    },
  });
}
