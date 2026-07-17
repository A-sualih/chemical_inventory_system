import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { UsageRequest } from '../types';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function RequestsScreen() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<UsageRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [chemicalId, setChemicalId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/requests');
      const list = Array.isArray(data) ? data : data.requests || data.data || [];
      setItems(list);
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
      await api.post('/requests', {
        chemical_id: chemicalId.trim(),
        quantity: Number(quantity) || 1,
        reason: reason.trim() || 'Mobile request',
      });
      setChemicalId('');
      setQuantity('1');
      setReason('');
      setMessage('Request submitted.');
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Failed to submit request');
    }
  };

  return (
    <Screen>
      <Title>Requests</Title>
      <Subtitle>Submit and track chemical usage requests</Subtitle>

      {hasPermission('submit_request') ? (
        <View style={styles.form}>
          <Input
            placeholder="Chemical ID"
            value={chemicalId}
            onChangeText={setChemicalId}
            autoCapitalize="none"
          />
          <Input
            placeholder="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
          <Input placeholder="Reason / purpose" value={reason} onChangeText={setReason} />
          <Button label="Submit request" onPress={() => void submit()} disabled={!chemicalId.trim()} />
          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading ? <EmptyState title="No requests yet" /> : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.chemical_name || item.chemical_id || 'Request'}</Text>
              <Text style={styles.meta}>
                {item.quantity ?? '—'} {item.unit || ''}
                {item.requester_name ? ` · ${item.requester_name}` : ''}
              </Text>
              {item.reason ? <Text style={styles.meta}>{item.reason}</Text> : null}
            </View>
            <Badge
              label={item.status || 'pending'}
              tone={
                String(item.status).toLowerCase() === 'approved'
                  ? 'ok'
                  : String(item.status).toLowerCase() === 'rejected'
                    ? 'danger'
                    : 'warn'
              }
            />
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
    alignItems: 'center',
  },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
});
