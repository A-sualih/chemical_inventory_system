import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

export type BarDatum = {
  label: string;
  value: number;
  meta?: string;
  display?: string;
};

export function HorizontalBarChart({
  data,
  color,
  prefix = '',
}: {
  data: BarDatum[];
  color?: string;
  prefix?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const fill = color || colors.accent;

  if (data.length === 0) {
    return <Text style={styles.empty}>No data</Text>;
  }

  return (
    <View style={styles.wrap}>
      {data.map((d, i) => {
        const pct = Math.max(d.value > 0 ? 2 : 0, (d.value / maxVal) * 100);
        const display =
          d.display ??
          (typeof d.value === 'number'
            ? `${prefix}${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : String(d.value));
        return (
          <View key={`${d.label}-${i}`} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.track}>
              {d.value > 0 ? (
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fill }]}>
                  <Text style={styles.value} numberOfLines={1}>
                    {display}
                  </Text>
                </View>
              ) : null}
            </View>
            {d.meta ? <Text style={styles.meta}>{d.meta}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    row: { gap: 4 },
    label: { color: colors.text, fontWeight: '700', fontSize: 12 },
    track: {
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.surface2,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    fill: {
      height: '100%',
      borderRadius: 8,
      justifyContent: 'center',
      paddingHorizontal: 8,
      minWidth: 48,
    },
    value: { color: '#fff', fontWeight: '800', fontSize: 11 },
    meta: { color: colors.muted, fontSize: 11, fontWeight: '600' },
    empty: { color: colors.muted, fontSize: 13 },
  });
}
