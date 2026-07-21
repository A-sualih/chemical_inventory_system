import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { isAdmin } from '../utils/roles';
import { Badge, EmptyState, Screen, Subtitle, Title } from '../components/ui';

const ROLES = ['Admin', 'Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'];

export default function RoleManagerScreen() {
  const { colors } = useTheme();
  const { user: me, refreshUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
        <Subtitle>Only Admins can assign roles. Ask another Admin if you need access.</Subtitle>
      </Screen>
    );
  }

  const myId = String(me?.id || (me as any)?._id || '');

  const changeRole = (user: any) => {
    const targetId = String(user._id || user.id || '');
    if (targetId && targetId === myId) {
      Alert.alert('Not allowed', 'You cannot change your own role. Ask another Admin.');
      return;
    }
    Alert.alert('Assign role', user.name || user.email, [
      ...ROLES.map((role) => ({
        text: role,
        onPress: async () => {
          try {
            await api.put(`/auth/users/${user._id || user.id}/role`, { role });
            await load();
            await refreshUser();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Role update failed');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleStatus = async (user: any) => {
    const targetId = String(user._id || user.id || '');
    if (targetId && targetId === myId) {
      Alert.alert('Not allowed', 'You cannot deactivate your own account.');
      return;
    }
    const next = String(user.status).toLowerCase() === 'inactive' ? 'Active' : 'Inactive';
    try {
      await api.put(`/auth/users/${user._id || user.id}/status`, { status: next });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Status update failed');
    }
  };

  return (
    <Screen>
      <Title>Role Manager</Title>
      <Subtitle>Admin only — role changes require another Admin for your own account</Subtitle>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id || item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No users found" /> : null}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>{item.email}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => changeRole(item)}>
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>Change role</Text>
                </Pressable>
                <Pressable onPress={() => void toggleStatus(item)}>
                  <Text style={{ color: colors.warn, fontWeight: '800' }}>
                    {String(item.status).toLowerCase() === 'inactive' ? 'Activate' : 'Deactivate'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <Badge label={item.role || '—'} tone="muted" />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 10 },
  name: { fontWeight: '800', fontSize: 15 },
  meta: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
});
