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
import { StatusBar } from 'expo-status-bar';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

type Lab = { _id: string; name: string; lab_code?: string };

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labId, setLabId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auth/labs');
        const list = Array.isArray(data) ? data : data.labs || [];
        setLabs(list);
        if (list[0]?._id) setLabId(list[0]._id);
      } catch {
        setError('Could not load laboratories. Check API connection.');
      }
    })();
  }, []);

  const onSubmit = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim() || !password || !labId) {
      setError('Name, email, password, and laboratory are required.');
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
      setSuccess('Account created. You can sign in now.');
      setTimeout(() => navigation.navigate('Login'), 900);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Title>Create Account</Title>
          <Text style={styles.sub}>Join CIMS PRO — same registration as the website</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full name</Text>
            <Input value={name} onChangeText={setName} placeholder="Jane Scientist" />
            <Text style={styles.label}>Work email</Text>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@lab.edu"
            />
            <Text style={styles.label}>Password</Text>
            <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />

            <Text style={styles.label}>Primary laboratory</Text>
            <View style={styles.labList}>
              {labs.map((lab) => {
                const selected = labId === lab._id;
                return (
                  <Pressable
                    key={lab._id}
                    onPress={() => setLabId(lab._id)}
                    style={[styles.labChip, selected && styles.labChipOn]}
                  >
                    <Text style={[styles.labChipText, selected && styles.labChipTextOn]}>
                      {lab.name}
                      {lab.lab_code ? ` (${lab.lab_code})` : ''}
                    </Text>
                  </Pressable>
                );
              })}
              {labs.length === 0 ? (
                <Text style={styles.hint}>No labs available yet. Ask an admin to create one.</Text>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.ok}>{success}</Text> : null}

            <Button label="Create Account" onPress={() => void onSubmit()} loading={loading} />
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
    sub: { color: colors.muted, marginBottom: 16 },
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
    labList: { gap: 8, marginBottom: 12 },
    labChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.surface2,
    },
    labChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    labChipText: { color: colors.muted, fontWeight: '700' },
    labChipTextOn: { color: colors.text },
    hint: { color: colors.muted, fontSize: 13 },
    error: { color: colors.danger, marginBottom: 10, fontWeight: '600' },
    ok: { color: colors.success, marginBottom: 10, fontWeight: '700' },
    linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
    linkText: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  });
}
