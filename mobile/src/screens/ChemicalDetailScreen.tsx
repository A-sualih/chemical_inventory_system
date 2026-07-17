import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import type { Chemical } from '../types';
import { Badge, Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function ChemicalDetailScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string;
  const [chemical, setChemical] = useState<Chemical | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/chemicals/${id}`);
        setChemical(data.chemical || data);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to load chemical');
      }
    })();
  }, [id]);

  if (error) {
    return (
      <Screen>
        <EmptyState title="Unavailable" body={error} />
      </Screen>
    );
  }

  if (!chemical) {
    return (
      <Screen>
        <Subtitle>Loading…</Subtitle>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Title>{chemical.name}</Title>
        <Subtitle>
          {chemical.id}
          {chemical.cas_number ? ` · CAS ${chemical.cas_number}` : ''}
        </Subtitle>

        <Card>
          <Row label="Status" value={chemical.status || '—'} />
          <Row
            label="Quantity"
            value={`${chemical.quantity ?? '—'} ${chemical.unit || ''}`}
          />
          <Row label="Location" value={chemical.location || '—'} />
          <Row
            label="Expiry"
            value={
              chemical.expiry_date
                ? new Date(chemical.expiry_date).toLocaleDateString()
                : '—'
            }
          />
        </Card>

        {!!chemical.ghs_hazards?.length && (
          <Card>
            <Text style={styles.section}>Hazards</Text>
            <View style={styles.chips}>
              {chemical.ghs_hazards.map((h) => (
                <Badge key={h} label={h} tone="danger" />
              ))}
            </View>
          </Card>
        )}

        {!!chemical.ppe_requirements?.length && (
          <Card>
            <Text style={styles.section}>Required PPE</Text>
            <View style={styles.chips}>
              {chemical.ppe_requirements.map((p) => (
                <Badge key={p} label={p} tone="warn" />
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  label: { color: colors.muted, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  value: { color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  section: {
    color: colors.muted,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
