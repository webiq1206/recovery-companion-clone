/**
 * User-facing emotional language for risk and stability.
 * No raw scores or "Risk Level: X" - descriptive phrases + reassuring follow-up.
 */

export function getStabilityPhrase(score: number): string {
  if (score >= 80) return 'Feeling strong today.';
  if (score >= 65) return 'Feeling steady today.';
  if (score >= 50) return 'Holding steady.';
  if (score >= 35) return 'Some ups and downs - that\'s okay.';
  return 'Today\'s been tough. Your tools are here.';
}

export function getMoodPhrase(avgMood: number): string {
  if (avgMood >= 75) return 'Mood lifting.';
  if (avgMood >= 55) return 'Mood holding steady.';
  if (avgMood >= 35) return 'Mood a bit heavy.';
  return 'Mood low - be gentle with yourself.';
}

export function getCravingsPhrase(avgCraving: number): string {
  if (avgCraving <= 25) return 'Cravings quiet.';
  if (avgCraving <= 50) return 'Cravings manageable.';
  if (avgCraving <= 75) return 'Cravings noticeable.';
  return 'Cravings strong - reach out if you need to.';
}

/** For high/crisis risk: headline + reassuring follow-up. */
export function getCrisisRiskCopy(): { title: string; description: string; action: string } {
  return {
    title: 'Your recent check-ins look heavy',
    description: 'Safety tools are here for tough moments. You are not alone—breathing, grounding, and connection are one tap away.',
    action: 'Open Safety Tools',
  };
}

/** For elevated (not crisis) risk: tension + reassurance. */
export function getElevatedRiskCopy(): { title: string; description: string; action: string } {
  return {
    title: 'Your check-ins show extra tension',
    description: 'A brief grounding exercise can help you settle. Tools are here whenever you want them.',
    action: 'Start Grounding',
  };
}

/** Overall risk as used on Triggers / summary cards. No numbers. */
export function getOverallRiskPhrase(overallRiskPercent: number, hasData: boolean): { headline: string; reassurance: string } {
  if (!hasData) {
    return {
      headline: 'Your patterns will appear as you check in.',
      reassurance: 'Every check-in helps this app suggest gentler reminders and tools that fit you.',
    };
  }
  if (overallRiskPercent > 65) {
    return {
      headline: 'Your check-ins look like you are carrying extra weight today.',
      reassurance: 'Stay connected to your support tools - they\'re designed for moments like this. You\'ve got this.',
    };
  }
  if (overallRiskPercent > 40) {
    return {
      headline: 'Your check-ins show some tension.',
      reassurance: 'Awareness is your strength right now. Small, steady steps keep you moving forward.',
    };
  }
  return {
    headline: 'Your patterns look steady.',
    reassurance: 'Your efforts are showing up. Keep nourishing what\'s working.',
  };
}

/** One-line summary for Journey "risk" tap-through card (no numbers). */
export function getProtectionReadingSummary(stabilityScore: number, hasCheckIns: boolean): { line: string; reassurance: string } {
  if (!hasCheckIns) {
    return {
      line: 'Complete check-ins to see simple summaries from your own patterns.',
      reassurance: 'Your data stays private and is only used to offer better support.',
    };
  }
  const phrase = getStabilityPhrase(stabilityScore);
  return {
    line: phrase,
    reassurance: 'You can open a detailed view anytime to see how patterns and factors are combined - always paired with support, never judgment.',
  };
}
