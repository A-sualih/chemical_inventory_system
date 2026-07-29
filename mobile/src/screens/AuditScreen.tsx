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
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'TRANSFER', 'LOGIN'];
const ENTITIES = ['', 'chemical', 'stock', 'request', 'user'];

export default function AuditScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit', {
        params: {
          page,
          limit: 20,
          user: search.trim() || undefined,
          action: action || undefined,
          targetType: targetType || undefined,
        },
      });
      setLogs(asList(data, ['logs', 'audit', 'data']));
      setTotal(data?.total || 0);
      setPages(data?.pages || 1);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, action, targetType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Title>Security Ledger</Title>
      <Subtitle>
        Immutable audit chain · {total} events
      </Subtitle>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search operator…"
        onSubmitEditing={() => {
          setPage(1);
          void load();
        }}
        returnKeyType="search"
      />

      <Text style={styles.filterLabel}>Action</Text>
      <View style={styles.chips}>
        {ACTIONS.map((a) => (
          <Pressable
            key={a || 'all-a'}
            onPress={() => {
              setAction(a);
              setPage(1);
            }}
            style={[styles.chip, action === a && styles.chipOn]}
          >
            <Text style={[styles.chipText, action === a && styles.chipTextOn]}>
              {a || 'All actions'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.filterLabel}>Entity</Text>
      <View style={styles.chips}>
        {ENTITIES.map((e) => (
          <Pressable
            key={e || 'all-e'}
            onPress={() => {
              setTargetType(e);
              setPage(1);
            }}
            style={[styles.chip, targetType === e && styles.chipOn]}
          >
            <Text style={[styles.chipText, targetType === e && styles.chipTextOn]}>
              {e || 'All entities'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button
        label="Search"
        onPress={() => {
          setPage(1);
          void load();
        }}
      />

      <FlatList
        style={{ marginTop: 12 }}
        data={logs}
        keyExtractor={(item, i) => item._id || `${item.action}-${item.createdAt}-${i}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No audit events" /> : null}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const id = String(item._id || `${item.action}-${item.createdAt}`);
          const open = expanded === id;
          return (
            <Pressable
              onPress={() => setExpanded(open ? null : id)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Badge label={item.action || item.type || 'EVENT'} tone="muted" />
                <Text style={styles.time}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                </Text>
              </View>
              <Text style={styles.primary}>
                {item.user_name || item.user?.name || item.email || 'System'}
              </Text>
              <Text style={styles.meta} numberOfLines={open ? undefined : 2}>
                {item.details || item.message || '—'}
              </Text>
              {open ? (
                <View style={styles.detail}>
                  <Text style={styles.meta}>Role: {item.role || item.user?.role || '—'}</Text>
                  <Text style={styles.meta}>
                    Target: {item.targetType || item.target_type || '—'}{' '}
                    {item.targetId || item.target_id || ''}
                  </Text>
                  <Text style={styles.meta}>IP: {item.ip || '—'}</Text>
                  <Text style={styles.meta} numberOfLines={3}>
                    UA: {item.userAgent || item.user_agent || '—'}
                  </Text>
                  {item.success === false ? <Badge label="Failure" tone="danger" /> : null}
                </View>
              ) : null}
            </Pressable>
          );
        }}
        ListFooterComponent={
          pages > 1 ? (
            <View style={styles.pager}>
              <Button
                label="Previous"
                variant="ghost"
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text style={styles.meta}>
                Page {page} / {pages}
              </Text>
              <Button
                label="Next"
                variant="ghost"
                disabled={page >= pages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    filterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 4,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    chipText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
    chipTextOn: { color: colors.accent },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    time: { color: colors.muted, fontSize: 11 },
    primary: { color: colors.text, fontWeight: '800', marginTop: 8 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    detail: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 8,
    },
  });
}
