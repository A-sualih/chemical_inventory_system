import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { asList } from '../utils/apiHelpers';
import { Badge, Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function SafetyScreen() {
  const [dash, setDash] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, g] = await Promise.all([
        api.get('/safety/dashboard').catch(() => ({ data: null })),
        api.get('/safety/incompatibility/global').catch(() => ({ data: null })),
      ]);
      setDash(d.data);
      setConflicts(asList(g.data, ['conflicts', 'issues', 'data', 'results']));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load safety data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = dash?.stats || dash?.summary || dash || {};

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
      >
        <Title>Safety</Title>
        <Subtitle>Hazards & storage compatibility</Subtitle>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.row}>
          <Card style={styles.stat}>
            <Text style={styles.label}>Hazards</Text>
            <Text style={styles.value}>{stats.hazards ?? stats.hazardCount ?? '—'}</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.label}>Conflicts</Text>
            <Text style={[styles.value, { color: colors.danger }]}>
              {stats.conflicts ?? conflicts.length ?? '—'}
            </Text>
          </Card>
        </View>

        {dash?.alerts ? (
          <Card>
            <Text style={styles.section}>Alerts</Text>
            {asList(dash.alerts).slice(0, 10).map((a: any, i: number) => (
              <Text key={i} style={styles.meta}>
                • {typeof a === 'string' ? a : a.message || a.title || JSON.stringify(a)}
              </Text>
            ))}
          </Card>
        ) : null}

        <Text style={styles.section}>Incompatibility scan</Text>
        {conflicts.length === 0 ? (
          <EmptyState title="No conflicts detected" body="Storage looks compatible for this lab." />
        ) : (
          conflicts.slice(0, 40).map((c: any, i: number) => (
            <Card key={c._id || i}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {c.location || c.cabinet || c.room || 'Storage conflict'}
                  </Text>
                  <Text style={styles.meta}>
                    {c.message || c.reason || [c.chemical_a, c.chemical_b].filter(Boolean).join(' vs ')}
                  </Text>
                </View>
                <Badge label="Risk" tone="danger" />
              </View>
            </Card>
          ))
        )}
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
  meta: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, marginBottom: 8, fontWeight: '600' },
});
