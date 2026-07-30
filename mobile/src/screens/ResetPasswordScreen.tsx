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
import { StatusBar } from 'expo-status-bar';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useBranding } from '../hooks/useBranding';
import { AuthBrandHeader, Button, Input, Screen, ThemeToggleButton } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, theme } = useTheme();
  const { systemName, orgName, logoUrl, ready } = useBranding();
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
      setError('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${encodeURIComponent(token.trim())}`, {
        newPassword: password,
      });
      setSuccess(data?.message || 'Password reset successfully!');
      setTimeout(() => navigation.navigate('Login'), 3000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.wrap}>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.back}>← Return to Login</Text>
        </Pressable>
        <ThemeToggleButton />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <AuthBrandHeader
            systemName={systemName}
            logoUrl={logoUrl}
            ready={ready}
            title="Set New Password"
            subtitle="Enter your new secure password below."
          />

          {success ? (
            <>
              <Text style={styles.ok}>{success}</Text>
              <Text style={styles.hint}>Redirecting to login page...</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Email token</Text>
              <Input
                autoCapitalize="none"
                value={token}
                onChangeText={setToken}
                placeholder="Token from email"
              />
              <Text style={styles.label}>New Password</Text>
              <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
              <Text style={styles.label}>Confirm Password</Text>
              <Input secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="••••••••" />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Reset Password" onPress={() => void onSubmit()} loading={loading} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      <Text style={styles.footerTag}>{systemName} · {orgName}</Text>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { justifyContent: 'center' },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    back: { color: colors.muted, fontWeight: '700' },
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
    ok: { color: colors.success, marginBottom: 10, fontWeight: '700', textAlign: 'center' },
    hint: { color: colors.muted, textAlign: 'center', fontSize: 13 },
    footerTag: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 20,
      fontSize: 12,
      opacity: 0.8,
    },
  });
}
