import React from 'react';
import { PublicPageShell, PublicParagraph, PublicSection } from '../components/PublicPageShell';

export default function TermsScreen() {
  return (
    <PublicPageShell
      title="Terms of"
      highlight="Service"
      subtitle="Operating guidelines for institutional chemical management."
    >
      <PublicSection title="1. Use of Service">
        <PublicParagraph>
          Users must use the system exclusively for authorized laboratory inventory tracking and
          safety management.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="2. Accountability">
        <PublicParagraph>
          Users are responsible for the accuracy of chemical entries, consumption updates, and
          disposal requisitions.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="3. Prohibited Actions">
        <PublicParagraph>
          Circumventing laboratory isolation or attempting unauthorized data extraction is strictly
          prohibited.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="4. Termination">
        <PublicParagraph>
          Institutional administrators reserve the right to revoke access for non-compliance with
          safety protocols.
        </PublicParagraph>
      </PublicSection>
    </PublicPageShell>
  );
}
