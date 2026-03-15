import * as z from "zod";

export const UserSchema = z.object({
  id: z.string(),
  anonymousId: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  isAnonymous: z.boolean().default(true),
  consentDataSharing: z.boolean().default(false),
  consentAnalytics: z.boolean().default(false),
  consentTherapistAccess: z.boolean().default(false),
  encryptionKeyHash: z.string().optional(),
  authMethod: z.enum(["pin", "biometric", "none"]).default("none"),
  securityLevel: z.enum(["standard", "enhanced", "maximum"]).default("standard"),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastActiveAt: z.string(),
  isDeleted: z.boolean().default(false),
});

export const RecoveryProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  recoveryStage: z.enum(["crisis", "stabilize", "rebuild", "maintain"]),
  struggleLevel: z.number().min(1).max(5),
  relapseCount: z.number().default(0),
  soberDate: z.string(),
  addictions: z.array(z.string()),
  triggers: z.array(z.string()),
  sleepQuality: z.enum(["poor", "fair", "good", "excellent"]),
  supportAvailability: z.enum(["none", "limited", "moderate", "strong"]),
  goals: z.array(z.string()),
  riskScore: z.number().default(0),
  interventionIntensity: z.enum(["low", "moderate", "high", "critical"]),
  baselineStabilityScore: z.number().default(50),
  dailySavings: z.number().default(0),
  motivation: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CheckInSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  mood: z.number().min(1).max(10),
  cravingLevel: z.number().min(1).max(10),
  stress: z.number().min(1).max(10),
  sleepQuality: z.number().min(1).max(10),
  environment: z.number().min(1).max(10),
  emotionalState: z.number().min(1).max(10),
  stabilityScore: z.number(),
  reflection: z.string().optional(),
  completedAt: z.string(),
  emotionalTags: z.array(z.string()).max(3).optional(),
  isEncrypted: z.boolean().default(false),
});

export const StabilityScoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  score: z.number(),
  emotionalScore: z.number(),
  behavioralScore: z.number(),
  socialScore: z.number(),
  physicalScore: z.number(),
  trend: z.enum(["rising", "stable", "falling"]),
  calculatedAt: z.string(),
  factors: z.string(),
});

export const TriggerSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  category: z.enum(["emotional", "environmental", "social", "physical", "cognitive"]),
  intensity: z.number().min(1).max(10),
  frequency: z.number().default(0),
  lastTriggeredAt: z.string().optional(),
  copingStrategies: z.array(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RelapseRiskHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  overallRisk: z.number(),
  emotionalRisk: z.number(),
  behavioralRisk: z.number(),
  triggerRisk: z.number(),
  stabilityRisk: z.number(),
  trend: z.enum(["rising", "stable", "falling"]),
  confidence: z.number(),
  predictiveFactors: z.string(),
  interventionSuggested: z.string().optional(),
  generatedAt: z.string(),
});

export const EmotionalTrendSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  dominantEmotion: z.string(),
  emotionScores: z.string(),
  moodAverage: z.number(),
  volatility: z.number(),
  patternDetected: z.string().optional(),
  weekNumber: z.number(),
  createdAt: z.string(),
});

export const HabitSchema = z.object({
  id: z.string(),
  userId: z.string(),
  oldTrigger: z.string(),
  newHabit: z.string(),
  category: z.enum(["physical", "mental", "social", "creative", "spiritual"]),
  streak: z.number().default(0),
  longestStreak: z.number().default(0),
  completionCount: z.number().default(0),
  lastCompleted: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["career", "health", "relationships", "learning", "personal"]),
  progress: z.number().default(0),
  targetDate: z.string(),
  isCompleted: z.boolean().default(false),
  completedAt: z.string().optional(),
  milestoneSteps: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CrisisSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  triggerDescription: z.string().optional(),
  cravingLevelStart: z.number(),
  cravingLevelEnd: z.number().optional(),
  techniquesUsed: z.array(z.string()),
  contactedSupport: z.boolean().default(false),
  outcome: z.enum(["resolved", "escalated", "ongoing", "relapsed"]).optional(),
  notes: z.string().optional(),
  isEncrypted: z.boolean().default(false),
});

