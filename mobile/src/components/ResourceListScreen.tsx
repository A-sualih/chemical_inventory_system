import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { Badge, EmptyState, Input, Screen, Subtitle, Title } from './ui';

type Props = {
  title: string;
  subtitle?: string;
  endpoint: string;
  listKeys?: string[];
  searchParam?: string;
  keyExtractor: (item: any) => string;
  primary: (item: any) => string;
  secondary?: (item: any) => string;
  status?: (item: any) => string | undefined;
  onPress?: (item: any) => void;
  params?: Record<string, string | number | undefined>;
  headerExtra?: React.ReactNode;
};

export default function ResourceListScreen({
  title,
  subtitle,
  endpoint,
  listKeys = [],
  searchParam = 'search',
  keyExtractor,
  primary,
  secondary,
  status,
  onPress,
  params,
  headerExtra,
}: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(endpoint, {
        params: {
          ...params,
          ...(search.trim() ? { [searchParam]: search.trim() } : {}),
        },
      });
      setItems(asList(data, listKeys));
    } catch (e: any) {
      setItems([]);
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [endpoint, listKeys, params, search, searchParam]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <Screen>
      <Title>{title}</Title>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : <View style={{ height: 8 }} />}
      {headerExtra}
      <Input
        placeholder="Search…"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      {error ? <Text style={{ color: colors.danger, marginBottom: 8, fontWeight: '600' }}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={!loading ? <EmptyState title="Nothing here" body={error || 'Pull to refresh.'} /> : null}
        renderItem={({ item }) => {
          const st = status?.(item);
          const body = (
            <View
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{primary(item)}</Text>
                {secondary ? (
                  <Text style={[styles.meta, { color: colors.muted }]}>{secondary(item)}</Text>
                ) : null}
              </View>
              {st ? <Badge label={st} tone={toneForStatus(st)} /> : null}
            </View>
          );
          if (!onPress) return body;
          return <Pressable onPress={() => onPress(item)}>{body}</Pressable>;
        }}
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
  name: { fontWeight: '800', fontSize: 15 },
  meta: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
