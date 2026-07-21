import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Input, Screen, Subtitle, Title } from '../components/ui';

export default function SystemSettingsScreen() {
  const { colors } = useTheme();
  const [systemName, setSystemName] = useState('CIMS PRO');
  const [orgName, setOrgName] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        const s = data?.settings || data || {};
        setSystemName(s.systemName || 'CIMS PRO');
        setOrgName(s.orgName || '');
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    setMsg('');
    try {
      await api.put('/settings', { systemName: systemName.trim(), orgName: orgName.trim() });
      setMsg('Settings saved.');
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Save failed — Admin / MANAGE_SETTINGS required');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <Title>System Settings</Title>
        <Subtitle>Admin only — organization branding</Subtitle>

        <Card>
          <Text style={[styles.label, { color: colors.muted }]}>System name</Text>
          <Input value={systemName} onChangeText={setSystemName} placeholder="CIMS PRO" />
          <Text style={[styles.label, { color: colors.muted }]}>Organization</Text>
          <Input value={orgName} onChangeText={setOrgName} placeholder="Managed Stack" />
          <Button label="Save settings" onPress={() => void save()} loading={loading} />
          {msg ? <Text style={{ color: colors.accent, marginTop: 10, fontWeight: '700' }}>{msg}</Text> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
});
