import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

type Category = {
  id: string;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Category[] = [
  { id: 'overview', title: 'Overview', desc: 'All help topics', icon: 'book-outline' },
  { id: 'getting_started', title: 'Getting Started', desc: 'System basics', icon: 'book-outline' },
  { id: 'chemical_management', title: 'Chemical Management', desc: 'Inventory & batches', icon: 'flask-outline' },
  { id: 'scanner_help', title: 'Scanner Help', desc: 'QR & Barcode usage', icon: 'scan-outline' },
  { id: 'disposal_requests', title: 'Disposal Requests', desc: 'Waste & compliance', icon: 'shield-outline' },
  { id: 'reports_pdfs', title: 'Reports & PDFs', desc: 'Data exports', icon: 'document-text-outline' },
  { id: 'account_settings', title: 'Account Settings', desc: 'Profile & preferences', icon: 'settings-outline' },
  { id: 'emergency_support', title: 'Emergency Support', desc: 'Immediate assistance', icon: 'warning-outline' },
];

export default function HelpCenterScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeSection, setActiveSection] = useState('overview');
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOpenFaqs((p) => ({ ...p, [key]: !p[key] }));

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'getting_started':
        return (
          <>
            <Intro title="What Help Center Means" text="It helps users learn how to use the system, how to solve common problems, and how to manage chemicals safely." />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'gs1',
                  q: 'How do I reset my password?',
                  a: 'Click on "Forgot Password" on the login page and follow the email instructions.',
                },
                {
                  key: 'gs2',
                  q: 'Why is a chemical marked expired?',
                  a: 'The system automatically flags chemicals past their logged expiration date to prevent safety hazards.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
            <Text style={styles.comingSoon}>Video tutorials — System Overview (Coming Soon)</Text>
          </>
        );
      case 'chemical_management':
        return (
          <>
            <Intro
              title="Chemical Management"
              text="Learn how to effectively add, track, and monitor the lifecycle of chemical containers within your laboratory ecosystem."
            />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'cm1',
                  q: 'How to Add Chemicals',
                  a: 'Open Inventory → Add Chemical → enter name, CAS, formula, quantity, location, supplier, expiry → upload SDS → assign batch → Save.',
                },
                {
                  key: 'cm2',
                  q: 'How to Check In / Check Out Chemicals',
                  a: 'Scan or search the container → Check In (quantity, location, notes) or Check Out (quantity, purpose, department) → confirm. Inventory updates automatically.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
            <SafetyCards styles={styles} />
          </>
        );
      case 'scanner_help':
        return (
          <>
            <Intro
              title="Scanner Help"
              text="Master Quick Scan to identify containers, check statuses, and check items in or out securely."
            />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'sc1',
                  q: 'How to Scan QR / Barcodes',
                  a: 'Open Scanner → allow camera → point at code → view details, check in/out, update quantity, transfer, or open SDS.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
            <BulletList
              styles={styles}
              items={[
                'Scanner not working: Ensure camera permissions are active.',
                'QR code not detected: Improve lighting, tap to focus, hold steady.',
              ]}
            />
          </>
        );
      case 'disposal_requests':
        return (
          <>
            <Intro
              title="Disposal Requests"
              text="Route expired or unwanted chemicals through the hazardous waste disposal queue for compliance."
            />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'dr1',
                  q: 'How to Dispose Chemicals',
                  a: 'Open Disposal Management → select chemical → enter quantity, reason, method, compliance notes → review SDS disposal instructions → submit for approval.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
          </>
        );
      case 'reports_pdfs':
        return (
          <>
            <Intro
              title="Reports & PDFs"
              text="Generate exportable data tables and compliance audit trails across the organization."
            />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'rp1',
                  q: 'How to Generate Reports',
                  a: 'Open Reports/Analytics → select type → apply filters (lab, date, status) → Generate → download PDF or Excel.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
            <BulletList styles={styles} items={['PDF not downloading: Check pop-up blocker or regenerate.']} />
          </>
        );
      case 'account_settings':
        return (
          <>
            <Intro
              title="Account Settings"
              text="Manage credentials, laboratories, MFA, and notification preferences."
            />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'as1',
                  q: 'How to Update Profile and Credentials',
                  a: 'Navigate to Account Settings → update email, phone, password → review roles and labs → Save Changes.',
                },
                {
                  key: 'as2',
                  q: 'Managing Notification Preferences',
                  a: 'Go to Notifications in settings → toggle alerts for low inventory, expiries, transfers → save.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
            <BulletList
              styles={styles}
              items={['Login issue: Ensure credentials are correct and you are assigned to an active lab.']}
            />
          </>
        );
      case 'emergency_support':
        return (
          <>
            <Intro
              title="Emergency Support"
              text="Critical documentation for safety protocols, spill mitigation, and emergency contacts."
            />
            <Accordion
              styles={styles}
              items={[
                {
                  key: 'es1',
                  q: 'What to Do in Case of a Chemical Spill',
                  a: 'Evacuate → identify hazards via SDS → report to EHS → mitigate only if trained and equipped.',
                },
                {
                  key: 'es2',
                  q: 'Emergency Contacts',
                  a: 'Campus Security: 911 · EHS: see local directory · Facilities: ventilation/structural emergencies.',
                },
              ]}
              open={openFaqs}
              toggle={toggle}
            />
            <SafetyCards styles={styles} emergency />
          </>
        );
      default:
        return null;
    }
  };

  const content =
    activeSection === 'overview'
      ? CATEGORIES.filter((c) => c.id !== 'overview').map((c) => (
          <View key={c.id} style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>{c.title}</Text>
            {renderSection(c.id)}
          </View>
        ))
      : renderSection(activeSection);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => navigation.navigate('Support')}>
          <Text style={styles.back}>← Support</Text>
        </Pressable>
        <Title style={{ fontSize: 32 }}>
          Help <Text style={{ color: colors.accent }}>Center</Text>
        </Title>

        <Text style={styles.sidebarLabel}>Structure Categories</Text>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setActiveSection(cat.id)}
            style={[styles.catRow, activeSection === cat.id && styles.catRowActive]}
          >
            <Ionicons
              name={cat.icon}
              size={18}
              color={activeSection === cat.id ? colors.accent : colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.catTitle, activeSection === cat.id && { color: colors.accent }]}>
                {cat.title}
              </Text>
              <Text style={styles.catDesc}>{cat.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ))}

        <View style={styles.content}>{content}</View>
      </ScrollView>
    </Screen>
  );
}

