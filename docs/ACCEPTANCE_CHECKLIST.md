# Recovery Companion — acceptance checklist

Use **fresh install**, **returning user**, and **cold restart after completing actions** as three personas. Mark pass/fail and note device/OS.

---

## 1. Launch, routing, and persistence

- [ ] Cold launch shows loading state, then routes correctly (no infinite spinner).
- [ ] **New user**: redirects to onboarding ([`AppEntryRedirect`](../components/AppEntryRedirect.tsx) when `hasCompletedOnboarding` is false).
- [ ] **Onboarded user**: if a check-in period is tappable, redirects to **Check-in Now** with correct `period` param; otherwise lands on **Today** ([`/(tabs)/(home)/today-hub`](../app/(tabs)/(home)/today-hub.tsx)).
- [ ] Kill app and relaunch: profile, check-ins, pledges, tool usage, and wizard behavior persist (no data loss on normal paths).
- [ ] No crash on first frame after splash; splash hides cleanly.

---

## 2. Onboarding

- [ ] Can complete full onboarding flow and reach main app.
- [ ] Cannot access tabs that require onboarding until complete (or behavior matches product intent).
- [ ] Back / cancel behavior does not leave corrupt half-state.

---

## 3. Today (home) hub

- [ ] Greeting, date/time, and crisis entry (“I’m struggling”) render and navigate to [`/crisis-mode`](../app/crisis-mode.tsx).
- [ ] Recovery journey / profile summary card shows expected data.
- [ ] **Today’s Actions**: list matches wizard rules; completed rows styled/disabled appropriately; check-in rows respect window / lock state.
- [ ] Expand/collapse chevron works when multiple actions exist.
- [ ] **No false flashes** on open: no spurious “all complete” card, no ghost **“{action} done”** toast for work already persisted ([`useWizardEngine` completion baseline](../hooks/useWizardEngine.ts)).
- [ ] When risk is high, relapse plan CTA appears and opens [`/relapse-plan`](../app/relapse-plan.tsx) (if product still ties CTA to elevated risk).
- [ ] Tab header actions (if any) work from Today screen.

---

## 4. Daily check-in

- [ ] **Check-in Now** flow opens for correct period; can submit valid check-in.
- [ ] [`/daily-checkin`](../app/daily-checkin.tsx) modal opens from Today actions with correct `period` param.
- [ ] After submit, stability/scores update in UI where expected; entry appears in history / progress paths.
- [ ] Same period cannot be double-submitted in a confusing way (or overwrite behavior is intentional and clear).

---

## 5. Crisis and safety

- [ ] Crisis mode full-screen opens; steps (breathe, ground, urge timer, etc.) usable; back/close exits safely.
- [ ] **Shake to crisis** (if enabled on device) opens crisis without breaking navigation stack.
- [ ] [`/emergency`](../app/emergency.tsx) reachable where linked; content appropriate.
- [ ] Crisis companion bar / messaging: no dead links; static vs tappable matches current product.

---

## 6. Quick coping tools

- [ ] [`/tools`](../app/tools.tsx) opens from Profile Help / deep links; tools list accurate.
- [ ] [`/tools/breathing`](../app/tools/breathing.tsx), [`/tools/urge-timer`](../app/tools/urge-timer.tsx), quick journal paths complete without error.
- [ ] Tool usage events still mark **Grounding / coping** guidance correctly after tool use (Today hub updates after hydration).

---

## 7. Tabs: Progress, Journal, Rebuild, Connect, Accountability

- [ ] **Progress** ([`app/(tabs)/progress`](../app/(tabs)/progress/index.tsx)): charts/scores load; no blank error state.
- [ ] **Journal**: list, new entry ([`/new-journal`](../app/new-journal.tsx)), detail ([`/journal-detail`](../app/journal-detail.tsx)); entries persist.
- [ ] **Rebuild**: habits/routines/goals flows usable; data persists.
- [ ] **Connect** ([`ConnectionHub`](../app/(tabs)/connection/ConnectionHub.tsx)): peers/rooms/sponsor paths open; messages send where demo allows; recovery rooms list and **room session** modal work.
- [ ] **Accountability**: partners/contracts/check-ins UI consistent with stored data.

