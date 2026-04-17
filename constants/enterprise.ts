import {
  Organization,
  OrgMember,
  RolePermission,
  EnterpriseRole,
  AlertThreshold,
  OrgAlert,
  EngagementHeatmapData,
  WeekHeatmapEntry,
  ComplianceSummary,
  ExportableReport,
  BillingInfo,
  WhiteLabelConfig,
  Invoice,
} from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'org_admin',
    canViewAllClients: true,
    canManageMembers: true,
    canManageBilling: true,
    canExportReports: true,
    canConfigureOrg: true,
    canViewHeatmaps: true,
    canSetAlertThresholds: true,
    canWhiteLabel: true,
  },
  {
    role: 'clinical_director',
    canViewAllClients: true,
    canManageMembers: true,
    canManageBilling: false,
    canExportReports: true,
    canConfigureOrg: false,
    canViewHeatmaps: true,
    canSetAlertThresholds: true,
    canWhiteLabel: false,
  },
  {
    role: 'therapist',
    canViewAllClients: false,
    canManageMembers: false,
    canManageBilling: false,
    canExportReports: true,
    canConfigureOrg: false,
    canViewHeatmaps: true,
    canSetAlertThresholds: false,
    canWhiteLabel: false,
  },
  {
    role: 'case_manager',
    canViewAllClients: false,
    canManageMembers: false,
    canManageBilling: false,
    canExportReports: true,
    canConfigureOrg: false,
    canViewHeatmaps: true,
    canSetAlertThresholds: false,
    canWhiteLabel: false,
  },
  {
    role: 'billing_admin',
    canViewAllClients: false,
    canManageMembers: false,
    canManageBilling: true,
    canExportReports: false,
    canConfigureOrg: false,
    canViewHeatmaps: false,
    canSetAlertThresholds: false,
    canWhiteLabel: false,
  },
  {
    role: 'viewer',
    canViewAllClients: false,
    canManageMembers: false,
    canManageBilling: false,
    canExportReports: false,
    canConfigureOrg: false,
    canViewHeatmaps: true,
    canSetAlertThresholds: false,
    canWhiteLabel: false,
  },
];

export const ROLE_LABELS: Record<EnterpriseRole, string> = {
  org_admin: 'Organization Admin',
  clinical_director: 'Clinical Director',
  therapist: 'Therapist',
  case_manager: 'Case Manager',
  billing_admin: 'Billing Admin',
  viewer: 'Viewer',
};

export const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export const TIER_PRICING = {
  starter: { monthly: 99, annual: 79, seats: 5 },
  professional: { monthly: 249, annual: 199, seats: 25 },
  enterprise: { monthly: 499, annual: 399, seats: 100 },
} as const;

export const DEFAULT_ORGANIZATION: Organization = {
  id: 'org_demo',
  name: 'Recovery Wellness Center',
  slug: 'recovery-wellness',
  logoUrl: '',
  primaryColor: '#2EC4B6',
  accentColor: '#FF6B35',
  tier: 'professional',
  maxSeats: 25,
  usedSeats: 6,
  createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
  isWhiteLabel: false,
  customDomain: '',
  contactEmail: 'admin@recoverywellness.org',
  contactPhone: '(555) 234-5678',
  address: '1200 Healing Way, Suite 300',
};

export const SAMPLE_MEMBERS: OrgMember[] = [
  {
    id: 'mem_1',
    orgId: 'org_demo',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@recoverywellness.org',
    role: 'org_admin',
    isActive: true,
    lastActiveAt: new Date(Date.now() - 1800000).toISOString(),
    joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
    clientIds: ['client_1', 'client_2', 'client_3', 'client_4'],
    avatar: '',
  },
  {
    id: 'mem_2',
    orgId: 'org_demo',
    name: 'Dr. Marcus Webb',
    email: 'marcus.webb@recoverywellness.org',
    role: 'clinical_director',
    isActive: true,
    lastActiveAt: new Date(Date.now() - 7200000).toISOString(),
    joinedAt: new Date(Date.now() - 150 * 86400000).toISOString(),
    clientIds: ['client_1', 'client_3'],
    avatar: '',
  },
  {
    id: 'mem_3',
    orgId: 'org_demo',
    name: 'Lisa Okafor',
    email: 'lisa.okafor@recoverywellness.org',
    role: 'therapist',
    isActive: true,
    lastActiveAt: new Date(Date.now() - 14400000).toISOString(),
    joinedAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    clientIds: ['client_2', 'client_4'],
    avatar: '',
  },
  {
    id: 'mem_4',
    orgId: 'org_demo',
    name: 'James Ruiz',
    email: 'james.ruiz@recoverywellness.org',
    role: 'case_manager',
    isActive: true,
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    joinedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    clientIds: ['client_1', 'client_2', 'client_3', 'client_4'],
    avatar: '',
  },
  {
    id: 'mem_5',
    orgId: 'org_demo',
    name: 'Karen Patel',
    email: 'karen.patel@recoverywellness.org',
    role: 'billing_admin',
    isActive: true,
    lastActiveAt: new Date(Date.now() - 172800000).toISOString(),
    joinedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    clientIds: [],
    avatar: '',
  },
  {
    id: 'mem_6',
    orgId: 'org_demo',
    name: 'Tom Nakamura',
    email: 'tom.nakamura@recoverywellness.org',
    role: 'viewer',
    isActive: false,
    lastActiveAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    clientIds: [],
    avatar: '',
  },
];

