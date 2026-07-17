import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function WasteScreen() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chemicalId, setChemicalId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/waste/disposals');
      setItems(asList(data, ['disposals', 'data']));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setMessage('');
    try {
      await api.post('/waste/disposals', {
        chemical_id: chemicalId.trim(),
        quantity: Number(quantity) || 1,
        reason: reason.trim() || 'Mobile disposal request',
      });
      setChemicalId('');
      setQuantity('1');
      setReason('');
      setMessage('Disposal request submitted.');
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Submit failed');
    }
  };

  const act = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    try {
      await api.put(`/waste/disposals/${id}/${action}`);
      await load();
    } catch (e: any) {
      Alert.alert('Waste', e.response?.data?.error || `${action} failed`);
    }
  };

  return (
    <Screen>
      <Title>Waste</Title>
      <Subtitle>Disposal requests for this lab</Subtitle>

      {(hasPermission('manage_waste') || hasPermission('submit_request')) && (
        <View style={styles.form}>
          <Input placeholder="Chemical ID" value={chemicalId} onChangeText={setChemicalId} autoCapitalize="none" />
          <Input placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          <Input placeholder="Reason" value={reason} onChangeText={setReason} />
          <Button label="Request disposal" onPress={() => void submit()} disabled={!chemicalId.trim()} />
          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No disposal requests" /> : null}
        renderItem={({ item }) => {
          const status = String(item.status || 'pending');
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.chemical_name || item.chemical_id || 'Disposal'}</Text>
                <Text style={styles.meta}>
                  {[
                    item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
                    item.reason,
                    item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {hasPermission('approve_disposal') && status.toLowerCase() === 'pending' ? (
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <Button label="Approve" onPress={() => void act(item._id, 'approve')} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label="Reject" variant="ghost" onPress={() => void act(item._id, 'reject')} />
                    </View>
                  </View>
                ) : null}
                {hasPermission('manage_waste') && status.toLowerCase() === 'approved' ? (
                  <Button label="Mark complete" onPress={() => void act(item._id, 'complete')} />
                ) : null}
              </View>
              <Badge label={status} tone={toneForStatus(status)} />
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  msg: { color: colors.accent, marginTop: 8, fontWeight: '700' },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
  },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
