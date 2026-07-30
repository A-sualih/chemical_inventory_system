import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { EmptyState, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const STATUS_FILTERS = ['', 'Pending', 'In Progress', 'Resolved', 'Closed'];

function statusColors(status: string, colors: ThemeColors) {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved') return { bg: colors.success, fg: '#fff' };
  if (s === 'closed') return { bg: colors.muted, fg: '#fff' };
  if (s.includes('progress')) return { bg: colors.accent2, fg: '#fff' };
  if (s === 'pending') return { bg: colors.warn, fg: '#fff' };
  return { bg: colors.accent, fg: colors.btnText };
}

export default function SupportInboxScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/support', {
        params: { status: statusFilter || undefined },
      });
      setItems(asList(data, ['tickets', 'support', 'data']));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await api.put(`/support/${id}/status`, { status });
      await load();
    } catch (e: any) {
      await dialog.alert('Support', e.response?.data?.error || 'Update failed');
    }
  };

  return (
    <Screen>
      <Title>Support Inbox</Title>
      <Subtitle>Admin only — public contact tickets</Subtitle>

      <View style={styles.chips}>
        {STATUS_FILTERS.map((s) => (
          <Pressable
            key={s || 'all'}
            onPress={() => setStatusFilter(s)}
            style={[styles.chip, statusFilter === s && styles.chipOn]}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextOn]}>
              {s || 'All'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={!loading ? <EmptyState title="Inbox empty" /> : null}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const status = item.status || 'Pending';
          const closed = String(status).toLowerCase() === 'closed';
          const resolved = String(status).toLowerCase() === 'resolved';
          const pending = String(status).toLowerCase() === 'pending';
          const tone = statusColors(status, colors);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.subject} numberOfLines={2}>
                  {item.subject || 'Ticket'}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusPillText, { color: tone.fg }]}>
                    {String(status).toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.meta}>
                {[item.fullName || item.name, item.email, item.priority].filter(Boolean).join(' · ')}
              </Text>
              {item.department || item.lab ? (
                <Text style={styles.meta}>{item.department || item.lab}</Text>
              ) : null}
              <Text style={styles.body} numberOfLines={4}>
                {item.message}
              </Text>
              {item.createdAt ? (
                <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
              ) : null}

              {!closed ? (
                <View style={styles.actions}>
                  {pending ? (
                    <Pressable
                      style={styles.progressBtn}
                      onPress={() => void setStatus(item._id, 'In Progress')}
                    >
                      <Text style={styles.progressBtnText}>In progress</Text>
                    </Pressable>
                  ) : null}
                  {!resolved ? (
                    <Pressable
                      style={styles.resolveBtn}
                      onPress={() => void setStatus(item._id, 'Resolved')}
                    >
                      <Text style={styles.resolveBtnText}>Mark resolved</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.closeBtn}
                    onPress={() => void setStatus(item._id, 'Closed')}
                  >
                    <Text style={styles.closeBtnText}>Close</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    chipText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
    chipTextOn: { color: colors.accent },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 4,
    },
    subject: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
    statusPill: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    statusPillText: {
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 0.4,
    },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    body: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 8 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    progressBtn: {
      flexGrow: 1,
      backgroundColor: colors.accent2,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    progressBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    resolveBtn: {
      flexGrow: 1,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    resolveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    closeBtn: {
      flexGrow: 1,
      backgroundColor: colors.danger,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  });
}
