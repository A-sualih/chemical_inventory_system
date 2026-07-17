import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import type { Chemical } from '../types';
import { Badge, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function ChemicalsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [items, setItems] = useState<Chemical[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/chemicals', {
        params: search ? { search } : undefined,
      });
      const list = Array.isArray(data) ? data : data.chemicals || data.data || [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <Screen>
      <Title>Chemicals</Title>
      <Subtitle>Same inventory API as the web app</Subtitle>
      <Input
        placeholder="Search name, CAS, or ID…"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item._id || item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading ? <EmptyState title="No chemicals found" body="Try another search or switch lab." /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ChemicalDetail', { id: item.id || item._id })}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {item.id}
                {item.cas_number ? ` · CAS ${item.cas_number}` : ''}
              </Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {item.quantity ?? '—'} {item.unit || ''}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
            </View>
            <Badge
              label={item.status || 'OK'}
              tone={
                String(item.status || '').toLowerCase().includes('out')
                  ? 'danger'
                  : String(item.status || '').toLowerCase().includes('low')
                    ? 'warn'
                    : 'ok'
              }
            />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontWeight: '800', fontSize: 16 },
  meta: { fontSize: 12, marginTop: 3 },
});
