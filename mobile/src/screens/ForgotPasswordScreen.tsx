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
import { StatusBar } from 'expo-status-bar';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useBranding } from '../hooks/useBranding';
import { AuthBrandHeader, Button, Input, Screen, ThemeToggleButton } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { colors, theme } = useTheme();
  const { orgName, logoUrl, systemName, ready } = useBranding();
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
      const { data } = await api.post('/auth/reset-password', { email: email.trim() });
      setSuccess(
        data?.message ||
          'If that email matches an account, we have sent a reset link to it.'
      );
    } catch (e: any) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.wrap}>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back to sign in</Text>
        </Pressable>
        <ThemeToggleButton />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <AuthBrandHeader
            systemName={systemName}
            logoUrl={logoUrl}
            ready={ready}
            title="Reset Password"
            subtitle="Enter your email for the recovery link."
          />
          <Text style={styles.label}>Email Address</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="name@company.com"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.ok}>{success}</Text> : null}
          <Button label="Send Reset Link" onPress={() => void onSubmit()} loading={loading} />
          <Pressable onPress={() => navigation.navigate('ResetPassword')} style={styles.linkBtn}>
            <Text style={styles.linkText}>I already have a reset token</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <Text style={styles.footerTag}>Secure Access Provided by {orgName}</Text>
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
    ok: { color: colors.success, marginBottom: 10, fontWeight: '700', lineHeight: 18 },
    linkBtn: { alignItems: 'center', paddingVertical: 14 },
    linkText: { color: colors.accent, fontWeight: '800' },
    footerTag: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 20,
      fontSize: 12,
      opacity: 0.8,
    },
  });
}
