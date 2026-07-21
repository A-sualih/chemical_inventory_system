import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Screen, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function LearnMoreScreen() {
  const navigation = useNavigation<any>();
  return (
    <Screen>
      <ScrollView>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Title>Learn more</Title>
        <Text style={styles.lead}>
          CIMS PRO connects mobile field work with the same secure backend used by the web
          dashboard — JWT auth, lab isolation, and role-based permissions.
        </Text>

        {[
          ['Scan & stock', 'Look up containers by QR/barcode and check chemicals in or out on site.'],
          ['Lab scope', 'Every list and action is filtered to your active laboratory.'],
          ['Safety first', 'See hazards, PPE, expiry risk, and disposal queues from your phone.'],
          ['One account', 'Register once, sign in on web or mobile with the same credentials.'],
        ].map(([t, d]) => (
          <View key={t} style={styles.card}>
            <Text style={styles.h}>{t}</Text>
            <Text style={styles.p}>{d}</Text>
          </View>
        ))}

        <Button label="Create Account" onPress={() => navigation.navigate('Register')} />
        <View style={{ height: 8 }} />
        <Button label="Sign In" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
  lead: { color: colors.muted, lineHeight: 21, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  h: { color: colors.text, fontWeight: '800', marginBottom: 4 },
  p: { color: colors.muted, lineHeight: 18 },
});
