import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import type { AppNotification } from '../types';
import { Badge, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      const list = Array.isArray(data) ? data : data.notifications || data.data || [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* ignore */
    }
  };

  return (
    <Screen>
      <Title>Notifications</Title>
      <Subtitle>Lab-scoped alerts from the same API</Subtitle>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={!loading ? <EmptyState title="No notifications" /> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => void markRead(item._id)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title || item.type || 'Alert'}</Text>
              <Text style={styles.body}>{item.message}</Text>
              {item.createdAt ? (
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
              ) : null}
            </View>
            <Badge label={item.is_read ? 'Read' : 'New'} tone={item.is_read ? 'muted' : 'warn'} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  body: { color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  time: { color: colors.muted, marginTop: 6, fontSize: 11 },
});
