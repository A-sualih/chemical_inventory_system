import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function TransfersScreen() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chemicalId, setChemicalId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [toLab, setToLab] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/transfers');
      setItems(asList(data, ['transfers', 'data']));
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
      await api.post('/transfers', {
        chemical_id: chemicalId.trim(),
        quantity: Number(quantity) || 1,
        to_lab: toLab.trim(),
        reason: reason.trim() || 'Mobile transfer request',
      });
      setChemicalId('');
      setQuantity('1');
      setToLab('');
      setReason('');
      setMessage('Transfer requested.');
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || e.response?.data?.message || 'Submit failed');
    }
  };

  const act = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.put(`/transfers/${id}/${action}`);
      await load();
    } catch (e: any) {
      Alert.alert('Transfer', e.response?.data?.error || `${action} failed`);
    }
  };

  const canApprove = hasPermission('approve_cross_lab_transfer');

  return (
    <Screen>
      <Title>Transfers</Title>
      <Subtitle>Cross-lab chemical requisitions</Subtitle>

      {hasPermission('submit_request') ? (
        <View style={styles.form}>
          <Input placeholder="Chemical ID" value={chemicalId} onChangeText={setChemicalId} autoCapitalize="none" />
          <Input placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          <Input placeholder="Destination lab ID" value={toLab} onChangeText={setToLab} autoCapitalize="none" />
          <Input placeholder="Reason" value={reason} onChangeText={setReason} />
          <Button
            label="Request transfer"
            onPress={() => void submit()}
            disabled={!chemicalId.trim() || !toLab.trim()}
          />
          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No transfers" /> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.chemical_name || item.chemical_id || 'Transfer'}</Text>
              <Text style={styles.meta}>
                {[
                  item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
                  item.from_lab_name || item.provider_lab,
                  item.to_lab_name || item.requester_lab,
                  item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {canApprove && String(item.status).toLowerCase() === 'pending' ? (
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button label="Approve" onPress={() => void act(item._id, 'approve')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Reject" variant="ghost" onPress={() => void act(item._id, 'reject')} />
                  </View>
                </View>
              ) : null}
            </View>
            <Badge label={item.status || 'pending'} tone={toneForStatus(item.status)} />
          </View>
        )}
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