function Intro({ title, text }: { title: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18, marginBottom: 6 }}>{title}</Text>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function Accordion({
  styles,
  items,
  open,
  toggle,
}: {
  styles: ReturnType<typeof makeStyles>;
  items: { key: string; q: string; a: string }[];
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      {items.map((item) => (
        <View key={item.key} style={styles.faqRow}>
          <Pressable onPress={() => toggle(item.key)} style={styles.faqQuestion}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Ionicons
              name={open[item.key] ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={styles.faqQ.color}
            />
          </Pressable>
          {open[item.key] ? <Text style={styles.faqA}>{item.a}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function BulletList({ styles, items }: { styles: ReturnType<typeof makeStyles>; items: string[] }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {items.map((item) => (
        <Text key={item} style={styles.bullet}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

function SafetyCards({ styles, emergency }: { styles: ReturnType<typeof makeStyles>; emergency?: boolean }) {
  const cards = emergency
    ? [
        ['PPE requirements', 'Goggles, lab coats, and appropriate gloves are mandatory in all active use areas.'],
        ['Spill response steps', 'Evacuate, isolate, and refer to Emergency Oversight for cleanup protocols.'],
      ]
    : [
        ['Chemical handling rules', 'Always review the SDS before handling and ensure incompatible classes are separated.'],
        ['Hazard labels meaning', 'Reference GHS pictograms and the NFPA diamond in the SDS tab for accurate hazard levels.'],
      ];
  return (
    <View style={{ gap: 8 }}>
      {cards.map(([t, d]) => (
        <View key={t} style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>{t}</Text>
          <Text style={styles.faqA}>{d}</Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
    sidebarLabel: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 8,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    catRowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    catTitle: { color: colors.text, fontWeight: '800' },
    catDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
    content: { marginTop: 20 },
    sectionBlock: {
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionHeading: {
      color: colors.accent,
      fontWeight: '900',
      fontSize: 20,
      marginBottom: 12,
    },
    faqRow: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    faqQuestion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      gap: 8,
    },
    faqQ: { color: colors.text, fontWeight: '800', flex: 1 },
    faqA: { color: colors.muted, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14 },
    comingSoon: { color: colors.muted, fontStyle: 'italic', marginBottom: 12 },
    bullet: { color: colors.muted, lineHeight: 20, marginBottom: 4 },
    safetyCard: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    safetyTitle: { color: colors.text, fontWeight: '800', marginBottom: 4 },
  });
}
