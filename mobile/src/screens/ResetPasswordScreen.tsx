import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [token, setToken] = useState(route.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError('');
    setSuccess('');
    if (!token.trim()) {
      setError('Paste the reset token from your email link.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${encodeURIComponent(token.trim())}`, {
        newPassword: password,
      });
      setSuccess('Password updated. You can sign in now.');
      setTimeout(() => navigation.navigate('Login'), 900);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Reset failed — token may be expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.wrap}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.back}>← Back to Sign In</Text>
        </Pressable>
        <Title>Reset password</Title>
        <Text style={styles.sub}>
          Paste the token from the email link, then choose a new password.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Reset token</Text>
          <Input
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
            placeholder="Token from email"
          />
          <Text style={styles.label}>New password</Text>
          <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          <Text style={styles.label}>Confirm password</Text>
          <Input secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="••••••••" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.ok}>{success}</Text> : null}
          <Button label="Update password" onPress={() => void onSubmit()} loading={loading} />
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
    ok: { color: colors.success, marginBottom: 10, fontWeight: '700' },
  });
}
