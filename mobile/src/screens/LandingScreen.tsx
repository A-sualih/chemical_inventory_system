import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
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
import { useBranding } from '../hooks/useBranding';
import { Button, Screen, ThemeToggleButton } from '../components/ui';
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
    desc: 'Instant identification and movement tracking using high-speed barcode scanning integration.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Safety & SDS Management',
    desc: 'Centralized SDS repository with hazard classification (GHS) and NFPA visual diamond reporting.',
  },
  {
    icon: 'trash-outline' as const,
    title: 'Disposal Workflow',
    desc: 'End-to-end hazardous waste management with approval queues and compliance audit trails.',
  },
  {
    icon: 'clipboard-outline' as const,
    title: 'Audit & Activity Logs',
    desc: 'Comprehensive ledger tracking every change, movement, and adjustment for regulatory compliance.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Notifications & Alerts',
    desc: 'Automated warnings for chemical expiry, low-stock levels, and critical safety threshold breaches.',
  },
];

const WORKFLOW = [
  { num: '1', title: 'Add', desc: 'Fast enrollment of new chemicals' },
  { num: '2', title: 'Assign', desc: 'Allocate to secure storage' },
  { num: '3', title: 'Track', desc: 'Real-time volume monitoring' },
  { num: '4', title: 'Transfer', desc: 'Move assets between labs' },
  { num: '5', title: 'Dispose', desc: 'Safety-compliant removal' },
];

const ROLES = [
  { name: 'Admin', desc: 'System-wide configuration, user management, and security oversight.' },
  { name: 'Lab Manager', desc: 'Full control over inventory, approvals, and lab-specific settings.' },
  { name: 'Lab Staff', desc: 'Daily operations: check-in/out, scanning, and request submission.' },
  { name: 'Auditor', desc: 'Read-only access to logs, reports, and safety certifications.' },
];

const COMPLIANCE = [
  { title: 'SDS Integration', desc: 'Digital access to safety sheets at the point of use.', color: '#ef4444' },
  { title: 'Hazard Tracking', desc: 'Automatic classification of incompatible materials.', color: '#f59e0b' },
  { title: 'Audit History', desc: 'Immutable logs for compliance inspections.', color: '#3b82f6' },
  { title: 'Access Control', desc: 'Role-based security for sensitive materials.', color: '#10b981' },
];

