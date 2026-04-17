import { WELLNESS_APP_DISCLAIMER } from './wellnessDisclaimer';

export const BRAND = {
  tagline: 'Wellness support for recovery and life goals',
  shortTagline: 'Reflect. Support yourself. Rebuild.',
  /** Matches App Store / Play listing name for consumer builds. */
  appName: 'Recovery Companion',
  mission: 'Self-help tools that support your recovery journey and help you rebuild—not just count days.',
} as const;

export const ONBOARDING_COPY = {
  wellnessDisclaimer: WELLNESS_APP_DISCLAIMER,
  hero: {
    title: 'Support your recovery\nRebuild your life',
    subtitle:
      'More than a day counter: guided check-ins, journaling, routines, and optional wellness summaries from your own entries—so you notice patterns sooner and reach for tools when life feels heavy. Not a medical device and not a substitute for professional care.',
    cta: 'Begin Setup',
  },
  valueProps: [
    {
      icon: 'shield' as const,
      title: 'Early pattern awareness',
      description:
        'Surfaces trends from your own check-ins and journals so you can use tools sooner. For self-reflection only—not a diagnosis, risk score, or medical assessment.',
    },
    {
      icon: 'heart' as const,
      title: 'Emotional wellness snapshot',
      description:
        'Turns mood, sleep, and stress check-ins into simple trends over time—wellness-oriented reflection, not clinical measurement.',
    },
    {
      icon: 'rebuild' as const,
      title: 'Life Rebuild Framework',
      description: 'Purpose-driven tools for habits, identity, goals, and relationships - because recovery is about building something new.',
    },
    {
      icon: 'lock' as const,
      title: 'Privacy-First Architecture',
      description:
        'On-device storage with optional app-layer encryption, an anonymous name option, and consent-driven sharing where applicable. Privacy Policy, Terms, and “Your data & sharing” are available in-app before and after setup.',
    },
  ],
  steps: {
    name: {
      title: 'Let\'s personalize\nyour experience',
      subtitle: 'Your name stays on your device only.',
    },
    addiction: {
      title: 'What are you\nworking on?',
      subtitle: 'Select all that apply. This shapes reminders and suggestions in the app.',
    },
    dailySpend: {
      title: 'Daily spendings on\nyour addiction',
      subtitle: 'Rough estimates are fine. You can change these anytime in your profile.',
    },
    stage: {
      title: 'Where are you in\nyour recovery?',
      subtitle: 'This adjusts prompts and suggestions—not medical care.',
    },
    struggle: {
      title: 'How intense is the\nstruggle right now?',
      subtitle: 'No judgment. This helps the app suggest gentler pacing and tools.',
    },
    relapse: {
      title: 'Your history\ninforms your plan',
      subtitle: 'Past attempts inform kinder, more realistic next steps. Every try taught you something.',
    },
    triggers: {
      title: 'What tends to make\ndays harder?',
      subtitle: 'We\'ll surface coping ideas and reminders around these—your choices, always.',
    },
    sleep: {
      title: 'How\'s your sleep?',
      subtitle: 'Rest supports focus and mood; rough nights are common—answer in your own words.',
    },
    support: {
      title: 'Your support network',
      subtitle: 'We suggest ways to connect—you choose who to involve.',
    },
    goals: {
      title: 'What are you\nrebuilding toward?',
      subtitle: 'Recovery isn\'t just leaving something behind - it\'s building something better.',
    },
  },
  completeCta: 'Finish setup',
} as const;

export const HOME_COPY = {
  heroLabel: 'DAILY WELLNESS',
  stabilityLabel: 'SUPPORT',
  freedomLabel: 'days in a row',
  streakLabel: 'active streak',
  savedLabel: 'saved',
  focusLabels: {
    checkin: {
      title: 'Run your daily check-in',
      description: 'A quick self-reflection keeps reminders and suggestions aligned with how you feel today.',
      action: 'Start check-in',
    },
    crisis: {
      title: 'Extra support today',
      description: 'Your recent check-ins suggest a rough patch. Use grounding and safety tools whenever you need them.',
      action: 'Open safety tools',
    },
    elevated: {
      title: 'Stay grounded today',
      description: 'Stress can feel physical. A short grounding exercise can help you settle—no pressure, go at your pace.',
      action: 'Start grounding',
    },
    strong: {
      title: 'Invest in your rebuild',
      description: 'Things look steady in your entries. Channel some energy into a small rebuild step.',
      action: 'Open Rebuild',
    },
    early: {
      title: 'One honest check-in',
      description: 'Early days are tender. Stay close to tools and people you trust—this app supplements, not replaces, care.',
      action: 'Write in journal',
    },
    momentum: {
      title: 'Keep the rhythm',
      description: 'Showing up matters. Small check-ins and actions add up to steadier habits over time.',
      action: 'View progress',
    },
  },
} as const;

export const MILESTONE_SHARE_MESSAGES: Record<number, { headline: string; body: string }> = {
  1: {
    headline: 'Day one',
    body: 'I started using wellness tools for my recovery today. The hardest step is the first one.',
  },
  3: {
    headline: 'Three days steady',
    body: 'Three days into building a new foundation. Every moment counts.',
  },
  7: {
    headline: 'One week',
    body: 'A full week of showing up for myself. Small steps add up.',
  },
  14: {
    headline: 'Two weeks strong',
    body: 'Fourteen days of honest effort. The foundation is getting stronger.',
  },
  30: {
    headline: 'One month milestone',
    body: 'One month of steady self-support. Real change is happening.',
  },
  60: {
    headline: 'Two months of growth',
    body: 'Sixty days of rebuilding. I\'m becoming someone I\'m proud of.',
  },
  90: {
    headline: 'Quarter year',
    body: 'Ninety days of showing up. I\'m not just surviving—I\'m rebuilding.',
  },
  180: {
    headline: 'Six months',
    body: 'Half a year of self-support and rebuilding. The journey continues.',
  },
  365: {
    headline: 'One year',
    body: 'A full year of showing up. Proof that a new rhythm is possible.',
  },
  730: {
    headline: 'Two years rebuilt',
    body: 'Two years of steady growth. The life I\'m building is real.',
  },
  1095: {
    headline: 'Three years',
    body: 'Over a thousand days of showing up. Recovery isn\'t a destination—it\'s a way of living.',
  },
  1825: {
    headline: 'Five years',
    body: 'Five years of steady effort. I\'m proud of the path I\'m on.',
  },
};

export const SHAREABLE_FOOTER = 'Recovery Companion — wellness and self-help tools for your journey';
