import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { fmtQty } from '../../utils/formatQuantity';
import type { ThemeColors } from '../../theme/colors';
import { Badge } from '../ui';

interface Props {
  chemical: { id: string; name: string };
  visible: boolean;
  onClose: () => void;
}

function actionTone(action?: string): 'ok' | 'warn' | 'danger' | 'muted' {
  const a = String(action || '').toUpperCase();
  if (a === 'IN') return 'ok';
  if (a === 'DISPOSAL') return 'danger';
  if (a === 'TRANSFER') return 'warn';
  return 'muted';
}

export default function ChemicalHistoryModal({ chemical, visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api
      .get(`/inventory/logs/${chemical.id}`)
      .then(({ data }) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [visible, chemical.id]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Activity Ledger</Text>
              <Text style={styles.sub}>
                {chemical.name} · {chemical.id}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Retrieving audit trail…</Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.empty}>No transaction history for this asset.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              {logs.map((log) => (
                <View key={log._id || `${log.timestamp}-${log.action}`} style={styles.log}>
                  <View style={styles.logHead}>
                    <Badge label={log.action || 'LOG'} tone={actionTone(log.action)} />
                    <Text style={styles.time}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </Text>
                  </View>

                  {log.action === 'TRANSFER' ? (
                    <Text style={styles.detail}>
                      {log.building || log.old_location || 'N/A'} →{' '}
                      {log.to_building || log.new_location || 'N/A'}
                      {log.to_room ? ` (${log.to_room})` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.qty}>
                      {log.action === 'IN' ? '+' : '-'}
                      {fmtQty(log.quantity_change, log.unit)}
                    </Text>
                  )}

                  {(log.batch_number || log.building) && (
                    <Text style={styles.meta}>
                      {log.batch_number ? `Batch ${log.batch_number}` : ''}
                      {log.building ? ` · ${log.building} ${log.room || ''}` : ''}
                    </Text>
                  )}

                  <Text style={styles.reason}>"{log.reason || 'No reason provided'}"</Text>

                  {log.experiment_name ? (
                    <Text style={styles.meta}>
                      Usage: {log.experiment_name}
                      {log.department ? ` (${log.department})` : ''}
                    </Text>
                  ) : null}

                  {log.disposal_method ? (
                    <Text style={styles.meta}>
                      Disposal: {log.disposal_method}
                      {log.disposal_approved_by ? ` · ${log.disposal_approved_by}` : ''}
                    </Text>
                  ) : null}

                  <Text style={styles.user}>By {log.user_name || 'User'}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Text style={styles.footer}>Logs are immutable and system-verified for compliance.</Text>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    card: {
      maxHeight: '88%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    title: { color: colors.text, fontWeight: '900', fontSize: 20 },
    sub: { color: colors.muted, fontSize: 12, marginTop: 4 },
    close: { color: colors.muted, fontSize: 22, fontWeight: '700' },
    center: { paddingVertical: 40, alignItems: 'center' },
    loadingText: { color: colors.muted, marginTop: 10 },
    empty: { color: colors.muted, fontStyle: 'italic' },
    log: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    time: { color: colors.muted, fontSize: 11 },
    qty: { color: colors.text, fontWeight: '900', fontSize: 16 },
    detail: { color: colors.text, fontWeight: '700', fontSize: 14 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    reason: { color: colors.text, fontSize: 13, fontStyle: 'italic', marginTop: 6 },
    user: { color: colors.muted, fontSize: 11, marginTop: 8, fontWeight: '700' },
    footer: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 8 },
  });
}
