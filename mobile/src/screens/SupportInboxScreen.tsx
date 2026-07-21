import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { Badge, Button, EmptyState, Screen, Subtitle, Title } from '../components/ui';

export default function SupportInboxScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/support');
      setItems(asList(data, ['tickets', 'support', 'data']));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await api.put(`/support/${id}/status`, { status });
      await load();
    } catch (e: any) {
      Alert.alert('Support', e.response?.data?.error || 'Update failed');
    }
  };

  return (
    <Screen>
      <Title>Support Inbox</Title>
      <Subtitle>Admin only — public contact tickets</Subtitle>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="Inbox empty" /> : null}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.subject || 'Ticket'}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {[item.fullName || item.name, item.email, item.priority].filter(Boolean).join(' · ')}
              </Text>
              <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={3}>
                {item.message}
              </Text>
              {String(item.status || 'open').toLowerCase() !== 'closed' ? (
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button label="Mark resolved" onPress={() => void setStatus(item._id, 'resolved')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Close" variant="ghost" onPress={() => void setStatus(item._id, 'closed')} />
                  </View>
                </View>
              ) : null}
            </View>
            <Badge label={item.status || 'open'} tone={toneForStatus(item.status)} />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 10 },
  name: { fontWeight: '800', fontSize: 15 },
  meta: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
