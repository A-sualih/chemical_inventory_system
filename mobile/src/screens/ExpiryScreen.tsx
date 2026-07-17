import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { asList } from '../utils/apiHelpers';
import { Badge, Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function ExpiryScreen() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/expiry/summary');
      setSummary(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load expiry summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const expired = asList(summary?.expired || summary?.expiredItems, ['items']);
  const soon = asList(summary?.expiringSoon || summary?.nearExpiry || summary?.warning, ['items']);
  const counts = summary?.counts || summary?.stats || {};

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
      >
        <Title>Expiry</Title>
        <Subtitle>Near-expiry and expired assets</Subtitle>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.row}>
          <Card style={styles.stat}>
            <Text style={styles.label}>Expired</Text>
            <Text style={[styles.value, { color: colors.danger }]}>
              {counts.expired ?? expired.length ?? '—'}
            </Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.label}>Soon</Text>
            <Text style={[styles.value, { color: colors.warn }]}>
              {counts.expiringSoon ?? counts.warning ?? soon.length ?? '—'}
            </Text>
          </Card>
        </View>

        <Text style={styles.section}>Expiring soon</Text>
        {soon.length === 0 ? <EmptyState title="None soon" /> : null}
        {soon.slice(0, 30).map((item: any, i: number) => (
          <Card key={item._id || item.id || i}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name || item.chemical_name || item.batch_number || 'Item'}</Text>
                <Text style={styles.meta}>
                  {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                </Text>
              </View>
              <Badge label="Soon" tone="warn" />
            </View>
          </Card>
        ))}

        <Text style={styles.section}>Expired</Text>
        {expired.length === 0 ? <EmptyState title="No expired records" /> : null}
        {expired.slice(0, 30).map((item: any, i: number) => (
          <Card key={item._id || item.id || `e-${i}`}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name || item.chemical_name || item.batch_number || 'Item'}</Text>
                <Text style={styles.meta}>
                  {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                </Text>
              </View>
              <Badge label="Expired" tone="danger" />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 6 },
  section: {
    color: colors.muted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    marginTop: 8,
    marginBottom: 8,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  error: { color: colors.danger, marginBottom: 8, fontWeight: '600' },
});
