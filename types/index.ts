export type RecoveryStage = 'crisis' | 'stabilize' | 'rebuild' | 'maintain';
export type StruggleLevel = 1 | 2 | 3 | 4 | 5;
export type SleepQualityLevel = 'poor' | 'fair' | 'good' | 'excellent';
export type SupportAvailability = 'none' | 'limited' | 'moderate' | 'strong';

export interface PrivacyControls {
  isAnonymous: boolean;
  shareProgress: boolean;
  shareMood: boolean;
  allowCommunityMessages: boolean;
}

export interface RecoveryProfile {
  recoveryStage: RecoveryStage;
  struggleLevel: StruggleLevel;
  relapseCount: number;
  triggers: string[];
  sleepQuality: SleepQualityLevel;
  supportAvailability: SupportAvailability;
  goals: string[];
  riskScore: number;
  interventionIntensity: 'low' | 'moderate' | 'high' | 'critical';
  baselineStabilityScore: number;

  // Onboarding recovery assessment fields
  baselineStability?: number;
  relapseRiskLevel?: 'low' | 'moderate' | 'high' | 'critical';
  emotionalBaseline?: number;
  cravingBaseline?: number;
  supportLevel?: 'low' | 'medium' | 'high';
}

export type TimelineEventType = 'relapse' | 'crisis_activation';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string; // YYYY-MM-DD
  // Optional context for richer recovery insights; kept minimal for offline use.
  whatHappenedLabel?: string;
  whenLabel?: string;
  whereLabel?: string;
  wereYouLabel?: string;
  triggerLabel?: string;
  thinkingLabel?: string;
  happenedDuringLabel?: string;
  afterHaveYouLabel?: string;
  emotionalStateLabel?: string;
}

export interface UserProfile {
  name: string;
  addictions: string[];
  soberDate: string;
  /** Money spent on addiction per day (onboarding + profile "Money Spent Daily"). */
  dailySavings: number;
  /** Time spent on addiction per day in hours (shown as “N hour(s)/day” on profile). */
  timeSpentDaily: number;
  motivation: string;
  hasCompletedOnboarding: boolean;
  privacyControls: PrivacyControls;
  recoveryProfile: RecoveryProfile;
}

export interface Pledge {
  id: string;
  date: string;
  completed: boolean;
  feeling: number;
  note: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: number;
}

export interface Milestone {
  id: string;
  days: number;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  uri: string;
  caption: string;
  date: string;
}

export interface MotivationalPackage {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockMilestoneDays: number;
  statements: string[];
  imageUrls: string[];
  thumbnailUrl: string;
}

export interface WorkbookSection {
  id: string;
  title: string;
  description: string;
  unlockMilestoneDays: number;
  questions: WorkbookQuestion[];
}

export interface WorkbookQuestion {
  id: string;
  type: 'reflection' | 'assignment' | 'journaling' | 'exercise';
  question: string;
  hint?: string;
}

export interface WorkbookAnswer {
  questionId: string;
  sectionId: string;
  answer: string;
  completedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface RelapsePlan {
  warningSigns: string[];
  triggers: string[];
  copingStrategies: string[];
  emergencyContacts: EmergencyContact[];
  commitments: string;
}

export interface CommunityUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  joinedAt: string;
  followerIds: string[];
  followingIds: string[];
}

