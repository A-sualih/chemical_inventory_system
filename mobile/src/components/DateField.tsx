import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { Button } from './ui';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseYmd(value?: string): { y: number; m: number; d: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function formatDisplay(value?: string) {
  const p = parseYmd(value);
  if (!p) return '';
  return `${MONTHS[p.m - 1]} ${pad(p.d)}, ${p.y}`;
}

type Props = {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  editable?: boolean;
  required?: boolean;
  /** Allow selecting years this far before today (default 40) */
  yearsBack?: number;
  /** Allow selecting years this far after today (default 20) */
  yearsForward?: number;
};

/**
 * Date field with year / month / day chooser — same idea as web `<input type="date">`.
 */
export function DateField({
  label,
  value,
  onChange,
  editable = true,
  required,
  yearsBack = 40,
  yearsForward = 20,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const now = new Date();
  const years = useMemo(() => {
    const start = now.getFullYear() - yearsBack;
    const end = now.getFullYear() + yearsForward;
    const list: number[] = [];
    for (let y = end; y >= start; y -= 1) list.push(y);
    return list;
  }, [yearsBack, yearsForward, now.getFullYear()]);

  const initial = parseYmd(value) || {
    y: now.getFullYear(),
    m: now.getMonth() + 1,
    d: now.getDate(),
  };

  const [year, setYear] = useState(initial.y);
  const [month, setMonth] = useState(initial.m);
  const [day, setDay] = useState(initial.d);

  const openPicker = () => {
    if (!editable) return;
    const cur = parseYmd(value) || {
      y: now.getFullYear(),
      m: now.getMonth() + 1,
      d: now.getDate(),
    };
    setYear(cur.y);
    setMonth(cur.m);
    setDay(Math.min(cur.d, daysInMonth(cur.y, cur.m)));
    setOpen(true);
  };

  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);

  const confirm = () => {
    onChange(`${year}-${pad(month)}-${pad(safeDay)}`);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <Pressable
        onPress={openPicker}
        disabled={!editable}
        style={[styles.field, !editable && styles.fieldDisabled]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : 'Choose date'}
        </Text>
        {value ? (
          <Text style={styles.ymd}>{value}</Text>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Text style={styles.sheetHint}>Select year, month, and day</Text>

            <Text style={styles.colLabel}>Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
            >
              {years.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => {
                    setYear(y);
                    setDay((d) => Math.min(d, daysInMonth(y, month)));
                  }}
                  style={[styles.chip, year === y && styles.chipOn]}
                >
                  <Text style={[styles.chipText, year === y && styles.chipTextOn]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.colLabel}>Month</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {MONTHS.map((name, i) => {
                const m = i + 1;
                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      setMonth(m);
                      setDay((d) => Math.min(d, daysInMonth(year, m)));
                    }}
                    style={[styles.chip, month === m && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, month === m && styles.chipTextOn]}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.colLabel}>Day</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDay(d)}
                  style={[styles.chip, safeDay === d && styles.chipOn]}
                >
                  <Text style={[styles.chipText, safeDay === d && styles.chipTextOn]}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.preview}>
              Selected: {MONTHS[month - 1]} {pad(safeDay)}, {year}
            </Text>

            <View style={styles.actions}>
              {!required ? (
                <Button label="Clear" variant="ghost" onPress={clear} />
              ) : null}
              <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
              <Button label="Apply date" onPress={confirm} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: 12 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    req: { color: colors.danger },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    fieldDisabled: { opacity: 0.55 },
    fieldText: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 },
    placeholder: { color: colors.muted, fontWeight: '600' },
    ymd: { color: colors.muted, fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgDeep || colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 18,
      paddingBottom: 28,
      maxHeight: '88%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    sheetHint: { color: colors.muted, fontSize: 13, marginBottom: 12, marginTop: 4 },
    colLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginTop: 10,
      marginBottom: 8,
    },
    chipScroll: { maxHeight: 48 },
    chipRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.surface,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.muted, fontWeight: '800', fontSize: 13 },
    chipTextOn: { color: colors.btnText },
    preview: {
      color: colors.accent,
      fontWeight: '800',
      marginTop: 16,
      marginBottom: 8,
      fontSize: 14,
    },
    actions: { gap: 8, marginTop: 8 },
  });
}
