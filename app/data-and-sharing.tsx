import React from 'react';
import { LegalDocumentLayout } from '../components/LegalDocumentLayout';
import { DATA_AND_SHARING_SECTIONS } from '../constants/legalInAppCopy';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';

export default function DataAndSharingScreen() {
  const intro = arePeerPracticeFeaturesEnabled()
    ? 'What stays on your device, what you can choose to share when optional social features are enabled, and how those optional features relate to consent.'
    : 'What stays on your device, what you can export or share manually, and how your privacy choices work in this self-contained build.';

  return (
    <LegalDocumentLayout
      title="Your data & sharing"
      intro={intro}
      sections={DATA_AND_SHARING_SECTIONS}
    />
  );
}
