import React from 'react';
import { PublicPageShell, PublicParagraph, PublicSection } from '../components/PublicPageShell';

export default function PrivacyScreen() {
  return (
    <PublicPageShell
      title="Privacy"
      highlight="Policy"
      subtitle="How we protect and handle your laboratory data."
    >
      <PublicSection title="1. Data Collection">
        <PublicParagraph>
          We collect essential laboratory data including chemical names, quantities, locations, and
          user activity logs to facilitate system functionality.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="2. Security Measures">
        <PublicParagraph>
          All data is encrypted in transit and at rest using AES-256 standard. Multi-Factor
          Authentication (MFA) is enforced for administrative roles.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="3. Data Sharing">
        <PublicParagraph>
          We do not sell or share your laboratory data with third parties. Data access is restricted
          based on lab-specific permissions.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="4. Compliance">
        <PublicParagraph>
          This system is designed to meet institutional safety audit requirements and chemical
          reporting standards.
        </PublicParagraph>
      </PublicSection>
    </PublicPageShell>
  );
}
