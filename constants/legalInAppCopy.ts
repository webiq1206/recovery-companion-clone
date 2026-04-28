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
      "• The support email or support website shown in the App's Contact support entry.\n\n" +
      '• The App Support link on the RecoveryRoad page in the Apple App Store or Google Play.',
  },
];

/** https://recoveryroad.app/terms */
export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    heading: 'Terms',
    body:
      'This Terms of Use Agreement and our Privacy Statement (together, these "Terms") describe the terms and conditions on which RecoveryRoad offers you access to the website at https://www.recoveryroad.app (the \'website\') or our iOS and Android applications (the \'apps\') to which these Terms are linked or referenced (collectively, the "Services").\n\n' +
      'Before accessing and using the Services, please read these Terms carefully because they constitute a legal agreement between RecoveryRoad and you.\n\n' +
      'By accessing and using the services, you affirm that:\n\n' +
      'You have read and understand these terms; you will comply with the terms; and you are at least the age of legal majority in your place of residence and otherwise legally competent to enter into contracts.\n\n' +
      'If you do not agree to any of these Terms, please do not use the Services.',
  },
  {
    heading: 'Changes',
    body:
      'We reserve the right to modify these terms at any time. Changes and clarifications will take effect immediately upon their posting on the website. If we make material changes, we will notify you here that it has been updated. Your continued use of the Services after the Effective Date constitutes your acceptance of the amended Terms. The amended Terms supersede all previous versions of our agreements, notices or statements about the Terms.',
  },
  {
    heading: 'Not a medical device',
    body:
      'The Services, including all medically-related information, is for informational purposes only. RecoveryRoad does not warrant or guarantee any treatment, therapy, medication, device, diagnosis, action, recommendation, or strategy of any author or other person available through the Services.\n\n' +
      'We also cannot answer any medical-related questions either through the apps or via email or any other means.\n\n' +
      'RecoveryRoad services are for informational purposes only and are not intended as a substitute for, nor does it replace, professional medical advice, diagnosis or treatment. Do not disregard, avoid or delay obtaining medical advice from a qualified healthcare provider because of something you may have read through the services. Do not use the services for emergency medical needs. If you experience a medical emergency, immediately call a health care professional and 911.',
  },
  {
    heading: 'Accuracy of materials',
    body:
      'The materials appearing on the Services could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its website or apps are accurate, complete or current. We may make changes to the materials contained on the Services at any time without notice. However we do not make any commitment to update the materials.',
  },
  {
    heading: 'External links',
    body:
      'The Services may contain links to third-party websites and services, including social media (collectively, "Linked Services"). Linked Services are not under the control of RecoveryRoad and RecoveryRoad is not responsible for Linked Services or for any information or materials on or any form of transmission received from any Linked Service. The inclusion of a link does not imply endorsement by RecoveryRoad of the Linked Service or any association with the operators of the Linked Service. RecoveryRoad does not investigate, verify or monitor the Linked Services. RecoveryRoad provides links to Linked Services for your convenience only. You access Linked Services at your own risk and subject to the privacy policies, terms and conditions of use and other legal provisions applicable to the Linked Services.',
  },
  {
    heading: 'App updates',
    body:
      'RecoveryRoad may from time to time, in its sole discretion, develop and provide updates for Apps, which may include upgrades, bug fixes, patches and other error corrections and/or new features (collectively, "Updates"). Updates may also modify or delete in their entirety certain features and functionality. You agree that RecoveryRoad has no obligation to provide any Updates or to continue to provide or enable any particular features or functionality.\n\n' +
      'Based on your mobile device settings, when your mobile device is connected to the Internet, then either: (a) the Updates will automatically download and install; or (b) you may receive notice of or be prompted to download and install available Updates.\n\n' +
      'Please promptly download and install all Updates. If you do not, portions of the Services may not properly operate. You further agree that all Updates will be deemed part of the Services and subject to all terms and conditions of these Terms.',
  },
  {
    heading: 'Use of the Services',
    body:
      'Eligibility: You must be the age of legal majority or older in your place of residence to use the Services. By using the Services, you represent to RecoveryRoad that you are at least the age of majority in your place of residence.\n\n' +
      'Your Responsibilities: You may use the Services for lawful purposes only. You may not use the Services in any manner that could damage, disable, overburden or impair RecoveryRoad\'s servers or networks or interfere with any other party\'s use and enjoyment of the Services.\n\n' +
      'You may not attempt to gain unauthorized access to the Services, other users\' Accounts or RecoveryRoad\'s computer systems or networks through hacking, password mining or any other means. Without limiting any of the foregoing, you agree that you shall not and you agree not to encourage or allow any third party to:\n\n' +
      '• copy, modify, adapt, translate, reverse engineer, decode or otherwise attempt to derive or gain access to any portion of the Services or RecoveryRoad Content;\n' +
      '• use any robot, spider, site search/retrieval application or other automated device, process or means to access, retrieve, scrape or index any portion of the Services;\n' +
      '• rent, lease, lend, sell, sublicense, assign, distribute, publish, transfer or otherwise make available the Services (or any features or functionality of the Services) to any third party for any reason;\n' +
      '• reformat or frame any portion of the web pages that are part of the Services; or\n' +
      '• create more than one Account by automated means or under false or fraudulent pretenses.\n\n' +
      'You are solely responsible for any and all charges, fees and other costs related to use of the Services. If you access and use the Services on your smartphone, tablet or other mobile device, you must have wireless service through Wi-Fi or a participating mobile service provider.',
  },
  {
    heading: 'No warranties',
    body:
      'RecoveryRoad warrants that RecoveryRoad has validly entered into these Terms and has the legal power to do so. You warrant that you have validly entered into these Terms and have the legal power to do so. Except as expressly provided above, the services are provided "as is" and "as available" without warranty of any kind, whether express or implied. RecoveryRoad specifically disclaims all warranties and conditions of any kind, including any implied warranty of merchantability, fitness for a particular purpose, title, non-infringement, freedom from defects, uninterrupted use and all warranties implied from any course of dealing or usage of trade. RecoveryRoad makes no warranty as to the accuracy, completeness, currency or reliability of any of the Services. RecoveryRoad does not warrant that (i) the Services will meet your requirements, (ii) operation of the Services will be uninterrupted or virus- or error-free or (iii) errors will be corrected. Any oral or written advice provided by RecoveryRoad or its agents does not and will not create any warranty.\n\n' +
      'Some jurisdictions do not allow the exclusion of implied warranties which means that some or all of the above exclusions may not apply to you.',
  },
  {
    heading: 'Limitation of liability',
    body:
      'Your use of the services is at your own risk.\n\n' +
      'RecoveryRoad specifically disclaims any liability, whether based in contract, tort, strict liability or otherwise, for any indirect, incidental, consequential or special damages arising out of or in any way connected with access to or use of the services, even if RecoveryRoad has been advised of the possibility of such damages, including but not limited to reliance by any party on any content obtained through the use of the services or that arises in connection with mistakes or omissions in, or delays in transmission of, information to or from the user, interruptions in telecommunications connections to the services or viruses, whether caused in whole or in part by negligence, acts of god, war, terrorism, telecommunications failure, theft or destruction of, or unauthorized access to the services.\n\n' +
      'If for any reason the disclaimers of warranties or limitations of liability set forth in this section is/are inapplicable or unenforceable for any reason, then RecoveryRoad\'s maximum liability for any type of damages hereunder shall be limited to the lesser of the total fees paid by you to RecoveryRoad during the six (6) months preceding the event giving rise to the liability and $1,000.\n\n' +
      'The foregoing disclaimer of liability will not apply to the extent prohibited by applicable law.\n\n' +
      'You acknowledge and agree that the above limitations of liability, together with the other provisions in these Terms that limit liability, are essential terms and that RecoveryRoad would not be willing to grant you the rights set forth in these Terms but for your agreement to the above limitations of liability.\n\n' +
      'If you are a California resident, you waive your rights with respect to California Civil Code Section 1542, which says "a general release does not extend to claims which the creditor does not know or suspect to exist in his favor at the time of executing the release, which, if known by him must have materially affected his settlement with the debtor."',
  },
  {
    heading: 'Indemnification',
    body:
      'You agree to defend, indemnify and hold harmless RecoveryRoad and affiliates and their respective officers, directors, employees, agents and licensees from any and all liability including costs, expenses, the costs of enforcing any right to indemnification hereunder and any insurance provider and attorneys\' fees brought against RecoveryRoad by any third party arising out of or are related to your violation of these Terms or use of the Services. RecoveryRoad reserves the right, at its own expense, to assume the exclusive defense and control of any matter subject to indemnification hereunder. No settlement that affects the rights or obligations of RecoveryRoad may be made without RecoveryRoad\'s prior written approval.\n\n' +
      'RecoveryRoad agrees to indemnify you for any direct damages that you suffer arising out of or related to any suit, action or proceeding by a third party to the extent such direct damages arise from a claim that your use of the Services in compliance with these Terms infringes a third party\'s U.S. patent, copyright or trademark right.',
  },
  {
    heading: 'Electronic contracting',
    body:
      'Your affirmative act of using and/or registering for the Services constitutes your consent to enter into agreements with RecoveryRoad electronically.',
  },
  {
    heading: 'Geographic restrictions',
    body:
      'The Services are based in the State of Idaho in the United States. You acknowledge that you may not be able to access the Services outside of the United States and that access thereto may not be legal by certain persons or in certain countries. If you access the Services from outside the United States, you are responsible for compliance with local laws.\n\n' +
      'Please note: By agreeing to these Terms, you explicitly agree that any claims or actions that you may otherwise have against RecoveryRoad under the laws of any jurisdiction outside the United States are hereby waived and that your sole location and applicable law for any dispute is in the United States according to the terms of the Governing Law section.',
  },
  {
    heading: 'Apple, Inc.',
    body:
      'This provision only applies in respect of the version of the RecoveryRoad App ("App") used on devices of Apple, Inc. This Agreement is an agreement between you and RecoveryRoad. Apple has no responsibility for the App or the content of the App, including in respect of claims of intellectual property infringement, product liability or that the App does not conform with applicable law. To the maximum extent permitted by applicable law, Apple provides no warranty in respect of the App and has no obligation to provide support in respect of the App. All claims in respect of the App must be directed to us and not to Apple. Your use of the App must be in compliance with the App Store Terms of Service, and you may only use the App on an iPhone or iPod that you own or control as permitted by such terms. In the event the App fails to conform to the warranty set forth herein, you may notify Apple, and Apple will refund the purchase price for the App to you. Apple shall be a third party beneficiary of this Agreement with the right to enforce this Agreement against you.\n\n' +
      'Consent to Share Consumption Data with Apple: By using our app and making in-app purchases, you consent to our sharing of data regarding your usage and consumption of purchased content with Apple, as part of our efforts to resolve refund requests. This information may include details about how you have accessed and interacted with the purchased content. The purpose of sharing this data is to help Apple make an informed decision regarding refund requests. We ensure that such data sharing is done in compliance with Apple\'s policies and only as necessary to process your requests.',
  },
  {
    heading: 'Governing law',
    body:
      'This Agreement shall be governed in all respects under the laws of the State of Idaho, exclusive of its choice of law or conflict of laws provisions. In any claim or action by you directly or indirectly arising under this Agreement or related to the Application, you irrevocably agree to submit to the exclusive jurisdiction of the courts located in Ada County, Idaho. You waive any jurisdictional, venue or inconvenient forum objections to any of these courts that may have jurisdiction.',
  },
  {
    heading: 'Data privacy',
    body:
      'Please make sure that you carefully read our Privacy Statement to learn about the information that RecoveryRoad collects through the Services and how we process it.\n\n' +
      'Without limiting the terms of RecoveryRoad\'s Privacy Statement, you understand that RecoveryRoad does not and cannot guarantee that your use of the Services and/or the information provided by you through the Services will be private or secure. Except as expressly required by law, RecoveryRoad is not responsible or liable to you for any lack of privacy or security you may experience. You are responsible for using the precautions and security measures best suited for your situation and intended use of the Services. RecoveryRoad reserves the right at all times to disclose any information as RecoveryRoad deems necessary to satisfy any applicable law, regulation, legal process or governmental request or protect the security of Personal Information and the Services.',
  },
  {
    heading: 'Content rights',
    body:
      'You retain your rights to any Content you submit, post or display on or through the Services. What\'s yours is yours — you own your Content.\n\n' +
      'By submitting, posting or displaying Content on or through the Services, you grant us a worldwide, non-exclusive, royalty-free license (with the right to sublicense) to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such Content in any and all media or distribution methods now known or later developed (for clarity, these rights include, for example, curating, transforming, and translating). This license authorizes us to make your Content available to the rest of the world and to let others do the same.\n\n' +
      'You represent and warrant that you have, or have obtained, all rights, licenses, consents, permissions, power and/or authority necessary to grant the rights granted herein for any Content that you submit, post or display on or through the Services. You agree that such Content will not contain material subject to copyright or other proprietary rights, unless you have necessary permission or are otherwise legally entitled to post the material and to grant RecoveryRoad the license described above.',
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
