import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HAZARD_CLASSES } from '../../constants/hazards';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../ui';

type HazardInput = string | string[] | undefined | null;

function normalizeHazards(hazards: HazardInput): string[] {
  if (!hazards) return [];
  const raw = Array.isArray(hazards) ? hazards : [hazards];
  return raw.map((h) => String(h || '').trim()).filter(Boolean);
}

export default function HazardBadges({
  hazards,
  showLabels = true,
}: {
  hazards: HazardInput;
  showLabels?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const list = normalizeHazards(hazards);

  if (!list.length) {
    return <Text style={styles.empty}>No hazard classification</Text>;
  }

  return (
    <View style={styles.wrap}>
      {list.map((h) => {
        const def =
          HAZARD_CLASSES.find((x) => x.id === h || x.label === h) ||
          HAZARD_CLASSES.find((x) => h.toLowerCase().includes(x.label.toLowerCase()));
        const label = def?.label || h;
        const tone = def?.tone || 'warn';
        return showLabels ? (
          <Badge key={`${h}-${label}`} label={label} tone={tone} />
        ) : (
          <View key={`${h}-${label}`} style={styles.dot} />
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    empty: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.warn,
    },
  });
}
