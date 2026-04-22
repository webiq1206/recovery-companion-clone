# RecoveryRoad — Privacy Policy

**Last updated:** April 16, 2026

This document is the same Privacy Policy shown inside the RecoveryRoad app (Settings → Privacy Policy). The canonical text for the shipped app is maintained in `constants/legalInAppCopy.ts` (`PRIVACY_POLICY_SECTIONS`) so the in-app screen, this file, and the hosted HTML export stay aligned. After edits, update the **Last updated** date in `constants/legalInAppCopy.ts` and republish the web copy.

**Public URL (App Store Connect):** Host `public/privacy-policy.html` (or equivalent) at a stable `https://` URL and set `EXPO_PUBLIC_PRIVACY_POLICY_URL` in your production build so the in-app Privacy Policy screen can offer “Open published policy in browser.” Use the same URL in App Store Connect.

---

## Who we are

This Privacy Policy (“Policy”) describes how RecoveryRoad (the publisher identified on your Apple App Store or Google Play download page) handles information when you use the RecoveryRoad mobile application (“App”).

By downloading or using the App, you agree to this Policy. If you do not agree, please uninstall the App and do not use it.

## Wellness support only

RecoveryRoad is a self-help and wellness support tool. It is not medical advice, diagnosis, or treatment; not a medical device; not psychotherapy, telehealth, or crisis care; and not a substitute for qualified professionals or emergency services.

Nothing in this Policy changes the nature of the App.

## Accounts and where your recovery data lives

For everyday use, the App does not create a RecoveryRoad–hosted cloud login, hosted recovery profile, or central account database operated by us.

Your recovery-related content (such as check-ins, journal entries, plans, and preferences) is stored on your device unless a feature you actively use sends specific information elsewhere, as described below.

**Delete account:** Settings includes a flow labeled “Delete account.” That action permanently erases the categories of locally stored App data listed in the confirmation dialog on this device. It is how you remove your App data from the device; it is not a remote server “account deletion” for core journaling because those records are not stored on our servers by default.

Apple, Google, and (when enabled) RevenueCat may still retain purchase and billing records under your store account or pseudonymous billing identifier, as described in the Data sharing section.

## Information we collect

Depending on how you use the App, we process the following categories of information:

**Account and profile information.** Information you choose to enter, such as display name, goals, sobriety or milestone dates, triggers, support contacts, privacy preferences, and similar profile fields.

**Recovery and wellness content.** Daily check-ins, mood or stability-related inputs you log, journal text, pledges, workbook answers, rebuild or accountability program data, timeline or relapse-related notes, media you attach within the App, and emergency or support contacts you save.

**App usage and preferences.** Settings such as notification preferences, engagement or streak data stored for reminders, optional security preferences, optional app lock (PIN or biometric) configuration, and related app state.

**Device and session identifiers (limited contexts).**

- A pseudonymous app user identifier is created and stored on your device for native in-app purchases when the subscription SDK is configured. It is used with Apple, Google, and RevenueCat as described in the Data sharing section.
- If live community or recovery rooms are enabled for your build, the App uses a stable per-install identifier stored in the device keychain (or equivalent secure storage) and a session token stored on-device to communicate with that service. Optional linking may send the same pseudonymous purchase identifier to that service so sessions can be re-associated after reinstall, as documented for operators.

**Subscription and purchase data.** Product identifiers, prices shown at purchase, entitlement state, and renewal timing as returned by the app stores and (when configured) RevenueCat, cached on your device so the App can unlock features.

**Optional on-device security diagnostics.** If you turn on the “anonymized analytics buffer” in Security settings, the App stores security-related event metadata only on your device in protected storage. The App does not upload that buffer to us.

**Motion data (shake gesture).** The App may read short accelerometer samples on the device to detect an optional shake gesture that opens crisis resources. Those samples are used transiently for gesture detection; they are not written to your journal and are not sent to our servers by this App.

**Information you deliberately send elsewhere.** If you use your device Share sheet, copy to clipboard, or similar flows from supported screens, information goes only to the destination you choose.

## Information we do not collect (by default)

In the standard consumer configuration:

- We do not operate third-party advertising analytics (such as ad networks) inside this App.
- We do not use your recovery journal or check-ins for cross-app advertising “tracking” on behalf of advertisers.
- We do not upload your recovery journal or check-in text to a RecoveryRoad–operated cloud database for core features. (Optional online community or recovery-room features, when enabled in a given build, send only the content you submit to that feature to the configured operator’s servers.)
- The App does not currently call a separate RecoveryRoad HTTP API for syncing your journal; optional backend code may exist for future or custom integrations—if you enable such an integration, treat it as a separate disclosure.

If your organization ships a custom build with additional backends, those practices must be disclosed separately.

## How we use your information

We use the information above only as needed to:

- Provide app functionality, including saving your entries locally, showing progress views, and running reminders you request.
- Personalize prompts, reminders, and on-device insights based on your stored preferences and history.
- Operate security features you enable, such as app lock, audit logging, and the optional on-device diagnostics buffer.
- Validate subscriptions and unlock paid features through Apple, Google, and (when configured) RevenueCat.
- Deliver optional community or recovery-room features when that mode is enabled, including moderation and safety workflows run by the configured API operator.
- Comply with law if we reasonably believe we must, for information actually in our possession (most journal content remains on your device unless you transmitted it to a third party or optional backend).

We do not sell your personal information as a product.

## Data storage and location

