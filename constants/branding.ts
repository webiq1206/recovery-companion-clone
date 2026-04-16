export const BRAND = {
  tagline: 'Recovery Protection & Life Rebuild System',
  shortTagline: 'Protect. Stabilize. Rebuild.',
  appName: 'Guardian',
  mission: 'A system that protects your recovery and helps you rebuild your life - not just count days.',
} as const;

export const ONBOARDING_COPY = {
  hero: {
    title: 'Protect your recovery\nRebuild your life',
    subtitle: 'Recovery Companion is more than a "Days of Sobriety" counter. It\'s a complete recovery protection system that adapts to you - detecting risk early, supporting you in crisis, and helping you build the life you deserve.',
    cta: 'Begin Setup',
  },
  valueProps: [
    {
      icon: 'shield' as const,
      title: 'Early pattern awareness',
      description:
        'Surfaces trends from your own check-ins and journals so you can use tools sooner. Self-assessment only—not a diagnosis or medical device.',
    },
    {
      icon: 'heart' as const,
      title: 'Emotional Stability Engine',
      description: 'Goes beyond mood tracking. Measures emotional regulation, sleep impact, and stress resilience over time.',
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
        'Encrypted, anonymous-capable, and consent-driven. Privacy Policy, Terms, and “Your data & sharing” are available in-app before and after setup.',
    },
  ],
  steps: {
    name: {
      title: 'Let\'s personalize\nyour protection',
      subtitle: 'Your name stays on your device only.',
    },
    addiction: {
      title: 'What are you\nprotecting against?',
      subtitle: 'Select all that apply. This shapes your safety net.',
    },
    dailySpend: {
      title: 'Daily spendings on\nyour addiction',
      subtitle: 'Rough estimates are fine. You can change these anytime in your profile.',
    },
    stage: {
      title: 'Where are you in\nyour recovery?',
      subtitle: 'This calibrates your protection level.',
    },
    struggle: {
      title: 'How intense is the\nstruggle right now?',
      subtitle: 'No judgment. This helps us respond appropriately.',
    },
    relapse: {
      title: 'Your history\nstrengthens your plan',
      subtitle: 'Past attempts inform better protection. Every try taught you something.',
    },
    triggers: {
      title: 'What puts your\nrecovery at risk?',
      subtitle: 'We\'ll help you build defenses around these.',
    },
    sleep: {
      title: 'How\'s your sleep?',
      subtitle: 'Sleep quality directly impacts recovery stability.',
    },
    support: {
      title: 'Your support network',
      subtitle: 'We fill gaps in support - you\'re never alone here.',
    },
    goals: {
      title: 'What are you\nrebuilding toward?',
      subtitle: 'Recovery isn\'t just leaving something behind - it\'s building something better.',
    },
  },
  completeCta: 'Activate My Protection',
} as const;

export const HOME_COPY = {
  heroLabel: 'RECOVERY PROTECTION',
  stabilityLabel: 'PROTECTION',
  freedomLabel: 'days protected',
  streakLabel: 'active streak',
  savedLabel: 'saved',
  focusLabels: {
    checkin: {
      title: 'Run Your Daily Scan',
      description: 'A quick assessment helps your protection system stay calibrated to how you\'re really feeling.',
      action: 'Start Scan',
    },
    crisis: {
      title: 'Protection Mode Active',
      description: 'Your system has detected elevated risk. Use your safety tools - they\'re designed for exactly this.',
      action: 'Access Safety Tools',
    },
    elevated: {
      title: 'Stay Grounded Today',
      description: 'Your body is signaling tension. A brief grounding exercise helps reset your nervous system.',
      action: 'Start Grounding',
    },
    strong: {
      title: 'Invest in Your Rebuild',
      description: 'Your stability is high. Channel this energy into building the life you\'re working toward.',
      action: 'Open Rebuild',
    },
    early: {
      title: 'One Protected Moment',
      description: 'These early days are when your protection system matters most. Stay close to your tools.',
      action: 'Write in Journal',
    },
    momentum: {
      title: 'Protection Is Working',
      description: 'Your consistency strengthens the system. Every day you engage, your protection deepens.',
      action: 'View Progress',
    },
  },
} as const;

export const MILESTONE_SHARE_MESSAGES: Record<number, { headline: string; body: string }> = {
  1: {
    headline: 'Day One Protected',
    body: 'I activated my recovery protection system today. The hardest step is the first one.',
  },
  3: {
    headline: '3 Days of Protection',
    body: 'Three days into building a new foundation. Every moment counts.',
  },
  7: {
    headline: 'One Week Protected',
    body: 'A full week of recovery protection. My body and mind are already beginning to heal.',
  },
  14: {
    headline: 'Two Weeks Strong',
    body: 'Fourteen days of protecting my recovery. The foundation is getting stronger.',
  },
  30: {
    headline: 'One Month Milestone',
    body: 'One month of active recovery protection. Real change is happening.',
  },
  60: {
    headline: 'Two Months of Growth',
    body: 'Sixty days of rebuilding. I\'m becoming someone I\'m proud of.',
  },
  90: {
    headline: 'Quarter Year of Freedom',
    body: 'Ninety days of recovery protection. I\'m not just surviving - I\'m rebuilding.',
  },
  180: {
    headline: 'Six Months Transformed',
    body: 'Half a year of protecting my recovery and rebuilding my life. The journey continues.',
  },
  365: {
    headline: 'One Year of Protection',
    body: 'A full year of recovery protection. Proof that a new life is possible.',
  },
  730: {
    headline: 'Two Years Rebuilt',
    body: 'Two years of steady growth and protection. The life I\'m building is real.',
  },
  1095: {
    headline: 'Three Years Free',
    body: 'Over a thousand days of protection. Recovery isn\'t a destination - it\'s a way of living.',
  },
  1825: {
    headline: 'Five Years of Freedom',
    body: 'Five years protected. I\'m living proof that recovery works.',
  },
};

export const SHAREABLE_FOOTER = 'Protected by Guardian - Recovery Protection & Life Rebuild System';