export interface CommunityPost {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  visibility: 'public' | 'private';
  likes: string[];
  commentIds: string[];
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface PrivateGroup {
  id: string;
  ownerId: string;
  name: string;
  memberUsernames: string[];
  createdAt: string;
}

export type CheckInTimeOfDay = 'morning' | 'afternoon' | 'evening';

export type EmotionalTag =
  | 'anxious'
  | 'lonely'
  | 'ashamed'
  | 'angry'
  | 'hopeful'
  | 'numb';

export interface DailyCheckIn {
  id: string;
  date: string;
  timeOfDay: CheckInTimeOfDay;
  mood: number;
  cravingLevel: number;
  stress: number;
  sleepQuality: number;
  environment: number;
  emotionalState: number;
  stabilityScore: number;
  reflection: string;
  completedAt: string;
  /** Present when this check-in is associated with logging a setback/relapse. */
  relapseLogged?: boolean;
  emotionalTags?: EmotionalTag[];
}

export interface NearMissEvent {
  timestamp: string;
  cravingLevel: number;
  triggerContext: string;
  note?: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  role: 'friend' | 'family' | 'sponsor' | 'therapist' | 'peer';
  phone: string;
  isAvailable: boolean;
  addedAt: string;
}

export interface PeerChat {
  id: string;
  anonymousName: string;
  messages: PeerMessage[];
  createdAt: string;
  isActive: boolean;
  topic: string;
}

export interface PeerMessage {
  id: string;
  chatId: string;
  content: string;
  isOwn: boolean;
  timestamp: string;
}

export interface SafeRoom {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  topic: string;
  isJoined: boolean;
  createdAt: string;
  lastActivity: string;
  messages: RoomMessage[];
}

export interface RoomMessage {
  id: string;
  roomId: string;
  authorName: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export interface SponsorMessage {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: string;
}

export interface SponsorPairing {
  id: string;
  sponsorName: string;
  sponsorRecoveryTypes: string[];
  matchedRecoveryTypes: string[];
  status: 'pending' | 'active' | 'ended';
  matchedAt: string;
  lastCheckIn: string;
  notes: string;
  messages: SponsorMessage[];
}

export interface ReplacementHabit {
  id: string;
  oldTrigger: string;
  newHabit: string;
  category: 'physical' | 'mental' | 'social' | 'creative' | 'spiritual';
  streak: number;
  lastCompleted: string;
  createdAt: string;
  isActive: boolean;
}

export interface RoutineBlock {
  id: string;
  time: 'morning' | 'afternoon' | 'evening' | 'night';
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt: string;
  order: number;
}

export interface PurposeGoal {
  id: string;
  title: string;
  description: string;
  category: 'career' | 'health' | 'relationships' | 'learning' | 'personal';
  progress: number;
  targetDate: string;
  createdAt: string;
  isCompleted: boolean;
  milestoneSteps: GoalStep[];
}

export interface GoalStep {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt: string;
}

export interface ConfidenceMilestone {
  id: string;
  title: string;
  description: string;
  achievedAt: string;
  category: 'identity' | 'skill' | 'relationship' | 'mindset' | 'achievement';
}

export type IdentityModuleCategory = 'self_worth' | 'values' | 'purpose' | 'life_goals';

export interface IdentityExercise {
  id: string;
  title: string;
  prompt: string;
  hint?: string;
  type: 'reflection' | 'writing' | 'action' | 'visualization';
}

export interface IdentityModule {
  id: string;
  week: number;
  title: string;
  description: string;
  category: IdentityModuleCategory;
  exercises: IdentityExercise[];
  affirmation: string;
}

export interface IdentityExerciseResponse {
  moduleId: string;
  exerciseId: string;
  response: string;
  completedAt: string;
}

export interface IdentityValue {
  id: string;
  label: string;
  importance: number;
  addedAt: string;
}

export interface IdentityProgramData {
  currentWeek: number;
  startedAt: string;
  exerciseResponses: IdentityExerciseResponse[];
  values: IdentityValue[];
  completedModuleIds: string[];
}

export interface RebuildData {
  habits: ReplacementHabit[];
  routines: RoutineBlock[];
  goals: PurposeGoal[];
  confidenceMilestones: ConfidenceMilestone[];
  identityProgram: IdentityProgramData;
}

export interface CommitmentContract {
  id: string;
  title: string;
  description: string;
  category: 'sobriety' | 'health' | 'relationships' | 'growth' | 'boundaries';
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  checkIns: ContractCheckIn[];
  streakDays: number;
  lastCheckedIn: string;
}

export interface ContractCheckIn {
  id: string;
  contractId: string;
  date: string;
  honored: boolean;
  note: string;
}

export interface AccountabilityPartner {
  id: string;
  name: string;
  relationship: 'friend' | 'family' | 'sponsor' | 'peer' | 'therapist';
  phone: string;
  isConnected: boolean;
  addedAt: string;
  lastSharedAt: string;
  sharingLevel: 'minimal' | 'moderate' | 'full';
}

export interface DriftAlert {
  id: string;
  type: 'missed_checkin' | 'mood_decline' | 'streak_risk' | 'isolation' | 'craving_spike';
  severity: 'gentle' | 'moderate' | 'urgent';
  message: string;
  suggestion: string;
  createdAt: string;
  isDismissed: boolean;
}

export interface AccountabilityData {
  contracts: CommitmentContract[];
  partners: AccountabilityPartner[];
  alerts: DriftAlert[];
  streakProtectionUsed: number;
  streakProtectionMax: number;
}

export interface RecoveryRoom {
  id: string;
  name: string;
  description: string;
  topic: RecoveryRoomTopic;
  memberCount: number;
  maxMembers: number;
  isJoined: boolean;
  isAnonymous: boolean;
  createdAt: string;
  lastActivity: string;
  scheduledSessions: ScheduledSession[];
  messages: RecoveryRoomMessage[];
  rules: string[];
  isLive: boolean;
  currentSessionId: string | null;
}

export type RecoveryRoomTopic =
  | 'general'
  | 'cravings'
  | 'grief'
  | 'anxiety'
  | 'relationships'
  | 'early_recovery'
  | 'relapse_prevention'
  | 'mindfulness'
  | 'anger'
  | 'self_care';

export interface ScheduledSession {
  id: string;
  roomId: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  isActive: boolean;
  attendeeCount: number;
}

export interface RecoveryRoomMessage {
  id: string;
  roomId: string;
  authorName: string;
  authorId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  isAnonymous: boolean;
  isReported: boolean;
  reportReason: string;
}

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionState {
  tier: SubscriptionTier;
  subscribedAt: string | null;
  expiresAt: string | null;
}

export type PremiumFeature =
  | 'predictive_engine'
  | 'advanced_analytics'
  | 'deep_exercises'
  | 'rebuild_programs'
  | 'therapist_export'
  | 'recovery_rooms'
  | 'advanced_accountability';

export interface RoomReport {
  id: string;
  roomId: string;
  messageId: string;
  reporterId: string;
  reason: 'inappropriate' | 'harassment' | 'spam' | 'triggering' | 'other';
  description: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

export type MicroWinCategory = 'consistency' | 'emotional' | 'social' | 'growth' | 'resilience' | 'self_care';

export interface MicroWin {
  id: string;
  title: string;
  description: string;
  category: MicroWinCategory;
  earnedAt: string;
  icon: string;
}

export interface GrowthDimension {
  id: string;
  label: string;
  score: number;
  previousScore: number;
  maxScore: number;
  color: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  protectionTokens: number;
  maxProtectionTokens: number;
  protectionUsedDates: string[];
  lastActiveDate: string;
  gracePeriodActive: boolean;
  gracePeriodExpires: string;
}

export interface EngagementData {
  microWins: MicroWin[];
  streak: StreakData;
  growthDimensions: GrowthDimension[];
  totalWins: number;
  weeklyWins: number;
  notificationPreferences: NotificationPreferences;
  lastEncouragementShown: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  morningCheckin: boolean;
  eveningReflection: boolean;
  riskBasedAlerts: boolean;
  milestoneReminders: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

export type RiskTrend = 'rising' | 'stable' | 'falling';
export type AlertSeverity = 'info' | 'caution' | 'warning' | 'critical';
export type InterventionType = 'breathing' | 'grounding' | 'journaling' | 'connection' | 'crisis' | 'checkin' | 'isolation_outreach';

export type RiskCategory = 'low' | 'guarded' | 'elevated' | 'high';

export interface RiskPrediction {
  overallRisk: number;
  emotionalRisk: number;
  behavioralRisk: number;
  triggerRisk: number;
  stabilityRisk: number;
  isolationRisk: number;
  riskCategory: RiskCategory;
  trend: RiskTrend;
  confidence: number;
  generatedAt: string;
}

export interface AdaptiveWeights {
  emotional: number;
  behavioral: number;
  trigger: number;
  stability: number;
  isolation: number;
  lastAdaptedAt: string;
  adaptationCount: number;
}

export interface RiskAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  suggestion: string;
  interventionType: InterventionType;
  route: string;
  createdAt: string;
  isDismissed: boolean;
  isActedOn: boolean;
}

export interface SupportIntensity {
  level: 'baseline' | 'elevated' | 'high' | 'maximum';
  checkInFrequency: 'daily' | 'twice_daily' | 'every_few_hours';
  showCrisisButton: boolean;
  enableProactiveAlerts: boolean;
  companionTone: 'encouraging' | 'supportive' | 'urgent' | 'crisis';
}

export interface RiskPredictionData {
  predictions: RiskPrediction[];
  alerts: RiskAlert[];
  currentIntensity: SupportIntensity;
  lastAnalyzedAt: string;
  adaptiveWeights: AdaptiveWeights;
  interventionHistory: InterventionRecord[];
}

export interface InterventionRecord {
  id: string;
  triggeredAt: string;
  riskCategory: RiskCategory;
  interventionType: InterventionType;
  wasAutoTriggered: boolean;
  riskScoreAtTime: number;
}

export type ProviderRole = 'therapist' | 'counselor' | 'case_manager' | 'peer_specialist' | 'psychiatrist';
export type ConsentStatus = 'pending' | 'granted' | 'revoked';
export type ClientStatus = 'active' | 'paused' | 'discharged';

export interface ProviderProfile {
  id: string;
  name: string;
  role: ProviderRole;
  organization: string;
  email: string;
  isPortalEnabled: boolean;
  createdAt: string;
}

export interface ClientInvitation {
  id: string;
  clientName: string;
  clientEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  respondedAt: string;
  consentScope: ConsentScope;
}

export interface ConsentScope {
  progressData: boolean;
  moodTrends: boolean;
  relapseAlerts: boolean;
  engagementMetrics: boolean;
  journalSummaries: boolean;
  checkInData: boolean;
}

export interface ConnectedClient {
  id: string;
  name: string;
  anonymousAlias: string;
  status: ClientStatus;
  connectedAt: string;
  lastActivity: string;
  consentStatus: ConsentStatus;
  consentScope: ConsentScope;
  daysSober: number;
  currentStreak: number;
  recoveryStage: RecoveryStage;
  stabilityScore: number;
  riskLevel: number;
  riskTrend: RiskTrend;
  moodAverage: number;
  engagementScore: number;
  checkInCount: number;
  lastCheckIn: string;
  relapseCount: number;
  weeklyTrend: WeeklyTrend[];
}

export interface WeeklyTrend {
  week: string;
  stability: number;
  mood: number;
  engagement: number;
  risk: number;
}

export interface ClientReport {
  id: string;
  clientId: string;
  clientName: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  stabilityAvg: number;
  moodAvg: number;
  riskAvg: number;
  engagementAvg: number;
  checkInCount: number;
  streakDays: number;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface ProviderPortalData {
  provider: ProviderProfile;
  clients: ConnectedClient[];
  invitations: ClientInvitation[];
  reports: ClientReport[];
}

export type ComplianceCheckInStatus = 'completed' | 'missed' | 'pending' | 'excused';
export type ComplianceRequirementType = 'checkin' | 'breath_test' | 'location_verify' | 'meeting_attendance' | 'curfew';

export interface ComplianceRequirement {
  id: string;
  type: ComplianceRequirementType;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'as_scheduled';
  requiredTime: string;
  windowMinutes: number;
  isActive: boolean;
}

export interface ComplianceLog {
  id: string;
  requirementId: string;
  type: ComplianceRequirementType;
  status: ComplianceCheckInStatus;
  scheduledAt: string;
  completedAt: string;
  note: string;
  verificationData: string;
}

export interface ComplianceAlert {
  id: string;
  requirementId: string;
  type: 'upcoming' | 'missed' | 'overdue';
  title: string;
  message: string;
  scheduledAt: string;
  createdAt: string;
  isDismissed: boolean;
}

export interface ComplianceData {
  isEnabled: boolean;
  caseId: string;
  officerName: string;
  officerPhone: string;
  courtName: string;
  startDate: string;
  endDate: string;
  requirements: ComplianceRequirement[];
  logs: ComplianceLog[];
  alerts: ComplianceAlert[];
  overallComplianceRate: number;
}

export interface StageTransition {
  id: string;
  fromStage: RecoveryStage;
  toStage: RecoveryStage;
  triggeredAt: string;
  reason: string;
  signals: StageSignal[];
  acknowledged: boolean;
}

export interface StageSignal {
  factor: string;
  value: number;
  weight: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface StageConfig {
  stage: RecoveryStage;
  label: string;
  description: string;
  transitionMessage: string;
  uiIntensity: 'high' | 'moderate' | 'low' | 'minimal';
  supportFrequency: 'constant' | 'frequent' | 'regular' | 'periodic';
  aiTone: 'urgent' | 'supportive' | 'encouraging' | 'celebratory';
  interventionTiming: 'immediate' | 'proactive' | 'scheduled' | 'on_demand';
  accentColor: string;
  iconName: string;
  program: {
    durationDays: number;
    weeklyObjectives: string[];
    recommendedExercises: string[];
    dailyPractices: string[];
  };
}

export interface StageDetectionData {
  currentStage: RecoveryStage;
  previousStage: RecoveryStage | null;
  stageConfig: StageConfig;
  transitions: StageTransition[];
  lastEvaluatedAt: string;
  stageStartedAt: string;
  pendingTransition: StageTransition | null;
}

export type AuthMethod = 'pin' | 'biometric' | 'none';
export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';

export interface SecuritySettings {
  isAuthEnabled: boolean;
  authMethod: AuthMethod;
  biometricEnabled: boolean;
  autoLockTimeout: number;
  securityLevel: SecurityLevel;
  dataEncryptionEnabled: boolean;
  auditLoggingEnabled: boolean;
  anonymizedAnalyticsEnabled: boolean;
  screenCaptureBlocked: boolean;
  lastAuthAt: string;
  failedAttempts: number;
  lockoutUntil: string;
}

export type AuditAction =
  | 'auth_success'
  | 'auth_failure'
  | 'auth_lockout'
  | 'data_access'
  | 'data_export'
  | 'data_delete'
  | 'settings_change'
  | 'consent_change'
  | 'session_start'
  | 'session_end'
  | 'pin_change'
  | 'biometric_toggle'
  | 'encryption_toggle'
  | 'provider_access'
  | 'report_generated'
  | 'data_shared';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  timestamp: string;
  details: string;
  ipHash: string;
  sessionId: string;
  success: boolean;
}

export interface AnonymizedEvent {
  id: string;
  category: 'engagement' | 'feature_use' | 'session' | 'milestone' | 'error';
  action: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean>;
}

export interface SecurityState {
  settings: SecuritySettings;
  isAuthenticated: boolean;
  isLocked: boolean;
  sessionId: string;
  auditLog: AuditLogEntry[];
  analyticsEvents: AnonymizedEvent[];
}

export type EnterpriseRole = 'org_admin' | 'clinical_director' | 'therapist' | 'case_manager' | 'billing_admin' | 'viewer';
export type OrgTier = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type BillingStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';
export type ReportFormat = 'summary' | 'detailed' | 'compliance' | 'clinical';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  tier: OrgTier;
  maxSeats: number;
  usedSeats: number;
  createdAt: string;
  isWhiteLabel: boolean;
  customDomain: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: EnterpriseRole;
  isActive: boolean;
  lastActiveAt: string;
  joinedAt: string;
  clientIds: string[];
  avatar: string;
}

export interface RolePermission {
  role: EnterpriseRole;
  canViewAllClients: boolean;
  canManageMembers: boolean;
  canManageBilling: boolean;
  canExportReports: boolean;
  canConfigureOrg: boolean;
  canViewHeatmaps: boolean;
  canSetAlertThresholds: boolean;
  canWhiteLabel: boolean;
}

export interface AlertThreshold {
  id: string;
  orgId: string;
  name: string;
  metric: 'risk_score' | 'engagement' | 'missed_checkins' | 'mood_decline' | 'stability_drop';
  operator: 'above' | 'below';
  value: number;
  isActive: boolean;
  notifyRoles: EnterpriseRole[];
  createdAt: string;
}

export interface OrgAlert {
  id: string;
  orgId: string;
  thresholdId: string;
  clientId: string;
  clientName: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  triggeredAt: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
  isAcknowledged: boolean;
}

export interface EngagementHeatmapData {
  clientId: string;
  clientName: string;
  weekData: WeekHeatmapEntry[];
}

export interface WeekHeatmapEntry {
  date: string;
  dayOfWeek: number;
  checkIns: number;
  engagementScore: number;
  riskLevel: number;
  moodAvg: number;
}

export interface ComplianceSummary {
  clientId: string;
  clientName: string;
  overallRate: number;
  completedRequirements: number;
  totalRequirements: number;
  missedCount: number;
  currentStreak: number;
  lastComplianceAt: string;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

export interface ExportableReport {
  id: string;
  orgId: string;
  title: string;
  format: ReportFormat;
  generatedAt: string;
  generatedBy: string;
  periodStart: string;
  periodEnd: string;
  clientIds: string[];
  sections: ReportSection[];
  status: 'generating' | 'ready' | 'failed';
}

export interface ReportSection {
  title: string;
  type: 'metrics' | 'chart' | 'table' | 'narrative';
  content: string;
  data: Record<string, number | string>;
}

export interface BillingInfo {
  orgId: string;
  tier: OrgTier;
  cycle: BillingCycle;
  status: BillingStatus;
  seatsIncluded: number;
  pricePerSeat: number;
  basePrice: number;
  nextBillingDate: string;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  paymentMethod: string;
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export interface WhiteLabelConfig {
  orgId: string;
  isEnabled: boolean;
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  customDomain: string;
  supportEmail: string;
  supportPhone: string;
  privacyUrl: string;
  termsUrl: string;
}

export interface EnterpriseData {
  organization: Organization;
  members: OrgMember[];
  permissions: RolePermission[];
  alertThresholds: AlertThreshold[];
  alerts: OrgAlert[];
  heatmapData: EngagementHeatmapData[];
  complianceSummaries: ComplianceSummary[];
  reports: ExportableReport[];
  billing: BillingInfo;
  whiteLabel: WhiteLabelConfig;
}

export type RetentionLoopType = 'relief' | 'growth' | 'control' | 'belonging';

export interface RetentionLoop {
  id: RetentionLoopType;
  label: string;
  description: string;
  score: number;
  previousScore: number;
  activatedAt: string;
  lastTriggeredAt: string;
  triggerCount: number;
}

export type MicroProgressCategory = 'emotional_regulation' | 'trigger_reduction' | 'confidence_growth' | 'consistency' | 'connection' | 'self_awareness';

export interface MicroProgressMarker {
  id: string;
  category: MicroProgressCategory;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  earnedAt: string;
  streakDays: number;
  bestStreak: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface EmotionalRegulationStreak {
  currentStreak: number;
  bestStreak: number;
  lastStableDate: string;
  volatilityScores: number[];
}

export interface TriggerReductionMilestone {
  id: string;
  title: string;
  description: string;
  threshold: number;
  achievedAt: string;
  currentReduction: number;
}

export interface ConfidenceGrowthMarker {
  id: string;
  title: string;
  description: string;
  score: number;
  previousScore: number;
  measuredAt: string;
  factors: string[];
}

export interface SupportiveNotification {
  id: string;
  type: 'relief' | 'growth' | 'control' | 'belonging' | 'milestone' | 'gentle_nudge';
  title: string;
  message: string;
  scheduledFor: string;
  deliveredAt: string;
  behaviorPattern: string;
  isDelivered: boolean;
}

export interface RetentionData {
  loops: RetentionLoop[];
  microProgress: MicroProgressMarker[];
  emotionalRegulation: EmotionalRegulationStreak;
  triggerMilestones: TriggerReductionMilestone[];
  confidenceMarkers: ConfidenceGrowthMarker[];
  notifications: SupportiveNotification[];
  overallRetentionScore: number;
  lastEvaluatedAt: string;
}

export type NotificationIntensityLevel = 'minimal' | 'balanced' | 'supportive' | 'active';

export interface BehavioralNotificationRecord {
  id: string;
  trigger: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledAt: string;
  deliveredAt: string;
  interactedAt: string;
  dismissed: boolean;
  tapped: boolean;
}

export interface NotificationFrequencyState {
  todayCount: number;
  todayDate: string;
  lastSentAt: string;
  consecutiveDismisses: number;
  frequencyMultiplier: number;
  lastInteractionAt: string;
  consecutiveWithoutInteraction: number;
  pausedUntil: string;
}

export interface BehavioralNotificationState {
  isPermissionGranted: boolean;
  intensity: NotificationIntensityLevel;
  history: BehavioralNotificationRecord[];
  frequency: NotificationFrequencyState;
  highRiskHours: number[];
  lastMissedCheckinAlert: string;
  lastEmotionalDipAlert: string;
  lastStreakProtectionAlert: string;
  lastStabilityDropAlert: string;
}
