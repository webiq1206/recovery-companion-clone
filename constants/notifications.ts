export type NotificationIntensity = 'minimal' | 'balanced' | 'supportive' | 'active';

export const NOTIFICATION_INTENSITY_CONFIG: Record<NotificationIntensity, {
  label: string;
  description: string;
  maxPerDay: number;
  minIntervalMinutes: number;
  enableRiskAlerts: boolean;
  enableStreakProtection: boolean;
  enableMissedCheckinNudge: boolean;
  enableEmotionalDipSupport: boolean;
  enableMorningEvening: boolean;
  cooldownAfterDismissMinutes: number;
}> = {
  minimal: {
    label: 'Minimal',
    description: 'Only critical alerts and milestones',
    maxPerDay: 2,
    minIntervalMinutes: 360,
    enableRiskAlerts: true,
    enableStreakProtection: false,
    enableMissedCheckinNudge: false,
    enableEmotionalDipSupport: false,
    enableMorningEvening: false,
    cooldownAfterDismissMinutes: 480,
  },
  balanced: {
    label: 'Balanced',
    description: 'Thoughtful reminders at key moments',
    maxPerDay: 4,
    minIntervalMinutes: 180,
    enableRiskAlerts: true,
    enableStreakProtection: true,
    enableMissedCheckinNudge: true,
    enableEmotionalDipSupport: false,
    enableMorningEvening: true,
    cooldownAfterDismissMinutes: 240,
  },
  supportive: {
    label: 'Supportive',
    description: 'Gentle support throughout the day',
    maxPerDay: 6,
    minIntervalMinutes: 120,
    enableRiskAlerts: true,
    enableStreakProtection: true,
    enableMissedCheckinNudge: true,
    enableEmotionalDipSupport: true,
    enableMorningEvening: true,
    cooldownAfterDismissMinutes: 120,
  },
  active: {
    label: 'Active',
    description: 'Maximum support for vulnerable periods',
    maxPerDay: 10,
    minIntervalMinutes: 60,
    enableRiskAlerts: true,
    enableStreakProtection: true,
    enableMissedCheckinNudge: true,
    enableEmotionalDipSupport: true,
    enableMorningEvening: true,
    cooldownAfterDismissMinutes: 60,
  },
};

export type BehavioralTriggerType =
  | 'high_risk_time'
  | 'emotional_dip'
  | 'missed_checkin'
  | 'streak_protection'
  | 'morning_anchor'
  | 'evening_wind_down'
  | 'craving_spike'
  | 'isolation_pattern'
  | 'milestone_approaching'
  | 'stability_drop';

export interface BehavioralNotificationTemplate {
  trigger: BehavioralTriggerType;
  title: string;
  messages: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  categoryId: string;
}

export const BEHAVIORAL_TEMPLATES: BehavioralNotificationTemplate[] = [
  {
    trigger: 'high_risk_time',
    title: 'Gentle Reminder',
    messages: [
      "This is usually a challenging time for you. Your tools are ready.",
      "You've navigated moments like this before. Remember what worked.",
      "Right now might feel heavy. Take one slow breath before anything else.",
      "This time of day can be tricky. You know what helps - trust yourself.",
    ],
    priority: 'high',
    categoryId: 'risk',
  },
  {
    trigger: 'emotional_dip',
    title: 'We See You',
    messages: [
      "It's okay to have hard days. They don't erase your progress.",
      "Your feelings are valid. You don't have to act on them to honor them.",
      "A low moment is not a low life. This will pass.",
      "When things feel heavy, even one small kind act toward yourself helps.",
    ],
    priority: 'high',
    categoryId: 'emotional',
  },
  {
    trigger: 'missed_checkin',
    title: 'No Pressure',
    messages: [
      "We missed you today. No judgment - just here when you're ready.",
      "Missing a day doesn't undo anything. Come back whenever feels right.",
      "A quick check-in can be grounding. But only if it serves you.",
      "Your recovery doesn't require perfection. Just honest return.",
    ],
    priority: 'medium',
    categoryId: 'engagement',
  },
  {
    trigger: 'streak_protection',
    title: 'Your Momentum Matters',
    messages: [
      "You've been showing up consistently. Today could keep that going.",
      "Your streak reflects real commitment. A quick check-in keeps it alive.",
      "Consistency builds trust with yourself. You've earned this momentum.",
    ],
    priority: 'medium',
    categoryId: 'engagement',
  },
  {
    trigger: 'morning_anchor',
    title: 'New Day',
    messages: [
      "Good morning. Today is another chance to choose the life you want.",
      "A new day begins. Start with one intentional breath.",
      "You woke up. That's the first victory. Build from here.",
      "Morning light, fresh start. What's one small thing you can do for yourself today?",
    ],
    priority: 'low',
    categoryId: 'routine',
  },
  {
    trigger: 'evening_wind_down',
    title: "Day's End",
    messages: [
      "The day is ending. Take a moment to honor what you did today.",
      "Before you rest, notice one thing you handled well. It counts.",
      "Another day navigated. Let yourself rest with that.",
      "Evening is for letting go. You did enough today.",
    ],
    priority: 'low',
    categoryId: 'routine',
  },
  {
    trigger: 'craving_spike',
    title: 'Stay Grounded',
    messages: [
      "Cravings have been elevated. This is temporary - ride the wave.",
      "Your brain is signaling, but you get to choose. Pause before you act.",
      "High cravings don't mean you're back to zero. They mean your body is still healing.",
      "This urge will peak and pass. You've proven you can outlast it.",
    ],
    priority: 'critical',
    categoryId: 'risk',
  },
  {
    trigger: 'isolation_pattern',
    title: 'Connection Matters',
    messages: [
      "It's been a while since you connected with anyone. That's worth noticing.",
      "Isolation can sneak up quietly. Reaching out is an act of self-care.",
      "You don't have to talk about recovery. Just being around people helps.",
    ],
    priority: 'medium',
    categoryId: 'social',
  },
  {
    trigger: 'milestone_approaching',
    title: 'Almost There',
    messages: [
      "A milestone is approaching. Every day closer is worth celebrating.",
      "You're building something meaningful. The next marker is within reach.",
      "Keep going. What you're building is becoming undeniable.",
    ],
    priority: 'low',
    categoryId: 'milestone',
  },
  {
    trigger: 'stability_drop',
    title: 'Checking In',
    messages: [
      "Your Comprehensive Stability shifted recently. Small adjustments can help.",
      "Things feel a bit unsteady. That's a signal, not a verdict.",
      "A dip in stability is information, not identity. What do you need right now?",
    ],
    priority: 'high',
    categoryId: 'risk',
  },
];

export const HIGH_RISK_HOUR_WINDOWS = [
  { start: 17, end: 21, label: 'evening' },
  { start: 22, end: 2, label: 'late_night' },
  { start: 5, end: 7, label: 'early_morning' },
];

export const NOTIFICATION_CHANNEL_CONFIG = {
  id: 'recovery-behavioral',
  name: 'Recovery Support',
  description: 'Behavioral notifications for recovery support',
  importance: 3,
  sound: 'default' as const,
};

export const ADAPTIVE_FREQUENCY_RULES = {
  consecutiveDismissThreshold: 3,
  frequencyReductionFactor: 0.5,
  recoveryPeriodHours: 48,
  engagementBoostFactor: 1.2,
  maxConsecutiveWithoutInteraction: 5,
};