const DEVELOPERS = [
  { name: 'Amir Mesfin', email: 'amir.mesfin136@gmail.com', phone: '0962945025' },
  { name: 'Ahmed Saulih', email: 'sualihahmed26@gmail.com', phone: '0926352943' },
  { name: 'Tsegazeab', email: 'tsegazeab@gmail.com', phone: '0966610048' },
];

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { colors, theme } = useTheme();
  const { systemName, orgName, logoUrl, heroUrl, ready } = useBranding();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const [showDevModal, setShowDevModal] = useState(false);
  const [stats, setStats] = useState({
    chemicalsTracked: '...',
    activeLabs: '...',
    vesselsManaged: '...',
    safetyCompliance: '...',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/public/stats');
        if (res.data?.success && res.data.data) setStats(res.data.data);
      } catch {
        /* keep placeholders */
      }
    })();
  }, []);

  const scrollTo = (key: string) => {
    const y = sectionY.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <View style={styles.nav}>
          <View style={styles.brandRow}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.navLogo} resizeMode="contain" />
            ) : ready ? (
              <Ionicons name="flask-outline" size={26} color={colors.accent} />
            ) : (
              <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: colors.border }} />
            )}
            <Text style={styles.brand} numberOfLines={1}>
              {systemName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemeToggleButton />
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.navSignIn}>
              <Text style={styles.navSignInText}>Sign In</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.navLinks}>
          {(['features', 'about', 'workflow'] as const).map((key) => (
            <Pressable key={key} onPress={() => scrollTo(key)}>
              <Text style={styles.navLink}>
                {key === 'features' ? 'Features' : key === 'about' ? 'About' : 'Workflow'}
              </Text>
            </Pressable>
          ))}
        </View>

        {heroUrl ? (
          <View style={styles.heroImageWrap}>
            <Image source={{ uri: heroUrl }} style={styles.heroImage} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{systemName}</Text>
          <Text style={styles.heroDesc}>
            A secure multi-lab platform for tracking chemicals, containers, safety compliance, inventory
            movement, and disposal workflows with enterprise-grade precision in {orgName}.
          </Text>
          <Button label="Create Account" onPress={() => navigation.navigate('Register')} />
          <View style={{ height: 10 }} />
          <Button label="Sign In" variant="ghost" onPress={() => navigation.navigate('Login')} />
        </View>

        <View style={styles.stats}>
          <Stat styles={styles} value={`${stats.chemicalsTracked}+`} label="Chemicals Tracked" />
          <Stat styles={styles} value={String(stats.activeLabs)} label="Active Laboratories" />
          <Stat styles={styles} value={`${stats.vesselsManaged}+`} label="Vessels Managed" />
          <Stat styles={styles} value={String(stats.safetyCompliance)} label="Safety Compliance" />
        </View>

        <View
          onLayout={(e) => {
            sectionY.current.features = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.tag}>Powerful Capabilities</Text>
          <Text style={styles.sectionTitle}>Everything you need for precise control</Text>
        </View>

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

        <View
          onLayout={(e) => {
            sectionY.current.about = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.tag}>Our Mission</Text>
          <Text style={styles.sectionTitle}>Instituting Digital Safety in Science</Text>
          <Text style={styles.body}>
            {systemName} was developed to bridge the gap between complex laboratory operations and digital
            oversight. Our mission is to eliminate manual tracking errors and minimize hazards through
            intelligent automation.
          </Text>
          <Text style={styles.body}>
            By providing institutional-wide visibility, {systemName} helps safety officers and lab managers
            maintain a zero-incident environment while optimizing procurement.
          </Text>
          <Button label="Learn More About Our Tech" variant="ghost" onPress={() => navigation.navigate('LearnMore')} />
        </View>

        <View style={styles.complianceBox}>
          <Ionicons name="shield-outline" size={48} color={colors.danger} style={{ alignSelf: 'center' }} />
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginTop: 12 }]}>
            Compliance is not optional
          </Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            Built to exceed safety standards, {systemName} integrates with GHS protocols and provides
            real-time hazard analysis for every storage location in your facility.
          </Text>
          {COMPLIANCE.map((c) => (
            <View key={c.title} style={[styles.roleBox, { borderLeftColor: c.color, borderLeftWidth: 4 }]}>
              <Text style={styles.roleTitle}>{c.title}</Text>
              <Text style={styles.roleDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>

        <View
          onLayout={(e) => {
            sectionY.current.workflow = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.tag}>The Process</Text>
          <Text style={styles.sectionTitle}>How {systemName} Powers Your Lab</Text>
        </View>

        {WORKFLOW.map((w) => (
          <View key={w.num} style={styles.workflowStep}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{w.num}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{w.title}</Text>
              <Text style={styles.featureDesc}>{w.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Tailored for your entire team</Text>
        {ROLES.map((r) => (
          <View key={r.name} style={styles.roleBox}>
            <Ionicons name="people-outline" size={22} color={colors.accent} />
            <Text style={[styles.roleTitle, { marginTop: 8 }]}>{r.name}</Text>
            <Text style={styles.roleDesc}>{r.desc}</Text>
          </View>
        ))}

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Ready to modernize your inventory?</Text>
          <Text style={styles.ctaDesc}>
            Join hundreds of laboratories globally using {systemName} for world-class management.
          </Text>
          <Button label="Create Your Account" onPress={() => navigation.navigate('Register')} />
        </View>

        <View style={styles.footer}>
          <Link styles={styles} label="Privacy Policy" onPress={() => navigation.navigate('Privacy')} />
          <Link styles={styles} label="Terms of Service" onPress={() => navigation.navigate('Terms')} />
          <Link styles={styles} label="Contact Support" onPress={() => navigation.navigate('Support')} />
          <Link styles={styles} label="Documentation" onPress={() => navigation.navigate('Documentation')} />
          <Link styles={styles} label="Help Center" onPress={() => navigation.navigate('HelpCenter')} />
          <Link styles={styles} label="Developed By" onPress={() => setShowDevModal(true)} />
        </View>
        <Text style={styles.copy}>© 2026 {systemName}. All rights reserved.</Text>
      </ScrollView>

      <Modal visible={showDevModal} transparent animationType="fade" onRequestClose={() => setShowDevModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDevModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Pressable style={styles.modalClose} onPress={() => setShowDevModal(false)}>
              <Text style={{ color: colors.muted, fontSize: 24 }}>×</Text>
            </Pressable>
            <Text style={styles.modalBrand}>AppFactory Academy</Text>
            <Text style={styles.modalSubBrand}>Wollo University</Text>
            <Text style={styles.modalTitle}>Proudly Developed By</Text>
            {DEVELOPERS.map((d) => (
              <View key={d.phone} style={styles.devCard}>
                <Text style={styles.devName}>{d.name}</Text>
                <Text style={styles.devDetail}>{d.email}</Text>
                <Text style={styles.devDetail}>📞 {d.phone}</Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navLinks: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    navLink: { color: colors.muted, fontWeight: '700', fontSize: 13 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
    navLogo: { width: 28, height: 28, borderRadius: 6 },
    brand: { color: colors.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.3, flexShrink: 1 },
    navSignIn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    navSignInText: { color: colors.btnText, fontWeight: '800', fontSize: 13 },
    heroImageWrap: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      height: 180,
      backgroundColor: colors.surface2,
    },
    heroImage: { width: '100%', height: '100%' },
    hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
    heroTitle: {
      color: colors.text,
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: -1,
      marginBottom: 10,
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
    body: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: 16,
      marginBottom: 12,
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
    complianceBox: {
      marginHorizontal: 16,
      marginVertical: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    workflowStep: {
      marginHorizontal: 16,
      marginBottom: 10,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    stepNum: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: { color: colors.accent, fontWeight: '900' },
    roleBox: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    roleTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    roleDesc: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
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
    ctaTitle: { color: colors.text, fontWeight: '900', fontSize: 22, marginBottom: 6 },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    modalClose: { alignSelf: 'flex-end', padding: 4 },
    modalBrand: { color: colors.text, fontWeight: '900', fontSize: 20, textAlign: 'center' },
    modalSubBrand: { color: colors.muted, textAlign: 'center', marginBottom: 12 },
    modalTitle: { color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center', marginBottom: 16 },
    devCard: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    devName: { color: colors.text, fontWeight: '800' },
    devDetail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  });
}
