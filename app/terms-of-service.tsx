import React from 'react';
import { LegalDocumentLayout } from '../components/LegalDocumentLayout';
import { TERMS_OF_SERVICE_SECTIONS } from '../constants/legalInAppCopy';

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      intro="Rules for using RecoveryRoad. If anything here conflicts with your app store’s terms, the store terms may also apply to purchases."
      sections={TERMS_OF_SERVICE_SECTIONS}
    />
  );
}
