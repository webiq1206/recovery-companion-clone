export const IN_APP_LEGAL_LAST_UPDATED = 'April 16, 2026';

/** https://recoveryroad.app/privacy — line after "This document describes our practices as of the date shown above." */
export const PRIVACY_POLICY_FOOTER_QUESTIONS_LINE =
  'Questions? Contact us via the developer support link on the RecoveryRoad page in the Apple App Store or Google Play.';

export type LegalSection = { heading: string; body: string };

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    body:
      'This Privacy Policy ("Policy") describes how RecoveryRoad (the publisher identified on your Apple App Store or Google Play download page) handles information when you use the RecoveryRoad mobile application ("App").\n\n' +
      'By downloading or using the App, you agree to this Policy. If you do not agree, please uninstall the App and do not use it.',
  },
  {
    heading: 'Wellness support only',
    body:
      'RecoveryRoad is a self-help and wellness support tool. It is not medical advice, diagnosis, or treatment; not a medical device; not psychotherapy, telehealth, or crisis care; and not a substitute for qualified professionals or emergency services.\n\n' +
      'Nothing in this Policy changes the nature of the App.',
  },
  {
    heading: 'Accounts and where your recovery data lives',
    body:
      'For everyday use, the App does not create a RecoveryRoad-hosted cloud login, hosted recovery profile, or central account database operated by us.\n\n' +
      'Your recovery-related content (such as check-ins, journal entries, plans, and preferences) is stored on your device unless a feature you actively use sends specific information elsewhere, as described below.\n\n' +
      'Delete account: Settings includes a flow labeled "Delete account." That action permanently erases the categories of locally stored App data listed in the confirmation dialog on this device. It is how you remove your App data from the device; it is not a remote server "account deletion" for core journaling because those records are not stored on our servers by default.\n\n' +
      'Apple, Google, and (when enabled) RevenueCat may still retain purchase and billing records under your store account or pseudonymous billing identifier, as described in the Data sharing section.\n\n' +
      "If you'd like us to delete all information tied to your account, you can request us to do so by emailing us at support@recoveryroad.app.",
  },
  {
    heading: 'Information we collect',
    body:
      'Depending on how you use the App, we process the following categories of information:\n\n' +
      'Account and profile information. Information you choose to enter, such as display name, goals, sobriety or milestone dates, triggers, support contacts, privacy preferences, and similar profile fields.\n\n' +
      'Recovery and wellness content. Daily check-ins, mood or stability-related inputs you log, journal text, pledges, workbook answers, rebuild or accountability program data, timeline or relapse-related notes, media you attach within the App, and emergency or support contacts you save.\n\n' +
      'App usage and preferences. Settings such as notification preferences, engagement or streak data stored for reminders, optional security preferences, optional app lock (PIN) configuration, and related app state.\n\n' +
      'Device and session identifiers (limited contexts).\n' +
      '• A pseudonymous app user identifier is created and stored on your device for native in-app purchases when the subscription SDK is configured. It is used with Apple, Google, and RevenueCat as described under Purchases.\n' +
      '• If live community or recovery rooms are enabled for your build, the App uses a stable per-install identifier stored in the device keychain (or equivalent secure storage) and a session token stored on-device to communicate with that service. Optional linking may send the same pseudonymous purchase identifier to that service so sessions can be re-associated after reinstall, as documented for operators.\n\n' +
      'Subscription and purchase data. Product identifiers, prices shown at purchase, entitlement state, and renewal timing as returned by the app stores and (when configured) RevenueCat, cached on your device so the App can unlock features.\n\n' +
      'Optional on-device security diagnostics. If you turn on the "anonymized analytics buffer" in Security settings, the App stores security-related event metadata only on your device in protected storage. The App does not upload that buffer to us.\n\n' +
      'Motion data (shake gesture). The App may read short accelerometer samples on the device to detect an optional shake gesture that opens crisis resources. Those samples are used transiently for gesture detection; they are not written to your journal and are not sent to our servers by this App.\n\n' +
      'Information you deliberately send elsewhere. If you use your device Share sheet, copy to clipboard, or similar flows from supported screens, information goes only to the destination you choose.',
  },
  {
    heading: 'Information we do not collect (by default)',
    body:
      'In the standard consumer configuration:\n\n' +
      '• We do not operate third-party advertising analytics (such as ad networks) inside this App.\n\n' +
      '• We do not use your recovery journal or check-ins for cross-app advertising "tracking" on behalf of advertisers.\n\n' +
      "• We do not upload your recovery journal or check-in text to a RecoveryRoad-operated cloud database for core features. (Optional online community or recovery-room features, when enabled in a given build, send only the content you submit to that feature to the configured operator's servers.)\n\n" +
      '• The App does not currently call a separate RecoveryRoad HTTP API for syncing your journal; optional backend code may exist for future or custom integrations — if you enable such an integration, treat it as a separate disclosure.\n\n' +
      'If your organization ships a custom build with additional backends, those practices must be disclosed separately.',
  },
  {
    heading: 'How we use your information',
    body:
      'We use the information above only as needed to:\n\n' +
      '• Provide app functionality, including saving your entries locally, showing progress views, and running reminders you request.\n\n' +
      '• Personalize prompts, reminders, and on-device insights based on your stored preferences and history.\n\n' +
      '• Operate security features you enable, such as app lock, audit logging, and the optional on-device diagnostics buffer.\n\n' +
      '• Validate subscriptions and unlock paid features through Apple, Google, and (when configured) RevenueCat.\n\n' +
      '• Deliver optional community or recovery-room features when that mode is enabled, including moderation and safety workflows run by the configured API operator.\n\n' +
      '• Comply with law if we reasonably believe we must, for information actually in our possession (most journal content remains on your device unless you transmitted it to a third party or optional backend).\n\n' +
      'We do not sell your personal information as a product.',
  },
  {
    heading: 'Data storage and location',
    body:
      'On your device. Most App data — including journal entries, check-ins, profile fields, and engagement history — is stored in the application sandbox (AsyncStorage or equivalent) on your phone or tablet. Some sensitive values (such as optional PIN-related material and parts of security diagnostics) use the operating system\'s secure storage (for example iOS Keychain / Android Keystore) where supported. Certain values may additionally be encrypted at the application layer before being written to local storage.\n\n' +
      'On servers. By default, your full recovery journal is not stored on servers we operate for routine personal use of the App.\n\n' +
      "When live community or recovery rooms are enabled for the version of the App you are using (the publisher configures this at release), posts, comments, room messages, moderation reports, and related profile fields you submit are transmitted over HTTPS to and stored by that service's operator under their infrastructure and retention rules.\n\n" +
      'Platform backups. iCloud Backup, Google backup, or computer backups may copy App data according to your device settings. We do not control those backups.',
  },
  {
    heading: 'Notifications',
    body:
      'The App schedules local notifications on your device for reminders you enable (for example check-in nudges). Granting notification permission allows the operating system to display those scheduled messages.\n\n' +
      'We do not operate a separate marketing push-notification service for those core wellness reminders.',
  },
  {
    heading: 'Data sharing',
    body:
      'We disclose information only as described here:\n\n' +
      'Apple and Google. In-app purchases, receipts, and platform services are processed by Apple and/or Google. They receive billing and account information under their own policies.\n\n' +
      'RevenueCat, Inc. When the App is built with a RevenueCat SDK key, RevenueCat receives subscription-related data (such as product identifiers and transaction status) and the pseudonymous on-device app user ID used to tie entitlements across installs. RevenueCat does not receive your recovery journal text from us as part of that integration.\n\n' +
      'Optional live social API operator. When live community or recovery rooms are enabled, the operator of the configured API receives the content you submit, session tokens, identifiers needed for moderation and safety, and related technical metadata sent over HTTPS.\n\n' +
      'Share sheet and clipboard. When you export or share content, it goes to the app or person you select; we do not receive a hidden copy on our servers.\n\n' +
      'Legal requests. We may disclose information we hold if required by applicable law, regulation, legal process, or governmental request, where permitted.\n\n' +
      'We do not intentionally disclose your on-device recovery journal to advertisers.',
  },
  {
    heading: 'Data retention',
    body:
      'On-device data remains until you delete it, overwrite it, use the in-app delete flow, or remove the App (subject to platform backups as noted above).\n\n' +
      'Optional on-device diagnostics can be cleared from Security settings without deleting your journal; the confirmation dialog describes scope.\n\n' +
      'Purchase records may be retained by Apple, Google, and RevenueCat according to their retention policies even after you erase local App data.\n\n' +
      "Live social server content is retained according to the operator's policy for that deployment.",
  },
  {
    heading: 'Your rights and controls',
    body:
      '• Access and correction: You can review and update most information inside the App.\n\n' +
      '• Privacy toggles: Where implemented, Settings and onboarding include controls (for example around peer visibility or community participation).\n\n' +
      '• Deletion: Use Settings → Delete account to erase locally stored App data on this device as described in the confirmation list. You may reinstall later; Apple/Google/RevenueCat purchase history may still allow "Restore purchases."\n\n' +
      '• Uninstalling the App removes the application and its sandbox data from the device in the usual way your platform handles uninstall; backups may persist until rotated by your backup settings.\n\n' +
      '• Store- and processor-held data: For data held only by Apple, Google, or RevenueCat, use their account tools and privacy portals.\n\n' +
      '• Live social data: For data on the optional community server, you can request to have all information tied to your account deleted by emailing us at support@recoveryroad.app.',
  },
  {
    heading: 'Security',
    body:
      'We use reasonable technical measures appropriate to a consumer wellness app, including local sandboxing, OS secure storage for sensitive items where available, HTTPS for any optional networked features, and optional app lock.\n\n' +
      'Some persisted values may be encrypted at the application layer using a key stored in secure storage before being written to general local storage, depending on platform and feature.\n\n' +
      'No method of storage or transmission is completely secure. You are responsible for device passcodes, OS updates, and physical access to your device.',
  },
  {
    heading: "Children's privacy",
    body:
      'The App is not directed to children under 13 (or the minimum age required in your jurisdiction for consent without a parent). Do not use the App or provide personal information if you are below that age.\n\n' +
      'If you are a parent or guardian and believe we have inadvertently received personal information from a child through a channel we control, contact us by emailing support@recoveryroad.app and we will take appropriate steps to delete it where required by law.',
  },
  {
    heading: 'Third-party services',
    body:
      'The App relies on standard platform and vendor components, including:\n\n' +
      '• Apple App Store / Google Play — distribution, payments, and platform APIs.\n\n' +
      '• RevenueCat — subscription status and entitlements when a RevenueCat API key is configured in the build.\n\n' +
      '• Expo / React Native ecosystem — runtime, notifications, secure storage, sensors, and related modules required for the App to function.\n\n' +
      '• Optional live social backend — only when explicitly enabled for the build.\n\n' +
      "Each provider's own privacy policy also applies to data they process. Links: Apple Privacy Policy, Google Privacy Policy, RevenueCat Privacy Policy (see their websites).",
  },
  {
    heading: 'International users',
    body:
      'If you use the App from outside the United States, your information may be processed in the United States or other countries where Apple, Google, RevenueCat, or an optional API operator processes data, which may have different data protection laws than your home country.',
  },
  {
    heading: 'Changes to this policy',
    body:
      'We may update this Policy from time to time. We will change the "Last updated" date shown with this Policy and, when appropriate, provide additional notice in the App or on the store listing. Continued use after the effective date means you accept the updated Policy.',
  },
  {
    heading: 'Contact us',
    body:
      'For privacy questions or requests regarding information we hold, contact us using:\n\n' +
      "• Email: support@recoveryroad.app\n\n" +
      "• The support email or support website shown in the App's Contact support entry when your publisher has configured them; and/or\n\n" +
      '• The App Support link on the RecoveryRoad page in the Apple App Store or Google Play.',
  },
];

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance',
    body:
      'By using RecoveryRoad you agree to these terms and to the Community Guidelines if you use social or peer features. If you do not agree, do not use the app.',
  },
  {
    heading: 'Not medical or crisis care',
    body:
      'The app is a wellness and self-help tool. It is not medical advice, diagnosis, treatment, therapy, telehealth, a medical device, or a 24/7 crisis line. For emergencies, contact local emergency services or a crisis hotline in your country.',
  },
  {
    heading: 'Your responsibilities',
    body:
      'You are responsible for the accuracy of information you enter and for how you use peer or community features. Do not harass others, share illegal content, or misuse reporting tools.',
  },
  {
    heading: 'Subscriptions and purchases',
    body:
      'Paid features are billed through the app store. Manage, cancel, or restore purchases in your Apple or Google account settings following store rules.',
  },
  {
    heading: 'Changes',
    body:
      'We may update the app, these terms, or store-facing policies. Continued use after meaningful changes means you accept the updated terms as posted in the app or stores.',
  },
];