export const AIInteractionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  type: z.enum(["companion_chat", "crisis_support", "check_in_analysis", "risk_assessment", "stage_evaluation"]),
  prompt: z.string(),
  response: z.string(),
  tone: z.enum(["encouraging", "supportive", "urgent", "crisis", "celebratory"]),
  contextData: z.string().optional(),
  feedbackRating: z.number().optional(),
  createdAt: z.string(),
  isEncrypted: z.boolean().default(false),
});

export const ConnectionGroupSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["safe_room", "private_group", "peer_chat", "recovery_room"]),
  topic: z.string().optional(),
  memberCount: z.number().default(0),
  maxMembers: z.number().default(20),
  isAnonymous: z.boolean().default(true),
  moderatorId: z.string().optional(),
  rules: z.array(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  lastActivity: z.string(),
});

export const AccountabilityContractSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["sobriety", "health", "relationships", "growth", "boundaries"]),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
  isActive: z.boolean().default(true),
  streakDays: z.number().default(0),
  lastCheckedIn: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ComplianceLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  requirementId: z.string(),
  type: z.enum(["checkin", "breath_test", "location_verify", "meeting_attendance", "curfew"]),
  status: z.enum(["completed", "missed", "pending", "excused"]),
  scheduledAt: z.string(),
  completedAt: z.string().optional(),
  note: z.string().optional(),
  verificationData: z.string().optional(),
  isEncrypted: z.boolean().default(true),
});

export const TherapistAccessSchema = z.object({
  id: z.string(),
  userId: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  providerRole: z.enum(["therapist", "counselor", "case_manager", "peer_specialist", "psychiatrist"]),
  providerOrganization: z.string().optional(),
  consentStatus: z.enum(["pending", "granted", "revoked"]),
  consentScope: z.string(),
  connectedAt: z.string(),
  lastAccessedAt: z.string().optional(),
  revokedAt: z.string().optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    "check_in_reminder",
    "risk_alert",
    "milestone_reached",
    "streak_warning",
    "crisis_followup",
    "compliance_due",
    "therapist_message",
    "community_activity",
    "encouragement",
    "stage_change",
  ]),
  title: z.string(),
  message: z.string(),
  severity: z.enum(["info", "caution", "warning", "critical"]).default("info"),
  route: z.string().optional(),
  isRead: z.boolean().default(false),
  isDismissed: z.boolean().default(false),
  scheduledAt: z.string().optional(),
  sentAt: z.string(),
  readAt: z.string().optional(),
});

export const StageHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  fromStage: z.enum(["crisis", "stabilize", "rebuild", "maintain"]).optional(),
  toStage: z.enum(["crisis", "stabilize", "rebuild", "maintain"]),
  reason: z.string(),
  signals: z.string(),
  stabilityScoreAtTransition: z.number(),
  triggeredAt: z.string(),
  acknowledgedAt: z.string().optional(),
  isAutomatic: z.boolean().default(true),
});

export const JournalEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  title: z.string(),
  content: z.string(),
  mood: z.number().min(1).max(5),
  tags: z.array(z.string()).optional(),
  isEncrypted: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  details: z.string(),
  ipHash: z.string().optional(),
  sessionId: z.string().optional(),
  success: z.boolean(),
  timestamp: z.string(),
});

export type User = z.infer<typeof UserSchema>;
export type RecoveryProfileRecord = z.infer<typeof RecoveryProfileSchema>;
export type CheckIn = z.infer<typeof CheckInSchema>;
export type StabilityScore = z.infer<typeof StabilityScoreSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type RelapseRiskHistory = z.infer<typeof RelapseRiskHistorySchema>;
export type EmotionalTrend = z.infer<typeof EmotionalTrendSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type CrisisSession = z.infer<typeof CrisisSessionSchema>;
export type AIInteraction = z.infer<typeof AIInteractionSchema>;
export type ConnectionGroup = z.infer<typeof ConnectionGroupSchema>;
export type AccountabilityContract = z.infer<typeof AccountabilityContractSchema>;
export type ComplianceLogRecord = z.infer<typeof ComplianceLogSchema>;
export type TherapistAccess = z.infer<typeof TherapistAccessSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type StageHistory = z.infer<typeof StageHistorySchema>;
export type JournalEntryRecord = z.infer<typeof JournalEntrySchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
