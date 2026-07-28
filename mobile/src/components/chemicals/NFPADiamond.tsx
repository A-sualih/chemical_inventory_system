import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface NFPARating {
  health?: number;
  flammability?: number;
  reactivity?: number;
  special?: string;
}

export default function NFPADiamond({ ratings }: { ratings?: NFPARating | null }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const r = ratings || { health: 0, flammability: 0, reactivity: 0, special: '' };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>NFPA 704</Text>
      <View style={styles.diamond}>
        <View style={[styles.cell, styles.top]}>
          <Text style={styles.num}>{r.health ?? 0}</Text>
          <Text style={styles.lbl}>Health</Text>
        </View>
        <View style={styles.midRow}>
          <View style={[styles.cell, styles.left]}>
            <Text style={styles.num}>{r.flammability ?? 0}</Text>
            <Text style={styles.lbl}>Flam</Text>
          </View>
          <View style={[styles.cell, styles.right]}>
            <Text style={styles.num}>{r.reactivity ?? 0}</Text>
            <Text style={styles.lbl}>React</Text>
          </View>
        </View>
        <View style={[styles.cell, styles.bottom]}>
          <Text style={styles.special}>{r.special || '—'}</Text>
          <Text style={styles.lbl}>Special</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 8 },
    title: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    diamond: { width: 140, alignItems: 'center' },
    midRow: { flexDirection: 'row', gap: 6 },
    cell: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      alignItems: 'center',
      minWidth: 58,
    },
    top: { marginBottom: 4 },
    left: {},
    right: {},
    bottom: { marginTop: 4, minWidth: 120 },
    num: { color: colors.text, fontWeight: '900', fontSize: 18 },
    special: { color: colors.text, fontWeight: '900', fontSize: 14 },
    lbl: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  });
}
