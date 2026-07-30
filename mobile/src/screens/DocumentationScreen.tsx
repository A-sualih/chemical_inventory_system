import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { PublicPageShell } from '../components/PublicPageShell';
import type { ThemeColors } from '../theme/colors';

export default function DocumentationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <PublicPageShell
      title="System"
      highlight="Documentation"
      subtitle="Comprehensive guides for users and administrators."
    >
      <FeatureRow
        styles={styles}
        icon="book-outline"
        title="Getting Started"
        desc="Learn how to setup your lab, register chemicals, and print QR labels."
      />
      <FeatureRow
        styles={styles}
        icon="document-text-outline"
        title="API Reference"
        desc="Integration guides for connecting automation hardware and external ERPs."
      />
    </PublicPageShell>
  );
}

function FeatureRow({
  styles,
  icon,
  title,
  desc,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 14,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 4 },
    desc: { color: colors.muted, lineHeight: 20 },
  });
}
