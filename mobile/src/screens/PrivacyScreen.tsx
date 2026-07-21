import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Title } from '../components/ui';
import { colors } from '../theme/colors';

export default function PrivacyScreen() {
  const navigation = useNavigation<any>();
  return (
    <Screen>
      <ScrollView>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Title>Privacy Policy</Title>
        <Text style={styles.p}>
          CIMS PRO processes account, lab assignment, and inventory activity data to operate the
          chemical inventory platform. Data is scoped by laboratory where applicable.
        </Text>
        <Text style={styles.h}>What we collect</Text>
        <Text style={styles.p}>
          Name, work email, role, lab membership, and operational records you create (chemicals,
          containers, requests, scans, and related audit events).
        </Text>
        <Text style={styles.h}>How we use it</Text>
        <Text style={styles.p}>
          To authenticate users, enforce RBAC, keep inventory accurate, send security/MFA and alert
          emails, and meet institutional compliance needs.
        </Text>
        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>
          For privacy questions, use Support in the app or contact your institution administrator.
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
