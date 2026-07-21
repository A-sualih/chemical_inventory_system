import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function TermsScreen() {
  const navigation = useNavigation<any>();
  return (
    <Screen>
      <ScrollView>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Title>Terms of Service</Title>
        <Text style={styles.p}>
          By using CIMS PRO you agree to use the system only for authorized laboratory inventory and
          safety operations within your institution.
        </Text>
        <Text style={styles.h}>Accounts</Text>
        <Text style={styles.p}>
          You are responsible for protecting your credentials and for actions taken under your
          account. MFA may be required by policy.
        </Text>
        <Text style={styles.h}>Acceptable use</Text>
        <Text style={styles.p}>
          Do not attempt to access labs or records outside your assignment, bypass security controls,
          or misuse hazardous-material workflows.
        </Text>
        <Text style={styles.h}>Availability</Text>
        <Text style={styles.p}>
          The service is provided as-is for institutional use. Critical lab decisions should follow
          your organization’s safety policies.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontWeight: '700', marginBottom: 12 },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 16, marginBottom: 6 },
  p: { color: colors.muted, lineHeight: 20, marginBottom: 8 },
});
