import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Enter your work email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim() });
      setSuccess(
        'If that email exists, a reset link was sent. Check your inbox, then use Reset with token.'
      );
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.wrap}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back to Sign In</Text>
        </Pressable>
        <Title>Forgot password</Title>
        <Text style={styles.sub}>We’ll email a reset link — same flow as the website.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@lab.edu"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.ok}>{success}</Text> : null}
          <Button label="Send reset email" onPress={() => void onSubmit()} loading={loading} />
          <Pressable onPress={() => navigation.navigate('ResetPassword')} style={styles.linkBtn}>
            <Text style={styles.linkText}>I already have a reset token</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { justifyContent: 'center' },
    back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
    sub: { color: colors.muted, marginBottom: 16, lineHeight: 20 },
    form: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    error: { color: colors.danger, marginBottom: 10, fontWeight: '600' },
    ok: { color: colors.success, marginBottom: 10, fontWeight: '700', lineHeight: 18 },
    linkBtn: { alignItems: 'center', paddingVertical: 14 },
    linkText: { color: colors.accent, fontWeight: '800' },
  });
}
