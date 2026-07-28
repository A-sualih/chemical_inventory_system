import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { fmtQty } from '../../utils/formatQuantity';
import type { ThemeColors } from '../../theme/colors';
import { Button } from '../ui';

interface ChemicalRef {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  state?: string;
}

interface Props {
  chemical: ChemicalRef;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FIFOUsageModal({ chemical, visible, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState(chemical.unit || 'L');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const reset = () => {
    setAmount('');
    setReason('');
    setError('');
    setSuccessData(null);
    setUnit(chemical.unit || 'L');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/inventory/fifo-usage', {
        chemical_id: chemical.id,
        quantity: Number(amount),
        unit,
        reason,
      });
      setSuccessData(data);
      onSuccess?.();
    } catch (e: any) {
      setError(e.response?.data?.error || 'FIFO transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {!successData ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Quick FIFO Usage</Text>
                  <Text style={styles.sub}>Oldest stock is auto-selected first.</Text>
                </View>
                <Pressable onPress={close}>
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.chemName}>{chemical.name}</Text>
                <Text style={styles.chemMeta}>
                  {chemical.id} · Available {fmtQty(chemical.quantity, chemical.unit)}
                </Text>
              </View>

              <Text style={styles.label}>Quantity to deduct</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Usage purpose / experiment *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder="Why is this chemical being used?"
                placeholderTextColor={colors.muted}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button label="Apply FIFO deduction" onPress={() => void submit()} loading={loading} />
              <Button label="Cancel" variant="ghost" onPress={close} />
            </>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <View style={styles.successIcon}>
                <Text style={{ fontSize: 28 }}>✓</Text>
              </View>
              <Text style={styles.title}>Usage confirmed</Text>
              <Text style={styles.sub}>FIFO auto-selection deducted stock.</Text>

              <View style={styles.summary}>
                <Text style={styles.label}>Total deducted</Text>
                <Text style={styles.qty}>
                  {fmtQty(successData.totalDeducted, successData.unit)}
                </Text>
              </View>

              {(successData.containersUsed || []).map((c: any, i: number) => (
                <View key={i} style={styles.containerRow}>
                  <View>
                    <Text style={styles.chemName}>{c.containerId}</Text>
                    <Text style={styles.chemMeta}>Batch {c.batchId}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.qty, { color: colors.danger }]}>
                      -{fmtQty(c.deductedQuantity, c.unit)}
                    </Text>
                    <Text style={styles.chemMeta}>
                      Rem {fmtQty(c.remainingQuantity, c.unit)}
                    </Text>
                  </View>
                </View>
              ))}

              <Button label="Done" onPress={close} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    card: {
      maxHeight: '90%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    header: { flexDirection: 'row', marginBottom: 12 },
    title: { color: colors.text, fontWeight: '900', fontSize: 20 },
    sub: { color: colors.muted, fontSize: 12, marginTop: 4 },
    close: { color: colors.muted, fontSize: 22 },
    infoBox: {
      backgroundColor: colors.surface2,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chemName: { color: colors.text, fontWeight: '800' },
    chemMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      marginBottom: 10,
    },
    textarea: { minHeight: 72, textAlignVertical: 'top' },
    error: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface2,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    summary: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginVertical: 12,
    },
    qty: { color: colors.text, fontWeight: '900', fontSize: 16 },
    containerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
    },
  });
}
