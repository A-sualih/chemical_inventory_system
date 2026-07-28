import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Screen, Title } from './ui';
import type { ThemeColors } from '../theme/colors';

export function PublicPageShell({
  title,
  highlight,
  subtitle,
  backLabel = '← Home',
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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{backLabel}</Text>
        </Pressable>
        <View style={styles.hero}>
          <Title style={{ fontSize: 32 }}>
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
    back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
    hero: { marginBottom: 8 },
    sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 16 },
    section: { marginTop: 8, marginBottom: 4 },
    h2: { color: colors.text, fontWeight: '800', fontSize: 18, marginTop: 16, marginBottom: 8 },
    p: { color: colors.muted, lineHeight: 22, marginBottom: 8 },
  });
}