export const SAMPLE_THRESHOLDS: AlertThreshold[] = [
  {
    id: 'thresh_1',
    orgId: 'org_demo',
    name: 'High Risk Alert',
    metric: 'risk_score',
    operator: 'above',
    value: 65,
    isActive: true,
    notifyRoles: ['org_admin', 'clinical_director', 'therapist'],
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'thresh_2',
    orgId: 'org_demo',
    name: 'Low Engagement Warning',
    metric: 'engagement',
    operator: 'below',
    value: 30,
    isActive: true,
    notifyRoles: ['clinical_director', 'case_manager'],
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'thresh_3',
    orgId: 'org_demo',
    name: 'Missed Check-ins',
    metric: 'missed_checkins',
    operator: 'above',
    value: 3,
    isActive: true,
    notifyRoles: ['therapist', 'case_manager'],
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'thresh_4',
    orgId: 'org_demo',
    name: 'Stability Drop',
    metric: 'stability_drop',
    operator: 'above',
    value: 20,
    isActive: false,
    notifyRoles: ['clinical_director'],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export const SAMPLE_ORG_ALERTS: OrgAlert[] = [
  {
    id: 'alert_1',
    orgId: 'org_demo',
    thresholdId: 'thresh_1',
    clientId: 'client_2',
    clientName: 'Jordan R.',
    metric: 'risk_score',
    currentValue: 72,
    thresholdValue: 65,
    triggeredAt: new Date(Date.now() - 3600000).toISOString(),
    acknowledgedBy: '',
    acknowledgedAt: '',
    isAcknowledged: false,
  },
  {
    id: 'alert_2',
    orgId: 'org_demo',
    thresholdId: 'thresh_2',
    clientId: 'client_4',
    clientName: 'Taylor W.',
    metric: 'engagement',
    currentValue: 22,
    thresholdValue: 30,
    triggeredAt: new Date(Date.now() - 18000000).toISOString(),
    acknowledgedBy: '',
    acknowledgedAt: '',
    isAcknowledged: false,
  },
  {
    id: 'alert_3',
    orgId: 'org_demo',
    thresholdId: 'thresh_3',
    clientId: 'client_4',
    clientName: 'Taylor W.',
    metric: 'missed_checkins',
    currentValue: 5,
    thresholdValue: 3,
    triggeredAt: new Date(Date.now() - 86400000).toISOString(),
    acknowledgedBy: 'Dr. Sarah Chen',
    acknowledgedAt: new Date(Date.now() - 43200000).toISOString(),
    isAcknowledged: true,
  },
];

function generateHeatmapWeek(clientId: string, clientName: string, baseEngagement: number): EngagementHeatmapData {
  const weeks: WeekHeatmapEntry[] = [];
  const now = new Date();
  for (let i = 27; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const variance = Math.random() * 30 - 15;
    const weekendPenalty = isWeekend ? -10 : 0;
    const engagement = Math.max(0, Math.min(100, baseEngagement + variance + weekendPenalty));
    weeks.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      checkIns: engagement > 50 ? Math.ceil(Math.random() * 3) : Math.random() > 0.4 ? 1 : 0,
      engagementScore: Math.round(engagement),
      riskLevel: Math.round(Math.max(0, 100 - engagement + Math.random() * 20)),
      moodAvg: Math.round(engagement * 0.6 + Math.random() * 30),
    });
  }
  return { clientId, clientName, weekData: weeks };
}

