import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { Badge, Button, Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';

export default function SecurityScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        api.get('/security/status').catch(() => ({ data: null })),
        api.get('/security/backups').catch(() => ({ data: [] })),
      ]);
      setStatus(s.data);
      setBackups(asList(b.data, ['backups', 'data']));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createBackup = async () => {
    setMsg('');
    try {
      await api.post('/security/backups');
      setMsg('Backup started.');
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Backup failed');
    }
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}>
        <Title>Security & Backup</Title>
        <Subtitle>Admin only — same API as website</Subtitle>

        <Card>
          <Text style={[styles.label, { color: colors.muted }]}>Status</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {status?.status || status?.healthy === false ? 'Check required' : status?.message || 'Operational'}
          </Text>
          {status?.mfaEnforced != null ? (
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              MFA enforced: {String(status.mfaEnforced)}
            </Text>
          ) : null}
        </Card>

        <Button label="Create backup" onPress={() => void createBackup()} />
        {msg ? <Text style={{ color: colors.accent, marginVertical: 8, fontWeight: '700' }}>{msg}</Text> : null}

        <Text style={[styles.section, { color: colors.muted }]}>Recent backups</Text>
        {backups.length === 0 ? <EmptyState title="No backups listed" /> : null}
        {backups.slice(0, 20).map((b, i) => (
          <Card key={b._id || b.id || i}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{b.name || b.filename || 'Backup'}</Text>
                <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
                  {b.createdAt ? new Date(b.createdAt).toLocaleString() : b.date || '—'}
                </Text>
              </View>
              <Badge label={b.status || 'ok'} tone="ok" />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  value: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  section: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
