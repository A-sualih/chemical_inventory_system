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
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { isAdmin } from '../utils/roles';
import { Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

function normalizeLabIds(labs: any): string[] {
  if (!Array.isArray(labs)) return [];
  return labs.map((l) => String(typeof l === 'object' ? l._id || l.id : l)).filter(Boolean);
}

function roleChipStyle(role: string | undefined, colors: ThemeColors) {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin')) {
    return { bg: colors.accent2, fg: '#fff' };
  }
  if (r.includes('manager')) {
    return { bg: colors.accent, fg: colors.btnText };
  }
  if (r.includes('safety')) {
    return { bg: colors.warn, fg: '#fff' };
  }
  if (r.includes('technician') || r.includes('tech')) {
    return { bg: colors.success, fg: '#fff' };
  }
  if (r.includes('viewer') || r.includes('auditor')) {
    return { bg: colors.muted, fg: '#fff' };
  }
  return { bg: colors.surface2, fg: colors.text };
}

export default function LabManagementScreen() {
  const { colors } = useTheme();
  const { user: me } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<'facilities' | 'access'>('facilities');
  const [labs, setLabs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [labToDelete, setLabToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [labsRes, usersRes] = await Promise.all([
        api.get('/labs', { params: { all: true } }),
        api.get('/auth/users').catch(() => ({ data: [] })),
      ]);
      setLabs(asList(labsRes.data, ['labs', 'data']));
      setUsers(asList(usersRes.data, ['users', 'data']));
    } catch {
      setLabs([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setMsg('');
    if (!name.trim()) {
      setMsg('Lab name is required.');
      return;
    }
    try {
      await api.post('/labs', {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setMsg('Facility provisioned.');
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || e.response?.data?.message || 'Create failed');
    }
  };

  const confirmDecommission = async () => {
    if (!labToDelete) return;
    const id = labToDelete._id || labToDelete.id;
    if (!id) {
      setErrorMsg('Missing lab id.');
      return;
    }
    setDeleting(true);
    setErrorMsg('');
    try {
      await api.delete(`/labs/${id}`);
      setLabToDelete(null);
      setMsg(`Decommissioned ${labToDelete.name}.`);
      await load();
    } catch (e: any) {
      setErrorMsg(
        e.response?.data?.message || e.response?.data?.error || 'Delete failed'
      );
    } finally {
      setDeleting(false);
    }
  };

  const toggleUserLab = async (targetUser: any, labId: string) => {
    const userId = targetUser._id || targetUser.id;
    const current = normalizeLabIds(targetUser.labs);
    const next = current.includes(labId)
      ? current.filter((id) => id !== labId)
      : [...current, labId];
    try {
      await api.put('/labs/assign', { userId, labs: next });
      setUsers((prev) =>
        prev.map((u) =>
          String(u._id || u.id) === String(userId) ? { ...u, labs: next } : u
        )
      );
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.response?.data?.error || 'Assign failed');
    }
  };

  return (
    <Screen>
      <Title>Labs & Depts</Title>
      <Subtitle>Facilities and Facility Access for each user</Subtitle>

      <View style={styles.tabs}>
        {([
          ['facilities', 'System Facilities'],
          ['access', 'Facility Access'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'facilities' ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        >
          <View style={styles.form}>
            <Text style={styles.label}>Department / lab name</Text>
            <Input placeholder="e.g. Molecular Synthesis Lab" value={name} onChangeText={setName} />
            <Text style={styles.label}>Description & scope</Text>
            <Input
              placeholder="Operational parameters…"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
            <Button label="Provision lab" onPress={() => void create()} />
            {msg ? <Text style={styles.ok}>{msg}</Text> : null}
          </View>

          {labs.length === 0 && !loading ? <EmptyState title="No facilities provisioned" /> : null}
          {labs.map((item) => (
            <View key={item._id} style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.description || 'No operational parameters defined.'}</Text>
              <View style={styles.actionRow}>
                <View style={styles.statusBtn}>
                  <Text style={styles.statusBtnText}>{String(item.status || 'Active').toUpperCase()}</Text>
                </View>
                {isAdmin(me?.role) ? (
                  <Pressable
                    style={styles.decommissionBtn}
                    onPress={() => {
                      setErrorMsg('');
                      setLabToDelete(item);
                    }}
                  >
                    <Text style={styles.decommissionBtnText}>Decommission</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item._id || item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
          ListEmptyComponent={!loading ? <EmptyState title="No users" /> : null}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item: u }) => {
            const assigned = normalizeLabIds(u.labs);
            return (
              <View style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(u.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {u.email}
                    </Text>
                    <View
                      style={[
                        styles.roleChip,
                        { backgroundColor: roleChipStyle(u.role, colors).bg },
                      ]}
                    >
                      <Text
                        style={[styles.roleChipText, { color: roleChipStyle(u.role, colors).fg }]}
                        numberOfLines={1}
                      >
                        {String(u.role || '—').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.accessHeader}>Facility Access</Text>
                {labs.length === 0 ? (
                  <Text style={styles.meta}>No facilities available for assignment.</Text>
                ) : (
                  labs.map((lab) => {
                    const on = assigned.includes(String(lab._id));
                    return (
                      <Pressable
                        key={lab._id}
                        onPress={() => void toggleUserLab(u, String(lab._id))}
                        style={[styles.toggleRow, on && styles.toggleRowOn]}
                      >
                        <Text style={[styles.toggleLabel, on && { color: colors.text }]}>{lab.name}</Text>
                        <View style={[styles.pill, on && styles.pillOn]}>
                          <View style={[styles.pillDot, on && styles.pillDotOn]} />
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            );
          }}
        />
      )}

      {errorMsg && !labToDelete ? (
        <Text style={styles.errorBanner}>{errorMsg}</Text>
      ) : null}

      <Modal
        visible={!!labToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setLabToDelete(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decommission facility</Text>
            <Text style={styles.modalBody}>
              Permanently delete <Text style={{ fontWeight: '900' }}>{labToDelete?.name}</Text>?
              This may remove related inventory access mappings.
            </Text>
            {errorMsg ? <Text style={styles.modalError}>{errorMsg}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                disabled={deleting}
                onPress={() => {
                  setErrorMsg('');
                  setLabToDelete(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, deleting && { opacity: 0.6 }]}
                disabled={deleting}
                onPress={() => void confirmDecommission()}
              >
                <Text style={styles.modalConfirmText}>
                  {deleting ? 'Deleting…' : 'Decommission'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
    },
    tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    tabText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    tabTextOn: { color: colors.accent },
    form: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 14,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    row: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10,
      gap: 8,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
    },
    statusBtn: {
      flex: 1,
      backgroundColor: colors.success,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 15,
      letterSpacing: 0.3,
    },
    decommissionBtn: {
      flex: 1,
      backgroundColor: colors.danger,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    decommissionBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 15,
      letterSpacing: 0.3,
    },
    userCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 12,
    },
    userHeader: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.accent, fontWeight: '900', fontSize: 18 },
    name: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 17 },
    roleChip: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    roleChipText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    accessHeader: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      marginBottom: 8,
    },
    toggleRowOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    toggleLabel: { color: colors.muted, fontWeight: '700', flex: 1, paddingRight: 8 },
    pill: {
      width: 44,
      height: 26,
      borderRadius: 999,
      backgroundColor: colors.border,
      padding: 3,
      justifyContent: 'center',
    },
    pillOn: { backgroundColor: colors.accent },
    pillDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
      alignSelf: 'flex-start',
    },
    pillDotOn: { alignSelf: 'flex-end' },
    ok: { color: colors.accent, marginTop: 8, fontWeight: '700' },
    errorBanner: {
      color: colors.danger,
      fontWeight: '700',
      marginTop: 8,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: '#1f2937',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#374151',
      padding: 20,
    },
    modalTitle: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 17,
      marginBottom: 8,
    },
    modalBody: {
      color: '#e5e7eb',
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    modalError: {
      color: '#fca5a5',
      fontWeight: '700',
      fontSize: 13,
      marginBottom: 12,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    modalCancel: {
      backgroundColor: '#374151',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    modalCancelText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    modalConfirm: {
      backgroundColor: colors.danger,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  });
}