export const SAMPLE_HEATMAP_DATA: EngagementHeatmapData[] = [
  generateHeatmapWeek('client_1', 'Alex M.', 75),
  generateHeatmapWeek('client_2', 'Jordan R.', 50),
  generateHeatmapWeek('client_3', 'Sam K.', 88),
  generateHeatmapWeek('client_4', 'Taylor W.', 30),
];

export const SAMPLE_COMPLIANCE_SUMMARIES: ComplianceSummary[] = [
  {
    clientId: 'client_1',
    clientName: 'Alex M.',
    overallRate: 92,
    completedRequirements: 46,
    totalRequirements: 50,
    missedCount: 4,
    currentStreak: 12,
    lastComplianceAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'compliant',
  },
  {
    clientId: 'client_2',
    clientName: 'Jordan R.',
    overallRate: 68,
    completedRequirements: 34,
    totalRequirements: 50,
    missedCount: 16,
    currentStreak: 2,
    lastComplianceAt: new Date(Date.now() - 18000000).toISOString(),
    status: 'at_risk',
  },
  {
    clientId: 'client_3',
    clientName: 'Sam K.',
    overallRate: 98,
    completedRequirements: 49,
    totalRequirements: 50,
    missedCount: 1,
    currentStreak: 31,
    lastComplianceAt: new Date(Date.now() - 1800000).toISOString(),
    status: 'compliant',
  },
  {
    clientId: 'client_4',
    clientName: 'Taylor W.',
    overallRate: 44,
    completedRequirements: 22,
    totalRequirements: 50,
    missedCount: 28,
    currentStreak: 0,
    lastComplianceAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'non_compliant',
  },
];

export const SAMPLE_REPORTS: ExportableReport[] = [
  {
    id: 'rpt_1',
    orgId: 'org_demo',
    title: 'Monthly Clinical Summary',
    format: 'clinical',
    generatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    generatedBy: 'Dr. Sarah Chen',
    periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    clientIds: ['client_1', 'client_2', 'client_3', 'client_4'],
    sections: [
      { title: 'Overview', type: 'metrics', content: 'All active clients summary', data: { totalClients: 4, avgStability: 61, avgRisk: 37 } },
      { title: 'Risk Analysis', type: 'narrative', content: 'One client showing elevated risk patterns requiring intervention.', data: {} },
    ],
    status: 'ready',
  },
  {
    id: 'rpt_2',
    orgId: 'org_demo',
    title: 'Compliance Report - Q4',
    format: 'compliance',
    generatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    generatedBy: 'James Ruiz',
    periodStart: new Date(Date.now() - 90 * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    clientIds: ['client_1', 'client_2', 'client_3', 'client_4'],
    sections: [
      { title: 'Compliance Rates', type: 'table', content: 'Per-client compliance rates', data: { avgRate: 76, compliant: 2, atRisk: 1, nonCompliant: 1 } },
    ],
    status: 'ready',
  },
];

export const SAMPLE_BILLING: BillingInfo = {
  orgId: 'org_demo',
  tier: 'professional',
  cycle: 'annual',
  status: 'active',
  seatsIncluded: 25,
  pricePerSeat: 12,
  basePrice: 199,
  nextBillingDate: new Date(Date.now() + 45 * 86400000).toISOString(),
  lastPaymentDate: new Date(Date.now() - 30 * 86400000).toISOString(),
  lastPaymentAmount: 271,
  paymentMethod: 'Visa ending in 4242',
  invoices: [
    { id: 'inv_1', date: new Date(Date.now() - 30 * 86400000).toISOString(), amount: 271, status: 'paid', description: 'Professional Plan - Annual + 6 seats' },
    { id: 'inv_2', date: new Date(Date.now() - 60 * 86400000).toISOString(), amount: 271, status: 'paid', description: 'Professional Plan - Annual + 6 seats' },
    { id: 'inv_3', date: new Date(Date.now() - 90 * 86400000).toISOString(), amount: 259, status: 'paid', description: 'Professional Plan - Annual + 5 seats' },
  ],
};

export const DEFAULT_WHITE_LABEL: WhiteLabelConfig = {
  orgId: 'org_demo',
  isEnabled: false,
  appName: 'Guardian',
  tagline: 'Wellness support for recovery and life goals',
  logoUrl: '',
  primaryColor: '#2EC4B6',
  accentColor: '#FF6B35',
  backgroundColor: '#0D1B2A',
  cardColor: '#1B2838',
  customDomain: '',
  supportEmail: '',
  supportPhone: '',
  privacyUrl: '',
  termsUrl: '',
};