**On your device.** Most App data—including journal entries, check-ins, profile fields, and engagement history—is stored in the application sandbox (AsyncStorage or equivalent) on your phone or tablet. Some sensitive values (such as optional PIN-related material and parts of security diagnostics) use the operating system’s secure storage (for example iOS Keychain / Android Keystore) where supported. Certain values may additionally be encrypted at the application layer before being written to local storage.

**On servers.** By default, your full recovery journal is not stored on servers we operate for routine personal use of the App.

When live community or recovery rooms are enabled for the version of the App you are using (the publisher configures this at release), posts, comments, room messages, moderation reports, and related profile fields you submit are transmitted over HTTPS to and stored by that service’s operator under their infrastructure and retention rules.

**Platform backups.** iCloud Backup, Google backup, or computer backups may copy App data according to your device settings. We do not control those backups.

## Notifications

The App schedules **local** notifications on your device for reminders you enable (for example check-in nudges). Granting notification permission allows the operating system to display those scheduled messages.

We do not operate a separate marketing push-notification service for those core wellness reminders.

## Data sharing

We disclose information only as described here:

**Apple and Google.** In-app purchases, receipts, and platform services are processed by Apple and/or Google. They receive billing and account information under their own policies.

**RevenueCat, Inc.** When the App is built with a RevenueCat SDK key, RevenueCat receives subscription-related data (such as product identifiers and transaction status) and the pseudonymous on-device app user ID used to tie entitlements across installs. RevenueCat does not receive your recovery journal text from us as part of that integration.

**Optional live social API operator.** When live community or recovery rooms are enabled, the operator of the configured API receives the content you submit, session tokens, identifiers needed for moderation and safety, and related technical metadata sent over HTTPS.

**Share sheet and clipboard.** When you export or share content, it goes to the app or person you select; we do not receive a hidden copy on our servers.

**Legal requests.** We may disclose information we hold if required by applicable law, regulation, legal process, or governmental request, where permitted.

We do not intentionally disclose your on-device recovery journal to advertisers.

## Data retention

**On-device data** remains until you delete it, overwrite it, use the in-app delete flow, or remove the App (subject to platform backups as noted above).

**Optional on-device diagnostics** can be cleared from Security settings without deleting your journal; the confirmation dialog describes scope.

**Purchase records** may be retained by Apple, Google, and RevenueCat according to their retention policies even after you erase local App data.

**Live social server content** is retained according to the operator’s policy for that deployment.

## Your rights and controls

- **Access and correction:** You can review and update most information inside the App.
- **Privacy toggles:** Where implemented, Settings and onboarding include controls (for example around peer visibility or community participation).
- **Deletion:** Use Settings → Delete account to erase locally stored App data on this device as described in the confirmation list. You may reinstall later; Apple/Google/RevenueCat purchase history may still allow “Restore purchases.”
- **Uninstalling the App** removes the application and its sandbox data from the device in the usual way your platform handles uninstall; backups may persist until rotated by your backup settings.
- **Store- and processor-held data:** For data held only by Apple, Google, or RevenueCat, use their account tools and privacy portals.
- **Live social data:** For data on the optional community server, contact that operator’s support or use in-app reporting tools they provide.

## Security

We use reasonable technical measures appropriate to a consumer wellness app, including local sandboxing, OS secure storage for sensitive items where available, HTTPS for any optional networked features, and optional app lock.

Some persisted values may be encrypted at the application layer using a key stored in secure storage before being written to general local storage, depending on platform and feature.

No method of storage or transmission is completely secure. You are responsible for device passcodes, OS updates, and physical access to your device.

## Children’s privacy

The App is not directed to children under 13 (or the minimum age required in your jurisdiction for consent without a parent). Do not use the App or provide personal information if you are below that age.

If you are a parent or guardian and believe we have inadvertently received personal information from a child through a channel we control, contact us using the information in the Contact us section and we will take appropriate steps to delete it where required by law.

## Third-party services

The App relies on standard platform and vendor components, including:

- **Apple App Store / Google Play** — distribution, payments, and platform APIs.
- **RevenueCat** — subscription status and entitlements when a RevenueCat API key is configured in the build.
- **Expo / React Native ecosystem** — runtime, notifications, secure storage, sensors, and related modules required for the App to function.
- **Optional live social backend** — only when explicitly enabled for the build.

Each provider’s own privacy policy also applies to data they process. See Apple Privacy Policy, Google Privacy Policy, and RevenueCat Privacy Policy on their websites.

## International users

If you use the App from outside the United States, your information may be processed in the United States or other countries where Apple, Google, RevenueCat, or an optional API operator processes data, which may have different data protection laws than your home country.

## Changes to this policy

We may update this Policy from time to time. We will change the “Last updated” date shown with this Policy and, when appropriate, provide additional notice in the App or on the store listing. Continued use after the effective date means you accept the updated Policy.

## Contact us

For privacy questions or requests regarding information we hold, contact us using:

- The support email or support website shown in the App’s Contact support entry when your publisher has configured them; and/or
- The App Support link on the RecoveryRoad page in the Apple App Store or Google Play.

Publishers should ensure a working support email or website appears on the store listing and, when possible, inside the App’s Contact support entry so users can reach a real person or team.

---

For **App Store Connect → App Privacy** (nutrition labels), use [`docs/APP_STORE_PRIVACY_LABELS.md`](./APP_STORE_PRIVACY_LABELS.md) so the questionnaire matches this Policy for each release configuration.
