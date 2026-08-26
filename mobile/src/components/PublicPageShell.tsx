import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Screen, Title } from './ui';
import type { ThemeColors } from '../theme/colors';

export function PublicPageShell({
  title,
  highlight,
  subtitle,
  backLabel = 'Back',
  children,
}: {
  title: string;
  highlight?: string;
  subtitle?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* ── Back Button ─────────────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel={backLabel}
          accessibilityRole="button"
        >
          <View style={styles.backIconWrap}>
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
          </View>
          <Text style={styles.backLabel}>{backLabel}</Text>
        </Pressable>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.accentBar} />
          <Title style={{ fontSize: 32, marginTop: 12 }}>
            {title}
            {highlight ? <Text style={{ color: colors.accent }}> {highlight}</Text> : null}
          </Title>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>

        {children}
      </ScrollView>
    </Screen>
  );
}

export function PublicSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

export function PublicParagraph({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.p}>{children}</Text>;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      marginTop: 4,
      marginBottom: 8,
      paddingVertical: 6,
      paddingRight: 12,
    },
    backIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backLabel: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: 14,
    },
    accentBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
      marginTop: 8,
    },
    hero: { marginBottom: 16 },
    sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 8 },
    section: { marginTop: 8, marginBottom: 4 },
    h2: { color: colors.text, fontWeight: '800', fontSize: 18, marginTop: 16, marginBottom: 8 },
    p: { color: colors.muted, lineHeight: 22, marginBottom: 8 },
  });
}
