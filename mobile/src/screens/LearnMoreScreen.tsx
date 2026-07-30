import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function LearnMoreScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [systemName, setSystemName] = useState('CIMS PRO');
  const [orgName, setOrgName] = useState('Managed Stack');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        const s = data?.settings || data || {};
        if (s.systemName) setSystemName(s.systemName);
        if (s.orgName) setOrgName(s.orgName);
      } catch {
        /* defaults */
      }
    })();
  }, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back to Home</Text>
        </Pressable>

        <Title style={{ fontSize: 32 }}>
          Deep Dive into <Text style={{ color: colors.accent }}>{systemName}</Text>
        </Title>
        <Text style={styles.sub}>
          The standard for modern laboratory chemical management and safety compliance.
        </Text>

        <Badge styles={styles} text="Platform Overview" />
        <Text style={styles.h2}>Why {systemName} Exists</Text>
        <Text style={styles.p}>
          {systemName} is a centralized chemical inventory platform designed to improve laboratory
          safety, inventory visibility, compliance monitoring, and multi-lab management. Built for
          researchers, by engineers who understand the complexities of modern science.
        </Text>

        <Badge styles={styles} text="The Problem" tone="warn" />
        <Text style={styles.h2}>Laboratory Challenges</Text>
        {[
          ['Manual Errors', 'Inaccurate paper logs leading to inventory discrepancy.'],
          ['Chemical Loss', 'Inability to track the exact location of high-value reagents.'],
          ['Expired Agents', 'Risk of using degraded chemicals in critical experiments.'],
          ['Poor Disposal', 'Lack of audit trails for hazardous waste management.'],
        ].map(([t, d]) => (
          <View key={t} style={styles.challenge}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>{t}</Text>
              <Text style={styles.p}>{d}</Text>
            </View>
          </View>
        ))}

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>How we solve it</Text>
          <Text style={styles.p}>
            Our digital twin architecture ensures every milliliter is accounted for, from arrival to
            disposal.
          </Text>
        </View>

        <Badge styles={styles} text="Capabilities" />
        <Text style={styles.h2}>Core Features</Text>
        {[
          ['Chemical Tracking', 'Real-time volume and mass tracking with automated density calculations.'],
          ['Batch Management', 'Track shelf life and manufacturer lots to ensure experimental reproducibility.'],
          ['Disposal Workflows', 'Comprehensive waste requisition queues with supervisor approval steps.'],
          ['SDS Management', 'Cloud-synced Safety Data Sheets accessible via QR code at any station.'],
        ].map(([t, d]) => (
          <View key={t} style={styles.featureRow}>
            <Text style={styles.featureTitle}>{t}</Text>
            <Text style={styles.p}>{d}</Text>
          </View>
        ))}

        <Badge styles={styles} text="Institutional Scale" />
        <Text style={styles.h2}>Multi-Lab Management</Text>
        {[
          'Department Isolation: Keep independent labs separate and secure.',
          'Central Administration: Institutional-wide visibility for safety officers.',
          'Cross-Lab Transfers: Request materials from partner labs with one click.',
          'Role-Based Access: Granular permissions tailored to each researcher.',
        ].map((item) => (
          <View key={item} style={styles.checkRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={styles.p}>{item}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Structured for Your Entire Team</Text>
        {[
          ['Admin', 'System-wide management, security, and global configuration.'],
          ['Lab Manager', 'Controls inventory cycles, approvals, and specific lab parameters.'],
          ['Technician', 'Daily operations, scanning, consumption updates, and transfers.'],
          ['Safety Manager', 'Monitors compliance, audits SDS, and reviews disposal logs.'],
        ].map(([role, desc]) => (
          <View key={role} style={styles.roleRow}>
            <Text style={styles.roleName}>{role}</Text>
            <Text style={styles.p}>{desc}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Streamlined Lifecycle Workflow</Text>
        {[
          'Register Chemical',
          'Assign Batch',
          'Track Containers',
          'Monitor Inventory',
          'Transfer / Request',
          'Dispose Safely',
        ].map((step, i, arr) => (
          <View key={step}>
            <View style={styles.workflowStep}>
              <Text style={styles.workflowText}>{step}</Text>
            </View>
            {i < arr.length - 1 ? <Text style={styles.arrow}>↓</Text> : null}
          </View>
        ))}

        <Text style={styles.h2}>Technology & Security</Text>
        <View style={styles.techGrid}>
          <TechCard styles={styles} title="Frontend" desc="React 18 + Vite + Tailwind" />
          <TechCard styles={styles} title="Backend" desc="Node.js + Express + MongoDB" />
          <TechCard styles={styles} title="Security" desc="JWT MFA + AES-256 Encryption" />
        </View>

        <Badge styles={styles} text="Roadmap" tone="accent" />
        <Text style={styles.h2}>Future Vision</Text>
        {[
          ['AI Inventory', 'Advanced prediction for procurement cycles.'],
          ['IoT Integration', 'Smart sensors for real-time temperature monitoring.'],
          ['Mobile App', 'Native iOS/Android scanning applications.'],
        ].map(([t, d]) => (
          <View key={t} style={styles.roadmapItem}>
            <Text style={styles.featureTitle}>{t}</Text>
            <Text style={styles.p}>{d}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>{systemName}</Text>
          <Text style={styles.p}>
            Developed to institutionalize safety and precision in modern laboratories under {orgName}.
          </Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => navigation.navigate('Documentation')}>
              <Text style={styles.link}>Documentation</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Support')}>
              <Text style={styles.link}>Support</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Privacy')}>
              <Text style={styles.link}>Privacy Policy</Text>
            </Pressable>
          </View>
          <Text style={styles.copy}>
            © 2026 {systemName} | {orgName}
          </Text>
        </View>

        <Button label="Open an account" onPress={() => navigation.navigate('Register')} />
        <View style={{ height: 8 }} />
        <Button label="Log in" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </ScrollView>
    </Screen>
  );
}

function Badge({
  styles,
  text,
  tone,
}: {
  styles: ReturnType<typeof makeStyles>;
  text: string;
  tone?: 'warn' | 'accent';
}) {
  return <Text style={[styles.badge, tone === 'warn' && styles.badgeWarn, tone === 'accent' && styles.badgeAccent]}>{text}</Text>;
}

function TechCard({
  styles,
  title,
  desc,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.techCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.p}>{desc}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
    sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 20 },
    badge: {
      alignSelf: 'flex-start',
      color: colors.accent,
      fontWeight: '800',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 6,
    },
    badgeWarn: { color: colors.warn },
    badgeAccent: { color: colors.accent },
    h2: { color: colors.text, fontWeight: '900', fontSize: 22, marginBottom: 8, marginTop: 4 },
    p: { color: colors.muted, lineHeight: 21, marginBottom: 8 },
    challenge: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    challengeTitle: { color: colors.text, fontWeight: '800', marginBottom: 2 },
    banner: {
      backgroundColor: colors.surface2,
      borderRadius: 16,
      padding: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bannerTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginBottom: 6 },
    featureRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 12,
    },
    featureTitle: { color: colors.text, fontWeight: '800', marginBottom: 4 },
    checkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
    roleRow: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleName: { color: colors.text, fontWeight: '900', marginBottom: 4 },
    workflowStep: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    workflowText: { color: colors.text, fontWeight: '800' },
    arrow: { textAlign: 'center', color: colors.muted, marginVertical: 4 },
    techGrid: { gap: 10, marginBottom: 8 },
    techCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roadmapItem: { marginBottom: 12 },
    footer: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerBrand: { color: colors.text, fontWeight: '900', fontSize: 24, marginBottom: 8 },
    footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginVertical: 12 },
    link: { color: colors.accent, fontWeight: '700' },
    copy: { color: colors.muted, fontSize: 12, opacity: 0.8 },
  });
}