---

## 8. Hidden tab routes (reachable via UI)

From product links / menus, verify screens that use `href: null` still open:

- [ ] Profile ([`app/(tabs)/profile`](../app/(tabs)/profile/index.tsx)) — edits, Help links (**How to use**, **Why stability**, **Quick coping tools**), subtitle wrapping vs chevron.
- [ ] Support / triggers / milestones / pledges / community / check-ins / relapse-prevention indices load when navigated.

---

## 9. Relapse, risk, and education modals

- [ ] [`/relapse-plan`](../app/relapse-plan.tsx): view/edit/save as designed.
- [ ] [`/relapse-recovery`](../app/relapse-recovery.tsx), [`/relapse-detection`](../app/relapse-detection.tsx): copy and actions match current risk model.
- [ ] Explainer screens (e.g. [`/how-to-use`](../app/how-to-use.tsx), [`/why-stability-important`](../app/why-stability-important.tsx), insights/stages explainers) open and scroll.

---

## 10. Subscription and premium

- [ ] [`/premium-upgrade`](../app/premium-upgrade.tsx), [`/subscription-plans`](../app/subscription-plans.tsx): pricing copy matches [`constants/subscriptionPlans`](../constants/subscriptionPlans.ts) (no removed features advertised).
- [ ] Free vs premium gates: locked features show clear messaging; premium unlock paths work in dev/test.

---

## 11. Security, settings, optional workspace (if used)

- [ ] [`/security-settings`](../app/security-settings.tsx): toggles persist; lock screen behavior if enabled ([`LockScreen`](../components/LockScreen.tsx) in root layout).
- [ ] Provider / enterprise screens: only when `EXPO_PUBLIC_INCLUDE_PROVIDER_SUITE=1`—smoke test login/navigation.

---

## 12. Notifications and reminders

- [ ] [`CheckInReminderSync`](../components/CheckInReminderSync.tsx): permissions request path sane; scheduled reminders align with check-in windows (spot-check on device).

---

## 13. Cross-cutting quality

- [ ] **Offline / airplane mode**: app does not white-screen; errors surfaced gracefully where network is used (tRPC, etc.).
- [ ] **Deep links / `+native-intent`**: if configured, primary intents open correct screen.
- [ ] **Web** (if supported): tab bar, modals, and scroll layouts usable.
- [ ] **Accessibility**: critical buttons have labels; font scaling does not clip primary CTAs on small phones.
- [ ] **Performance**: Today hub and Connect scroll smoothly with realistic data volume.

---

## 14. Build / store hygiene (non-UI)

- [ ] `npx tsc --noEmit` passes on release branch.
- [ ] EAS: `extra.eas.projectId` project slug matches `slug` in [`app.json`](../app.json) / Expo config (fixes [`eas submit` slug mismatch](https://expo.fyi/eas-project-id) if present).

---

## Sign-off

| Area | Tester | Date | Pass |
|------|--------|------|------|
| Launch & persistence | | | |
| Today + wizard + toasts | | | |
| Check-ins | | | |
| Crisis + tools | | | |
| Connect + rooms | | | |
| Profile + help + subscription | | | |

---

## Automated smoke (CI / pre-release)

Run from repo root:

```bash
npx tsc --noEmit
```

Record result and commit SHA in the sign-off table or release notes. Full Sections 1–13 require manual execution on devices.

---

## Logging failures

When a row fails during manual QA, open a **GitHub issue** (or your tracker) with:

1. Checklist **section number and row text**
2. **Device, OS version, app build**
3. **Steps to reproduce** and expected vs actual
4. **Screen recording** or screenshots

Link the issue in your release thread. If you prefer a repo log, append under `docs/ACCEPTANCE_RUN_LOG.md` (create on first failure).
