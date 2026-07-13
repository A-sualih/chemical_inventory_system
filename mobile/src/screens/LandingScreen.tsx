import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Screen } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const FEATURES = [
  {
    icon: 'cube-outline' as const,
    title: 'Inventory Tracking',
    desc: 'Real-time monitoring of chemicals, containers, batches, and precise quantities across all labs.',
  },
  {
    icon: 'layers-outline' as const,
    title: 'Multi-Lab Management',
    desc: 'Secure siloed management for multiple departments under one centralized institutional platform.',
  },
  {
    icon: 'qr-code-outline' as const,
    title: 'QR / Barcode Scanning',
    desc: 'Instant identification and movement tracking using high-speed barcode scanning.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Safety & SDS',
    desc: 'Hazard classification (GHS), PPE requirements, and safety compliance workflows.',
  },
  {
    icon: 'trash-outline' as const,
    title: 'Disposal Workflow',
    desc: 'End-to-end hazardous waste management with approval queues and audit trails.',
  },
];

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { colors, theme, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [stats, setStats] = useState({
    chemicalsTracked: 0,
    activeLabs: 0,
    vesselsManaged: 0,
    safetyCompliance: '—',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/public/stats');
        if (data?.success && data.data) setStats(data.data);
        else if (data) setStats((s) => ({ ...s, ...data }));
      } catch {
        /* public stats optional offline */
      }
    })();
  }, []);

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.nav}>
          <View style={styles.brandRow}>
            <Ionicons name="flask-outline" size={26} color={colors.accent} />
            <Text style={styles.brand}>CIMS PRO</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={toggleTheme} style={styles.navGhost}>
              <Ionicons
                name={theme === 'ink' ? 'moon-outline' : 'sunny-outline'}
                size={18}
                color={colors.text}
              />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.navSignIn}>
              <Text style={styles.navSignInText}>Sign In</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>CIMS PRO</Text>
          <Text style={styles.heroDesc}>
            A secure multi-lab platform for tracking chemicals, containers, safety compliance,
            inventory movement, and disposal workflows with enterprise-grade precision.
          </Text>
          <Button label="Create Account" onPress={() => navigation.navigate('Register')} />
          <View style={{ height: 10 }} />
          <Button label="Sign In" variant="ghost" onPress={() => navigation.navigate('Login')} />
        </View>

        <View style={styles.stats}>
          <Stat styles={styles} value={`${stats.chemicalsTracked}+`} label="Chemicals" />
          <Stat styles={styles} value={String(stats.activeLabs)} label="Labs" />
          <Stat styles={styles} value={`${stats.vesselsManaged}+`} label="Vessels" />
          <Stat styles={styles} value={String(stats.safetyCompliance)} label="Compliance" />
        </View>

        <Text style={styles.tag}>Powerful Capabilities</Text>
        <Text style={styles.sectionTitle}>Everything you need for precise control</Text>

        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Ready to modernize your inventory?</Text>
          <Text style={styles.ctaDesc}>Join your lab on CIMS PRO — same platform as the web app.</Text>
          <Button label="Create Your Account" onPress={() => navigation.navigate('Register')} />
        </View>

        <View style={styles.footer}>
          <Link styles={styles} label="Learn More" onPress={() => navigation.navigate('LearnMore')} />
          <Link styles={styles} label="Privacy" onPress={() => navigation.navigate('Privacy')} />
          <Link styles={styles} label="Terms" onPress={() => navigation.navigate('Terms')} />
          <Link styles={styles} label="Support" onPress={() => navigation.navigate('Support')} />
        </View>
        <Text style={styles.copy}>© {new Date().getFullYear()} CIMS PRO</Text>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  styles,
  value,
  label,
}: {
  styles: ReturnType<typeof makeStyles>;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Link({
  styles,
  label,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.footerLink}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroll: { paddingBottom: 40 },
    nav: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brand: { color: colors.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.3 },
    navGhost: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    navSignIn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    navSignInText: { color: colors.btnText, fontWeight: '800', fontSize: 13 },
    hero: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28 },
    heroTitle: {
      color: colors.text,
      fontSize: 40,
      fontWeight: '900',
      letterSpacing: -1,
      marginBottom: 12,
    },
    heroDesc: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 20 },
    stats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 28,
    },
    statItem: { width: '50%', padding: 10 },
    statValue: { color: colors.accent, fontWeight: '900', fontSize: 22 },
    statLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
      textTransform: 'uppercase',
    },
    tag: {
      color: colors.accent,
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
      paddingHorizontal: 16,
      marginBottom: 14,
      letterSpacing: -0.4,
    },
    feature: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    featureDesc: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
    ctaBox: {
      marginHorizontal: 16,
      marginTop: 18,
      marginBottom: 20,
      backgroundColor: colors.surface2,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    ctaTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 6 },
    ctaDesc: { color: colors.muted, marginBottom: 14, lineHeight: 20 },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginTop: 8,
    },
    footerLink: { color: colors.muted, fontWeight: '700', fontSize: 13 },
    copy: { color: colors.muted, textAlign: 'center', marginTop: 16, opacity: 0.7, fontSize: 12 },
  });
}
