import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, Card } from './ui';

/** Read-only safety profile — parity with web TransactionSystem professional viewer layout */
export function ViewerScanCard({
  chemical,
  container,
  warnings = [],
}: {
  chemical: any;
  container?: any;
  warnings?: string[];
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sdsUrl =
    chemical?.sds_file_url ||
    (chemical?.sds_docs?.[0]?.file_url as string | undefined);
  const hazardous = Boolean(
    chemical?.hazard_summary?.health ||
      chemical?.hazard_summary?.physical ||
      warnings.length > 0
  );
  const expired =
    chemical?.expiry_date && new Date(chemical.expiry_date) < new Date();

  return (
    <Card>
      <Text style={styles.chem}>{chemical?.name || 'Unknown chemical'}</Text>
      {chemical?.formula ? <Text style={styles.meta}>({chemical.formula})</Text> : null}

      <View style={styles.ppeRow}>
        {chemical?.status === 'In Stock' ? <Badge label="Available" tone="ok" /> : null}
        {chemical?.status === 'Low Stock' ? <Badge label="Low stock" tone="warn" /> : null}
        {hazardous ? <Badge label="Hazardous" tone="danger" /> : null}
        {expired ? <Badge label="Expired" tone="danger" /> : null}
      </View>

      <Text style={styles.meta}>CAS: {chemical?.cas_number || 'N/A'}</Text>
      <Text style={styles.meta}>
        Signal: {chemical?.ghs_hazards?.signal_word?.toUpperCase() || 'NONE'}
      </Text>
      <Text style={styles.meta}>Category: {chemical?.category || 'N/A'}</Text>
      <Text style={styles.meta}>Lab: {chemical?.lab_name || 'N/A'}</Text>
      <Text style={styles.meta}>Location: {container?.location || 'Not assigned'}</Text>
      <Text style={styles.meta}>
        Storage: {chemical?.storage_temp || 'Ambient'} /{' '}
        {chemical?.storage_humidity || 'Standard'}
      </Text>
      {chemical?.incompatibility?.length ? (
        <Text style={styles.meta}>
          Keep away from: {chemical.incompatibility.join(', ')}
        </Text>
      ) : null}

      <Text style={styles.section}>PPE requirements</Text>
      <View style={styles.ppeRow}>
        {chemical?.ppe_requirements?.length ? (
          chemical.ppe_requirements.map((p: string, i: number) => (
            <Badge key={i} label={p} tone="muted" />
          ))
        ) : (
          <Text style={styles.meta}>Standard lab protection</Text>
        )}
      </View>

      {warnings.map((w, i) => (
        <Text key={i} style={styles.warnText}>
          ⚠ {w}
        </Text>
      ))}

      {sdsUrl ? (
        <Button label="View & Download SDS" onPress={() => void Linking.openURL(sdsUrl)} />
      ) : null}

      {chemical?.nfpa_rating ? (
        <Text style={styles.meta}>
          NFPA H{chemical.nfpa_rating.health || 0} F{chemical.nfpa_rating.flammability || 0} R
          {chemical.nfpa_rating.reactivity || 0}
          {chemical.nfpa_rating.special ? ` ${chemical.nfpa_rating.special}` : ''}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        First aid: {chemical?.emergency_response?.first_aid || 'Standard protocol'}
      </Text>
      <Text style={styles.meta}>
        Spill: {chemical?.spill_instructions || 'Notify HazMat. Contain spill.'}
      </Text>
    </Card>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chem: { color: colors.text, fontWeight: '900', fontSize: 17 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    section: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 12,
      marginBottom: 4,
    },
    warnText: { color: colors.danger, fontSize: 12, marginTop: 4 },
    ppeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  });
}
