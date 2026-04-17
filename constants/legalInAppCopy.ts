/** In-app legal copy. Independent legal review is recommended before publication. */

export const IN_APP_LEGAL_LAST_UPDATED = 'April 16, 2026';

export type LegalSection = { heading: string; body: string };

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are and scope',
    body:
      'This Privacy Policy describes how Recovery Companion (the app publisher shown on your Apple App Store or Google Play listing) collects, uses, stores, shares, retains, and deletes information when you use the mobile application (“App”).\n\n' +
      'By using the App, you acknowledge this Policy. If you do not agree, do not use the App.',
  },
  {
    heading: 'Wellness tool; not medical or crisis care',
    body:
      'Recovery Companion is a self-help and wellness support app. It is not medical advice, diagnosis, treatment, a medical device, clinical service, therapist, telehealth, or crisis response service. Nothing in this Policy changes that.\n\n' +
      'Do not use the App as a substitute for professional care or emergency services.',
  },
  {
    heading: 'No Recovery Companion cloud account',
    body:
      'The App does not create a separate Recovery Companion “cloud account,” hosted recovery profile, or central login database operated by us for routine use of core features.\n\n' +
      'Your recovery content and preferences are stored on your device unless an optional feature (below) transmits specific information elsewhere. The in-app “Delete account” flow permanently erases locally stored App data on this device; it is the practical equivalent of account deletion for this product. Categories removed are listed in the delete-account confirmation in Settings.',
  },
  {
    heading: 'Information we collect',
    body:
      'We collect and process the following categories, depending on how you use the App:\n\n' +
      '• Profile and recovery inputs you choose to enter (for example display name, goals, sober date, triggers, support context, workbook answers, rebuild plans, accountability details, and similar fields).\n\n' +
      '• Daily check-ins, mood and stability-related metrics you log, near-miss events, timeline and relapse-related entries, journal content, pledges, media you attach, and emergency or support contacts you save in the App.\n\n' +
      '• App settings and preferences (including privacy toggles, notification intensity, engagement preferences, security settings, optional PIN or biometric lock configuration, and on-device audit log entries).\n\n' +
      '• Subscription state cached on-device after validation through the app stores.\n\n' +
      '• A pseudonymous app-user identifier generated on-device for subscription services when store billing is enabled (see Purchases).\n\n' +
      '• If optional live community or recovery rooms are enabled for your build, a device identifier and session token used with that service, plus content you submit (posts, comments, room messages, reports, and profile fields supported by that API).\n\n' +
      '• Optional on-device “anonymized analytics” buffer (security-related event metadata) when you turn it on under Security settings; it is stored only in protected on-device storage and is not uploaded by this app.\n\n' +
      '• Short bursts of device motion (accelerometer) processed only on-device to detect an optional shake gesture that opens crisis resources; motion values are not stored or sent to our servers.\n\n' +
      '• Builds may ship with an optional operator API URL for future or enterprise features; current store UI does not send recovery data to that HTTP API. If you enable such integrations, treat them as a separate disclosure in App Store Connect.',
  },
  {
    heading: 'How we use information',
    body:
      'We use the information above to operate the App, personalize your experience, power reminders and local notifications you request, enforce optional security controls, validate subscriptions, provide optional community or room features when configured, improve reliability of on-device features, and comply with law where required.\n\n' +
      'We do not sell your personal information as a commodity. We do use service providers and platform APIs as described under Sharing.',
  },
  {
    heading: 'Storage, security, and backups',
    body:
      'Most data is stored locally in the application sandbox on your device and, where implemented, in the operating system’s protected secure storage for sensitive values such as an optional PIN.\n\n' +
      'Platform backup systems (such as iCloud Backup, Android backup, or computer backups) may copy App data according to your device and operating-system settings. We do not control those backups.\n\n' +
      'No method of storage or transmission is completely secure. You are responsible for device passcodes, OS updates, and physical access to your device.',
  },
  {
    heading: 'Optional live community and recovery rooms',
    body:
      'When the App is shipped with an optional live community server configured, community feeds, recovery rooms, moderation reports, and related actions are sent over HTTPS to that server’s API base URL (who operates it depends on your build and deployment). That server receives content you submit, identifiers needed for sessions, and moderation payloads described in the App and in technical documentation supplied to operators.\n\n' +
      'When live social is not configured, production store builds do not transmit recovery-room or community content to that backend; offline or demo behavior is described in-app and in product documentation.\n\n' +
      'Retention on any such server follows the operator’s policy for that deployment—you should obtain that policy from the operator if you did not deploy the server yourself.',
  },
  {
    heading: 'Purchases, app stores, and RevenueCat',
    body:
      'Purchases and subscriptions are processed by Apple and/or Google through their in-app purchase systems. We receive entitlement results so we can unlock features.\n\n' +
      'When the RevenueCat subscription SDK is configured with a public SDK key, RevenueCat receives transaction-related data and the pseudonymous app user identifier the App generates and stores locally (it is not your recovery journal). RevenueCat’s own privacy practices apply in addition to this Policy. Apple and Google retain purchase history under your store account regardless of App deletion.\n\n' +
      'If RevenueCat is not configured, subscription UI may be limited and fewer identifiers are transmitted for billing.',
  },
  {
    heading: 'Notifications',
    body:
      'The App schedules local notifications on your device for reminders you enable. Granting notification permission allows the operating system to deliver those scheduled messages. We do not operate a separate marketing push-notification service for core reminders described here.',
  },
  {
    heading: 'Sharing and processors',
    body:
      'We share data only as needed to run the App:\n\n' +
      '• Apple and Google: in-app purchases, receipts, and platform services.\n\n' +
      '• RevenueCat: subscription validation and customer entitlement state when enabled.\n\n' +
      '• When you use a Share sheet or “open in” flow (for example a care-circle or enterprise report), content goes only to the app or destination you choose; we do not receive a copy.\n\n' +
      '• Optional live social API operator: community and room traffic when that URL is configured.\n\n' +
      '• Law enforcement or regulators: when we reasonably believe disclosure is required by applicable law, subpoena, or court order (for data in our possession; most recovery journal content remains on your device unless you sent it to a backend).\n\n' +
      'We do not intentionally disclose your on-device recovery journal to advertisers.',
  },
  {
    heading: 'Retention',
    body:
      'On-device data remains until you delete it, delete the App, use the in-app delete flow, or overwrite it through normal use.\n\n' +
      'Store purchase records and RevenueCat records may be retained according to Apple, Google, and RevenueCat policies even after you erase local App data.\n\n' +
      'Optional backend content retains according to the operator’s retention schedule for that deployment.',
  },
  {
    heading: 'Your choices, access, and deletion',
    body:
      'You may review and update most information inside the App. Privacy toggles under Settings and onboarding control optional presentation of progress or mood signals to peers and related options where implemented.\n\n' +
      'Settings → Delete account permanently removes the categories listed in the delete confirmation on this device, including cached subscription state (you may restore purchases later with the same store account).\n\n' +
      'A separate action clears local diagnostics caches without deleting your recovery journal; its scope is described in that confirmation.\n\n' +
      'For privacy requests that involve data held by Apple, Google, or RevenueCat, you may also use the tools those companies provide. For anything else, contact us using the support channel on your store listing.',
  },
  {
    heading: 'Children',
    body:
      'The App is not directed to children under 13 (or the minimum age required in your region). Do not use the App or provide personal information if you are below that age. If you believe a child has provided information to us through a channel we control, contact us via the store listing support link.',
  },
  {
    heading: 'International users',
    body:
      'If you use the App from outside the United States, your information may be processed in the United States or other countries where service providers operate, which may have different data-protection laws than your home country.',
  },
  {
    heading: 'Changes to this Policy',
    body:
      'We may update this Policy from time to time. We will adjust the “Last updated” date above and, where appropriate, provide additional notice in the App or stores. Continued use after the effective date means you accept the updated Policy.',
  },
  {
    heading: 'Contact',
    body:
      'For privacy questions or to exercise rights offered by applicable law, contact the support channel shown on your App Store or Google Play listing for Recovery Companion.',
  },
  {
    heading: 'Apple App Store — privacy nutrition labels (align App Store Connect)',
    body:
      'App Store Connect asks you to declare data collected “off device.” Mirror the following when it matches your shipping configuration so the listing matches this Policy:\n\n' +
      '• Purchases: Collected for app functionality; linked to identity via your store account and, when RevenueCat is enabled, linked to the pseudonymous app user ID sent to RevenueCat.\n\n' +
      '• Identifiers: If live social is enabled in the binary, a device identifier used for session creation is collected by that API for app functionality.\n\n' +
      '• User content: If live social is enabled, posts, comments, room messages, and reports you submit are collected by that API for app functionality and moderation.\n\n' +
      '• Health & Fitness (or Other Data types Apple lists for wellness journaling, if you select them): Recovery-related content you type into the App is processed on-device; declare off-device collection only if you enable a backend that receives that content.\n\n' +
      '• Contact info: Names or phone numbers you store for support contacts remain on-device unless you enable a feature that transmits them.\n\n' +
      '• Usage / diagnostics: The optional anonymized analytics buffer stays on-device only—declare “Data Not Collected” for off-device Usage Data / Analytics unless you add code that uploads it.\n\n' +
      '• Device motion: Shake-to-crisis uses accelerometer samples on-device only; declare “Data Not Collected” for off-device motion unless you transmit it.\n\n' +
      'Update App Store Connect whenever you change backends, SDKs, or data practices so disclosures stay identical to this Policy.',
  },
];

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance',
    body:
      'By using Recovery Companion you agree to these terms and to the Community Guidelines if you use social or peer features. If you do not agree, do not use the app.',
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
      'There is no separate Recovery Companion cloud account to delete for core on-device use. The delete flow in Settings permanently removes locally stored App data on this device (see the confirmation list).\n\n' +
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
      'Some workspace or provider screens let you copy or share a generated summary through your device’s share or clipboard. That action is entirely your choice; the recipient is whoever or whatever app you pick, not a hidden Recovery Companion server.',
  },
];
