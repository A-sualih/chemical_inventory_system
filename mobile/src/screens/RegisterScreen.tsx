import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { AuthBrandHeader, Button, Input, Screen, ThemeToggleButton } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

type Lab = { _id: string; name: string; lab_code?: string; description?: string };

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { colors, theme } = useTheme();
  const { systemName, orgName, logoUrl, ready } = useBranding();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labId, setLabId] = useState('');
  const [labSearch, setLabSearch] = useState('');
  const [labsLoading, setLabsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLabsLoading(true);
      try {
        const { data } = await api.get('/auth/labs');
        const list: Lab[] = Array.isArray(data) ? data : data.labs || data.data || [];
        setLabs(list);
        // Do not auto-select — user must choose a lab
        setLabId('');
      } catch {
        setError('Could not load laboratories. Check API connection.');
        setLabs([]);
      } finally {
        setLabsLoading(false);
      }
    })();
  }, []);

  const filteredLabs = useMemo(() => {
    const q = labSearch.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter(
      (lab) =>
        lab.name?.toLowerCase().includes(q) ||
        lab.lab_code?.toLowerCase().includes(q) ||
        lab.description?.toLowerCase().includes(q)
    );
  }, [labs, labSearch]);

  const selectedLab = labs.find((l) => l._id === labId);

  const onSubmit = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (!labId) {
      setError('Please choose your home laboratory.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        labId,
      });
      setSuccess(`Account created for ${selectedLab?.name || 'your lab'}. You can sign in now.`);
      setTimeout(() => navigation.navigate('Login'), 1000);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.back}>← Back</Text>
            </Pressable>
            <ThemeToggleButton />
          </View>

          <View style={styles.form}>
            <AuthBrandHeader
              systemName={systemName}
              logoUrl={logoUrl}
              ready={ready}
              title="Create Account"
              subtitle={`Join ${systemName} in ${orgName}`}
            />
            <Text style={styles.label}>Full Name</Text>
            <Input value={name} onChangeText={setName} placeholder="Ahmed Sualih" />
            <Text style={styles.label}>Work Email</Text>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@lab.edu"
            />
            <Text style={styles.label}>Secure Password</Text>
            <Input
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
            />

            <Text style={styles.label}>Primary Laboratory</Text>
            <Text style={styles.hint}>Select the laboratory you belong to.</Text>

            {labs.length > 6 ? (
              <Input
                value={labSearch}
                onChangeText={setLabSearch}
                placeholder="Search labs…"
                autoCapitalize="none"
              />
            ) : null}

            {selectedLab ? (
              <View style={styles.selectedBanner}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={styles.selectedText}>Selected: {selectedLab.name}</Text>
              </View>
            ) : (
              <View style={styles.selectedBannerMuted}>
                <Ionicons name="flask-outline" size={18} color={colors.muted} />
                <Text style={styles.hint}>No lab selected yet</Text>
              </View>
            )}

            <View style={styles.labList}>
              {labsLoading ? (
                <Text style={styles.hint}>Loading laboratories…</Text>
              ) : filteredLabs.length === 0 ? (
                <Text style={styles.hint}>
                  {labs.length === 0
                    ? 'No labs available yet. Ask an admin to create one.'
                    : 'No labs match your search.'}
                </Text>
              ) : (
                filteredLabs.map((lab) => {
                  const selected = labId === lab._id;
                  return (
                    <Pressable
                      key={lab._id}
                      onPress={() => setLabId(lab._id)}
                      style={[styles.labChip, selected && styles.labChipOn]}
                    >
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.labChipText, selected && styles.labChipTextOn]}>
                          {lab.name}
                          {lab.lab_code ? ` (${lab.lab_code})` : ''}
                        </Text>
                        {lab.description ? (
                          <Text style={styles.labDesc} numberOfLines={2}>
                            {lab.description}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.ok}>{success}</Text> : null}

            <Button
              label="Create Account"
              onPress={() => void onSubmit()}
              loading={loading}
              disabled={!labId || labsLoading}
            />
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </Pressable>
          </View>
          <Text style={styles.footerTag}>Secure Access Provided by {orgName}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    back: { color: colors.muted, fontWeight: '700' },
    footerTag: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
      fontSize: 12,
      opacity: 0.8,
    },
    form: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    hint: { color: colors.muted, fontSize: 13, marginBottom: 10, lineHeight: 18 },
    selectedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    selectedBannerMuted: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedText: { color: colors.text, fontWeight: '800', flex: 1 },
    labList: { gap: 8, marginBottom: 12 },
    labChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.surface2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    labChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: colors.accent },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    labChipText: { color: colors.muted, fontWeight: '700' },
    labChipTextOn: { color: colors.text },
    labDesc: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 16 },
    error: { color: colors.danger, marginBottom: 10, fontWeight: '600' },
    ok: { color: colors.success, marginBottom: 10, fontWeight: '700' },
    linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
    linkText: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  });
}
