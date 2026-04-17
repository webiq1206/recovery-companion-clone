import type { ComponentType } from 'react';
import {
  Shield,
  BarChart3,
  Heart,
  Hammer,
  FileText,
  Users,
  ShieldCheck,
} from 'lucide-react-native';
import type { PremiumFeature } from '../types';
import { arePeerPracticeFeaturesEnabled } from '../core/socialLiveConfig';
import { isProviderEnterpriseSuiteInBuild } from '../utils/isProviderEnterpriseSuiteInBuild';

/**
 * What every user gets on the free (Freemium) tier — aligned with features not gated by `hasFeature`.
 */
export const FREEMIUM_HIGHLIGHTS: string[] = [
  'Crisis tools & emergency support',
  'Daily check-ins & Comprehensive Stability',
  'Sobriety tracking, streaks & milestones',
  'Journal entries & reflection prompts',
  'Pledges, triggers & progress views',
  'Connection hub: trusted circle & support resources (core)',
  'Today hub, goals & growth insights (core)',
];

/** Freemium bullets for paywalls; varies when peer practice features are omitted from the binary. */
export function getFreemiumHighlights(): string[] {
  const connectionLine = arePeerPracticeFeaturesEnabled()
    ? 'Connection hub & on-device practice scenarios (core)'
    : 'Connection hub: trusted circle & support resources (core)';
  return FREEMIUM_HIGHLIGHTS.map((line) =>
    line.startsWith('Connection hub') ? connectionLine : line,
  );
}

/** Section title on paywall / plans for the free tier list */
export const FREEMIUM_SECTION_TITLE = 'Freemium includes';

/**
 * Premium feature cards for marketing UI (icons + copy).
 * Order matches premium value prop; maps to `PremiumFeature` where applicable.
 */
type IconComp = ComponentType<{ size?: number; color?: string }>;

export type PremiumMarketingCard = {
  icon: IconComp;
  title: string;
  desc: string;
  color: string;
  featureKey: PremiumFeature;
};

export const PREMIUM_FEATURE_CARDS: PremiumMarketingCard[] = [
  {
    icon: Shield,
    title: 'Pattern awareness',
    desc: 'Trend views from your own check-ins and journals—not a diagnosis and not a substitute for professional care.',
    color: '#E07C7C',
    featureKey: 'predictive_engine',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    desc: 'Deeper charts from your on-device history—wellness insights, not clinical monitoring.',
    color: '#2EC4B6',
    featureKey: 'advanced_analytics',
  },
  {
    icon: Heart,
    title: 'Deep Emotional Exercises',
    desc: 'Guided self-reflection prompts for processing emotions—wellness support only, not therapy.',
    color: '#E0A07C',
    featureKey: 'deep_exercises',
  },
  {
    icon: Hammer,
    title: 'Life Rebuild Programs',
    desc: 'Structured habit replacement, routine building, and identity reconstruction tools.',
    color: '#7CE0A0',
    featureKey: 'rebuild_programs',
  },
  {
    icon: Users,
    title: 'Recovery Rooms',
    desc: 'Practice small-group-style prompts and journaling on your device (not live telehealth or moderated therapy).',
    color: '#C07CE0',
    featureKey: 'recovery_rooms',
  },
  {
    icon: ShieldCheck,
    title: 'Advanced Accountability',
    desc: 'Optional reminders, partner check-ins, and simple commitment tracking—wellness support, not clinical monitoring.',
    color: '#E0D47C',
    featureKey: 'advanced_accountability',
  },
  {
    icon: FileText,
    title: 'Care-circle summaries',
    desc: 'Optional exports when the workspace is enabled—share only what you choose with people you trust. Not a medical record.',
    color: '#7CBFE0',
    featureKey: 'therapist_export',
  },
];

/** Premium marketing cards for the active binary (consumer store builds omit care-partner export). */
export function getPremiumFeatureMarketingCards(): PremiumMarketingCard[] {
  let cards = isProviderEnterpriseSuiteInBuild()
    ? PREMIUM_FEATURE_CARDS
    : PREMIUM_FEATURE_CARDS.filter((c) => c.featureKey !== 'therapist_export');
  if (!arePeerPracticeFeaturesEnabled()) {
    cards = cards.filter((c) => c.featureKey !== 'recovery_rooms');
  }
  return cards;
}

/**
 * Rows for Freemium vs Premium comparison table.
 * `freemium` / `premium` indicate inclusion; `footnote` clarifies partial vs full where needed.
 */
export type TierComparisonRow = {
  id: string;
  label: string;
  freemium: boolean;
  premium: boolean;
  footnote?: string;
};

export const TIER_COMPARISON_ROWS: TierComparisonRow[] = [
  {
    id: 'core',
    label: 'Daily check-ins, Comprehensive Stability & streaks',
    freemium: true,
    premium: true,
  },
  {
    id: 'journal',
    label: 'Journal, milestones, pledges & triggers',
    freemium: true,
    premium: true,
  },
  {
    id: 'crisis',
    label: 'Crisis mode & emergency resources',
    freemium: true,
    premium: true,
  },
  {
    id: 'connection',
    label: 'Connection hub & community (core)',
    freemium: true,
    premium: true,
  },
  {
    id: 'deep_exercises',
    label: 'Deep workbook exercises (guided reflection)',
    freemium: false,
    premium: true,
  },
  {
    id: 'rebuild',
    label: 'Life Rebuild programs',
    freemium: false,
    premium: true,
  },
  {
    id: 'rooms',
    label: 'Recovery Rooms (small groups)',
    freemium: false,
    premium: true,
  },
  {
    id: 'accountability',
    label: 'Advanced accountability (partners & drift alerts)',
    freemium: false,
    premium: true,
  },
  {
    id: 'predictive_analytics',
    label: 'Predictive engine & advanced analytics (full)',
    freemium: false,
    premium: true,
    footnote:
      'Freemium includes core progress and charts where available; Premium unlocks the full predictive engine and deeper analytics.',
  },
];

/** Tier table for plan screens; omits Recovery Rooms when that capability is not shipped in the binary. */
export function getTierComparisonRows(): TierComparisonRow[] {
  const peer = arePeerPracticeFeaturesEnabled();
  return TIER_COMPARISON_ROWS.filter((row) => peer || row.id !== 'rooms').map((row) => {
    if (row.id === 'connection' && !peer) {
      return { ...row, label: 'Connection hub: trusted circle & crisis resources' };
    }
    return row;
  });
}