export const DATA_AND_SHARING_SECTIONS: LegalSection[] = [
  {
    heading: 'What stays on this device',
    body:
      'Check-ins, journal entries, protection profile details, triggers, contacts you add, pledges, media, workbook answers, rebuild and accountability data, and most recovery analytics are stored on this phone or tablet unless a feature explicitly sends data elsewhere.\n\n' +
      'Turning off optional sharing under Privacy & Identity limits how progress or mood signals are shown to peers where those controls apply.',
  },
  {
    heading: 'What can be shared (your consent)',
    body:
      'Switches under Privacy & Identity (in Settings and during onboarding) control whether you allow progress or mood signals to be visible to peers, and whether community messages are allowed, where implemented.\n\n' +
      'Anonymous mode uses a display label instead of your name where that mode applies. It does not erase data already stored on your device.',
  },
  {
    heading: 'Community, recovery rooms, and optional API',
    body:
      'Recovery rooms and community features are governed by the Community Guidelines. When the App is built with a live community API configured, content you post, messages you send, and moderation reports are transmitted to that HTTPS API for delivery, display, and safety review.\n\n' +
      'When that API is not configured in a production store build, those features do not send your community or room content to that backend.',
  },
  {
    heading: 'Deletion and “account”',
    body:
      'There is no separate RecoveryRoad cloud account to delete for core on-device use. The delete flow in Settings permanently removes locally stored App data on this device (see the confirmation list).\n\n' +
      'Apple, Google, and RevenueCat (if enabled) may still hold purchase and entitlement records tied to your store account or pseudonymous billing ID.',
  },
  {
    heading: 'Exports and backups',
    body:
      'The App does not ship a universal “export my recovery file” in every build. Your platform backup (iCloud, Google backup, or computer backup) may include App data until you remove the App or change backup settings.',
  },
  {
    heading: 'When you share from the app',
    body:
      'Some workspace or provider screens let you copy or share a generated summary through your device’s share or clipboard. That action is entirely your choice; the recipient is whoever or whatever app you pick, not a hidden RecoveryRoad server.',
  },
];
