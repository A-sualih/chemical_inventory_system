import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';

export default function LabManagementScreen() {
  const { colors } = useTheme();
  const [labs, setLabs] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/labs');
      setLabs(asList(data, ['labs', 'data']));
    } catch {
      setLabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setMsg('');
    if (!name.trim()) {
      setMsg('Lab name is required.');
      return;
    }
    try {
      await api.post('/labs', { name: name.trim(), lab_code: code.trim() || undefined });
      setName('');
      setCode('');
      setMsg('Lab created.');
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Create failed');
    }
  };

  const remove = (lab: any) => {
    Alert.alert('Delete lab', `Delete ${lab.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/labs/${lab._id}`);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Title>Labs & Depts</Title>
      <Subtitle>Admin only — manage laboratories</Subtitle>

      <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Input placeholder="Lab name" value={name} onChangeText={setName} />
        <Input placeholder="Lab code (optional)" value={code} onChangeText={setCode} autoCapitalize="characters" />
        <Button label="Create lab" onPress={() => void create()} />
        {msg ? <Text style={{ color: colors.accent, marginTop: 8, fontWeight: '700' }}>{msg}</Text> : null}
      </View>

      <FlatList
        data={labs}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No labs" /> : null}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
                {item.lab_code || item.code || item._id}
              </Text>
            </View>
            <Button label="Delete" variant="danger" onPress={() => remove(item)} />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14 },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
