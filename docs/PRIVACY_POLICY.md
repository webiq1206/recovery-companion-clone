# Recovery Companion — Privacy Policy

**Last updated:** April 16, 2026

The in-app **Settings → Privacy Policy** screen reads from `constants/legalInAppCopy.ts` (`PRIVACY_POLICY_SECTIONS`). **Edit that file first**, then update this markdown so web-hosted and in-app text stay identical. Keep both aligned with **App Store Connect → App Privacy** whenever you change SDKs, backends, or data practices.

---

## Who we are and scope

This Privacy Policy describes how Recovery Companion (the app publisher shown on your Apple App Store or Google Play listing) collects, uses, stores, shares, retains, and deletes information when you use the mobile application (“App”).

By using the App, you acknowledge this Policy. If you do not agree, do not use the App.

## Wellness tool; not medical or crisis care

Recovery Companion is a self-help and wellness support tool. It is not a medical device, clinical service, therapist, or crisis response service. Nothing in this Policy changes that.

Do not use the App as a substitute for professional care or emergency services.

## No Recovery Companion cloud account

The App does not create a separate Recovery Companion “cloud account,” hosted recovery profile, or central login database operated by us for routine use of core features.

Your recovery content and preferences are stored on your device unless an optional feature (below) transmits specific information elsewhere. The in-app “Delete account” flow permanently erases locally stored App data on this device; it is the practical equivalent of account deletion for this product. Categories removed are listed in the delete-account confirmation in Settings.

## Information we collect

We collect and process the following categories, depending on how you use the App:

- **Profile and recovery inputs** you choose to enter (for example display name, goals, sober date, triggers, support context, workbook answers, rebuild plans, accountability details, and similar fields).

- **Daily check-ins**, mood and stability-related metrics you log, near-miss events, timeline and relapse-related entries, journal content, pledges, media you attach, and emergency or support contacts you save in the App.

- **App settings and preferences** (including privacy toggles, notification intensity, engagement preferences, security settings, optional PIN or biometric lock configuration, and on-device audit log entries).

- **Subscription state** cached on-device after validation through the app stores.

- A **pseudonymous app-user identifier** generated on-device for subscription services when store billing is enabled (see Purchases).

- If **optional live community or recovery rooms** are enabled for your build, a device identifier and session token used with that service, plus content you submit (posts, comments, room messages, reports, and profile fields supported by that API).

- **Optional on-device “anonymized analytics” buffer** (security-related event metadata) when you turn it on under Security settings; it is stored only in protected on-device storage and is **not uploaded** by this app.

- Short bursts of **device motion** (accelerometer) processed only on-device to detect an optional shake gesture that opens crisis resources; motion values are not stored or sent to our servers.

- Builds may ship with an **optional operator API URL** for future or enterprise features; current store UI does **not** send recovery data to that HTTP API. If you enable such integrations, treat them as a separate disclosure in App Store Connect.

## How we use information

We use the information above to operate the App, personalize your experience, power reminders and local notifications you request, enforce optional security controls, validate subscriptions, provide optional community or room features when configured, improve reliability of on-device features, and comply with law where required.

We do not sell your personal information as a commodity. We do use service providers and platform APIs as described under Sharing.

## Storage, security, and backups

Most data is stored locally in the application sandbox on your device and, where implemented, in the operating system’s protected secure storage for sensitive values such as an optional PIN.

Platform backup systems (such as iCloud Backup, Android backup, or computer backups) may copy App data according to your device and operating-system settings. We do not control those backups.

No method of storage or transmission is completely secure. You are responsible for device passcodes, OS updates, and physical access to your device.

## Optional live community and recovery rooms

When the App is shipped with an optional live community server configured, community feeds, recovery rooms, moderation reports, and related actions are sent over HTTPS to that server’s API base URL (who operates it depends on your build and deployment). That server receives content you submit, identifiers needed for sessions, and moderation payloads described in the App and in technical documentation supplied to operators.

When live social is not configured, production store builds do not transmit recovery-room or community content to that backend; offline or demo behavior is described in-app and in product documentation.

Retention on any such server follows the operator’s policy for that deployment—you should obtain that policy from the operator if you did not deploy the server yourself.

## Purchases, app stores, and RevenueCat

