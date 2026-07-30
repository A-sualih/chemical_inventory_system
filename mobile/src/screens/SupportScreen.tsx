import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'] as const;

export default function SupportScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '',
    subject: '',
    message: '',
    priority: 'Low' as (typeof PRIORITIES)[number],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleClear = () => {
    setFormData({
      fullName: '',
      email: '',
      department: '',
      subject: '',
      message: '',
      priority: 'Low',
    });
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('Name, email, subject, and message are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/public/support', formData);
      if (res.data.success) {
        setSubmitted(true);
        handleClear();
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.successWrap}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} style={{ marginBottom: 16 }} />
          <Title>
            Request <Text style={{ color: colors.accent }}>Received</Text>
          </Title>
          <Text style={styles.sub}>
            Thank you for contacting us. Our support team will review your request and get back to you
            shortly.
          </Text>
          <Button label="Send Another Message" onPress={() => setSubmitted(false)} />
          <View style={{ height: 8 }} />
          <Button label="Back to Home" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Title style={{ fontSize: 32 }}>
          Contact <Text style={{ color: colors.accent }}>Support</Text>
        </Title>
        <Text style={styles.sub}>
          We're here to help you maintain a safe and organized lab. Submit a request below or reach
          out via our direct channels.
        </Text>

        <View style={styles.contactGrid}>
          <ContactCard
            styles={styles}
            icon="mail-outline"
            title="Email Us"
            desc="amir.mesfin136@gmail.com"
            color={colors.accent}
          />
          <Pressable onPress={() => navigation.navigate('HelpCenter')}>
            <ContactCard
              styles={styles}
              icon="help-circle-outline"
              title="Help Center"
              desc="Search our knowledge base"
              color={colors.accent}
            />
          </Pressable>
          <ContactCard
            styles={styles}
            icon="call-outline"
            title="Hotline"
            desc="(+251) 962945025"
            color={colors.danger}
          />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <Input
            value={formData.fullName}
            onChangeText={(v) => setFormData((p) => ({ ...p, fullName: v }))}
            placeholder="amir mesfin"
          />
          <Text style={styles.label}>Email Address</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(v) => setFormData((p) => ({ ...p, email: v }))}
            placeholder="amir.mesfin136@gmail.com"
          />
          <Text style={styles.label}>Department / Lab</Text>
          <Input
            value={formData.department}
            onChangeText={(v) => setFormData((p) => ({ ...p, department: v }))}
            placeholder="e.g. Bio-Chemistry Lab 4"
          />
          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setFormData((f) => ({ ...f, priority: p }))}
                style={[styles.priorityChip, formData.priority === p && styles.priorityChipOn]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    formData.priority === p && styles.priorityTextOn,
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Subject</Text>
          <Input
            value={formData.subject}
            onChangeText={(v) => setFormData((p) => ({ ...p, subject: v }))}
            placeholder="How can we help?"
          />
          <Text style={styles.label}>Message</Text>
          <Input
            value={formData.message}
            onChangeText={(v) => setFormData((p) => ({ ...p, message: v }))}
            placeholder="Provide details about your inquiry..."
            multiline
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={isSubmitting ? 'Sending…' : 'Send Support Request'}
            onPress={() => void handleSubmit()}
            loading={isSubmitting}
          />
          <Button label="Clear" variant="ghost" onPress={handleClear} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ContactCard({
  styles,
  icon,
  title,
  desc,
  color,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <View style={styles.contactCard}>
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.contactTitle}>{title}</Text>
      <Text style={styles.contactDesc}>{desc}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
    sub: { color: colors.muted, lineHeight: 21, marginTop: 8, marginBottom: 16 },
    successWrap: { alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
    contactGrid: { gap: 10, marginBottom: 20 },
    contactCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    contactTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 8 },
    contactDesc: { color: colors.muted, marginTop: 4 },
    form: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    priorityChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    priorityChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    priorityText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
    priorityTextOn: { color: colors.accent },
    error: { color: colors.danger, marginBottom: 10, fontWeight: '600' },
  });
}
