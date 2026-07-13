import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Input, Screen, SectionLabel, Subtitle, Title } from '../components/ui';

interface LabOption {
  _id: string;
  name: string;
  lab_code?: string;
}

export default function ProfileScreen() {
  const { user, logout, switchActiveLab, updateUser, refreshUser } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/labs');
        const list = Array.isArray(data) ? data : data.labs || [];
        setLabs(list);
      } catch {
        setLabs([]);
      }
    })();
  }, []);

  const activeId =
    typeof user?.active_lab === 'object' && user?.active_lab
      ? user.active_lab._id
      : user?.active_lab;

  const onSwitch = async (labId: string) => {
    setMessage('');
    const result = await switchActiveLab(labId);
    setMessage(result.success ? 'Active lab updated.' : result.error || 'Switch failed');
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.put('/profile/me', { name: name.trim() });
      const next = data?.user || data;
      if (next) await updateUser({ name: next.name || name.trim() });
      else await updateUser({ name: name.trim() });
      setMessage('Profile saved.');
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <Title>Profile & settings</Title>
        <Subtitle>Your account — same backend as website</Subtitle>

        <Card>
          <Text style={[styles.label, { color: colors.muted }]}>Role</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.role}</Text>
          <Text style={[styles.label, { color: colors.muted, marginTop: 12 }]}>Email</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.email}</Text>
        </Card>

        <SectionLabel>Personal</SectionLabel>
        <Card>
          <Text style={[styles.label, { color: colors.muted }]}>Display name</Text>
          <Input value={name} onChangeText={setName} placeholder="Your name" />
          <Button label="Save profile" onPress={() => void saveProfile()} loading={saving} />
        </Card>

        <SectionLabel>Appearance</SectionLabel>
        <Card>
          <View style={styles.themeRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Theme toggle</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {theme === 'ink' ? 'Ink (dark)' : 'Paper (light)'}
              </Text>
            </View>
            <Switch
              value={theme === 'ink'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <SectionLabel>Active lab</SectionLabel>
        {labs.map((lab) => {
          const selected = String(activeId) === String(lab._id);
          return (
            <Card key={lab._id} style={selected ? { borderColor: colors.accent } : undefined}>
              <View style={styles.labRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{lab.name}</Text>
                  {lab.lab_code ? (
                    <Text style={{ color: colors.muted, marginTop: 4 }}>{lab.lab_code}</Text>
                  ) : null}
                </View>
                <Button
                  label={selected ? 'Active' : 'Switch'}
                  variant={selected ? 'primary' : 'ghost'}
                  onPress={() => void onSwitch(lab._id)}
                  disabled={selected}
                />
              </View>
            </Card>
          );
        })}

        {message ? (
          <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: 12 }}>{message}</Text>
        ) : null}

        <Text style={{ color: colors.muted, fontSize: 11, marginVertical: 12, opacity: 0.7 }}>
          API {API_BASE_URL}
        </Text>
        <Button label="Sign out" variant="danger" onPress={() => void logout()} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
