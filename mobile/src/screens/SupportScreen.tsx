import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { Button, Input, Screen, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function SupportScreen() {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setStatus('');
    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Name, email, subject, and message are required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/public/support', {
        fullName: fullName.trim(),
        email: email.trim(),
        department: department.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        priority: 'normal',
      });
      setStatus('Support request sent. We will get back to you by email.');
      setSubject('');
      setMessage('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send support request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Title>Support</Title>
        <Text style={styles.sub}>Same public support form as the website</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <Input value={fullName} onChangeText={setFullName} placeholder="Your name" />
          <Text style={styles.label}>Email</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@lab.edu"
          />
          <Text style={styles.label}>Department</Text>
          <Input value={department} onChangeText={setDepartment} placeholder="Optional" />
          <Text style={styles.label}>Subject</Text>
          <Input value={subject} onChangeText={setSubject} placeholder="How can we help?" />
          <Text style={styles.label}>Message</Text>
          <Input
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the issue"
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {status ? <Text style={styles.ok}>{status}</Text> : null}
          <Button label="Send message" onPress={() => void submit()} loading={loading} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
  sub: { color: colors.muted, marginBottom: 16 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 24,
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