Purchases and subscriptions are processed by Apple and/or Google through their in-app purchase systems. We receive entitlement results so we can unlock features.

When the RevenueCat subscription SDK is configured with a public SDK key, RevenueCat receives transaction-related data and the pseudonymous app user identifier the App generates and stores locally (it is not your recovery journal). RevenueCat’s own privacy practices apply in addition to this Policy. Apple and Google retain purchase history under your store account regardless of App deletion.

If RevenueCat is not configured, subscription UI may be limited and fewer identifiers are transmitted for billing.

## Notifications

The App schedules **local** notifications on your device for reminders you enable. Granting notification permission allows the operating system to deliver those scheduled messages. We do not operate a separate marketing push-notification service for core reminders described here.

## Sharing and processors

We share data only as needed to run the App:

- **Apple and Google:** in-app purchases, receipts, and platform services.

- **RevenueCat:** subscription validation and customer entitlement state when enabled.

- **When you use a Share sheet or “open in” flow** (for example a care-circle or enterprise report), content goes only to the app or destination you choose; we do not receive a copy.

- **Optional live social API operator:** community and room traffic when that API is configured in the build.

- **Law enforcement or regulators:** when we reasonably believe disclosure is required by applicable law, subpoena, or court order (for data in our possession; most recovery journal content remains on your device unless you sent it to a backend).

We do not intentionally disclose your on-device recovery journal to advertisers.

## Retention

On-device data remains until you delete it, delete the App, use the in-app delete flow, or overwrite it through normal use.

Store purchase records and RevenueCat records may be retained according to Apple, Google, and RevenueCat policies even after you erase local App data.

Optional backend content retains according to the operator’s retention schedule for that deployment.

## Your choices, access, and deletion

You may review and update most information inside the App. Privacy toggles under Settings and onboarding control optional presentation of progress or mood signals to peers and related options where implemented.

**Settings → Delete account** permanently removes the categories listed in the delete confirmation on this device, including cached subscription state (you may restore purchases later with the same store account).

A separate action clears local diagnostics caches without deleting your recovery journal; its scope is described in that confirmation.

For privacy requests that involve data held by Apple, Google, or RevenueCat, you may also use the tools those companies provide. For anything else, contact us using the support channel on your store listing.

## Children

The App is not directed to children under 13 (or the minimum age required in your region). Do not use the App or provide personal information if you are below that age. If you believe a child has provided information to us through a channel we control, contact us via the store listing support link.

## International users

If you use the App from outside the United States, your information may be processed in the United States or other countries where service providers operate, which may have different data-protection laws than your home country.

## Changes to this Policy

We may update this Policy from time to time. We will adjust the “Last updated” date above and, where appropriate, provide additional notice in the App or stores. Continued use after the effective date means you accept the updated Policy.

## Contact

For privacy questions or to exercise rights offered by applicable law, contact the support channel shown on your App Store or Google Play listing for Recovery Companion.

## Apple App Store — privacy nutrition labels (align App Store Connect)

App Store Connect asks you to declare data collected “off device.” Mirror the following **when it matches your shipping configuration** so the listing matches this Policy and the in-app Privacy Policy:

- **Purchases:** Collected for app functionality; linked to identity via your store account and, when RevenueCat is enabled, linked to the pseudonymous app user ID sent to RevenueCat.

- **Identifiers:** If live social is enabled in the binary, a device identifier used for session creation is collected by that API for app functionality.

- **User content:** If live social is enabled, posts, comments, room messages, and reports you submit are collected by that API for app functionality and moderation.

- **Health & Fitness** (or other categories Apple offers for wellness journaling, if you select them): Recovery-related content you type into the App is processed on-device; declare off-device collection only if you enable a backend that receives that content.

- **Contact info:** Names or phone numbers you store for support contacts remain on-device unless you enable a feature that transmits them.

- **Usage / diagnostics:** The optional anonymized analytics buffer stays on-device only—declare **Data Not Collected** for off-device Usage Data / Analytics unless you add code that uploads it.

- **Device motion:** Shake-to-crisis uses accelerometer samples on-device only—declare **Data Not Collected** for off-device motion unless you transmit it.

Update App Store Connect whenever you change backends, SDKs, or data practices so disclosures stay identical to this Policy.

---

Independent legal review is recommended before publication. This Policy does not create contractual rights in jurisdictions that require different wording.
