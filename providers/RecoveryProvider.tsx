import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, Pledge, JournalEntry, MediaItem, WorkbookAnswer, EmergencyContact, DailyCheckIn, CheckInTimeOfDay, RebuildData, ReplacementHabit, RoutineBlock, PurposeGoal, ConfidenceMilestone, AccountabilityData, CommitmentContract, AccountabilityPartner, DriftAlert, ContractCheckIn, RecoveryProfile, PrivacyControls, IdentityProgramData, IdentityExerciseResponse, IdentityValue, TimelineEvent, RelapsePlan, NearMissEvent } from '@/types';
import { calculateStability } from '@/utils/stabilityEngine';
import { useRecoveryProfileStore } from '@/stores/useRecoveryProfileStore';
import { useCheckInsStore } from '@/stores/useCheckInsStore';

const STORAGE_KEYS = {
  PROFILE: 'recovery_profile',
  PLEDGES: 'recovery_pledges',
  JOURNAL: 'recovery_journal',
  MEDIA: 'recovery_media',
  WORKBOOK_ANSWERS: 'recovery_workbook_answers',
  EMERGENCY_CONTACTS: 'recovery_emergency_contacts',
  CHECK_INS: 'recovery_check_ins',
  NEAR_MISS_EVENTS: 'recovery_near_miss_events',
  REBUILD: 'recovery_rebuild',
  ACCOUNTABILITY: 'recovery_accountability',
  TIMELINE_EVENTS: 'recovery_timeline_events',
  RELAPSE_PLAN: 'recovery_relapse_plan',
};

const DEFAULT_PRIVACY: PrivacyControls = {
  isAnonymous: false,
  shareProgress: false,
  shareMood: false,
  allowCommunityMessages: true,
};

const DEFAULT_RECOVERY_PROFILE: RecoveryProfile = {
  recoveryStage: 'crisis',
  struggleLevel: 3,
  relapseCount: 0,
  triggers: [],
  sleepQuality: 'fair',
  supportAvailability: 'limited',
  goals: [],
  riskScore: 50,
  interventionIntensity: 'moderate',
  baselineStabilityScore: 50,
  baselineStability: 50,
  relapseRiskLevel: 'moderate',
  emotionalBaseline: 3,
  cravingBaseline: 3,
  supportLevel: 'medium',
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  addictions: [],
  soberDate: new Date().toISOString(),
  dailySavings: 0,
  motivation: '',
  hasCompletedOnboarding: false,
  privacyControls: DEFAULT_PRIVACY,
  recoveryProfile: DEFAULT_RECOVERY_PROFILE,
};

const DEFAULT_IDENTITY_PROGRAM: IdentityProgramData = {
  currentWeek: 1,
  startedAt: '',
  exerciseResponses: [],
  values: [],
  completedModuleIds: [],
};

const DEFAULT_REBUILD: RebuildData = {
  habits: [],
  routines: [],
  goals: [],
  confidenceMilestones: [],
  identityProgram: DEFAULT_IDENTITY_PROGRAM,
};

const DEFAULT_ACCOUNTABILITY: AccountabilityData = {
  contracts: [],
  partners: [],
  alerts: [],
  streakProtectionUsed: 0,
  streakProtectionMax: 3,
};

function migrateProfile(stored: Record<string, unknown>): UserProfile {
  const profile = { ...DEFAULT_PROFILE, ...stored } as UserProfile;
  if ('addiction' in stored && typeof stored.addiction === 'string' && stored.addiction.length > 0) {
    if (!Array.isArray(profile.addictions) || profile.addictions.length === 0) {
      profile.addictions = [stored.addiction as string];
    }
  }
  if (!Array.isArray(profile.addictions)) {
    profile.addictions = [];
  }
  if (!profile.privacyControls) {
    profile.privacyControls = DEFAULT_PRIVACY;
  }
  if (!profile.recoveryProfile) {
    profile.recoveryProfile = DEFAULT_RECOVERY_PROFILE;
  }
  return profile;
}

export function calculateRiskScore(rp: RecoveryProfile): number {
  let risk = 0;
  const stageWeights = { crisis: 40, stabilize: 25, rebuild: 15, maintain: 5 };
  risk += stageWeights[rp.recoveryStage] ?? 20;
  risk += (rp.struggleLevel / 5) * 20;
  risk += Math.min(rp.relapseCount * 3, 15);
  const sleepWeights = { poor: 12, fair: 6, good: 2, excellent: 0 };
  risk += sleepWeights[rp.sleepQuality] ?? 6;
  const supportWeights = { none: 13, limited: 8, moderate: 3, strong: 0 };
  risk += supportWeights[rp.supportAvailability] ?? 5;
  return Math.min(100, Math.max(0, Math.round(risk)));
}

export function calculateInterventionIntensity(riskScore: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (riskScore >= 75) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'moderate';
  return 'low';
}

export function calculateBaselineStability(rp: RecoveryProfile): number {
  const input = {
    intensity: rp.struggleLevel,
    sleepQuality: (rp.sleepQuality === 'fair' ? 'okay' : rp.sleepQuality === 'excellent' ? 'good' : rp.sleepQuality === 'poor' ? 'poor' : 'good') as 'poor' | 'okay' | 'good',
    triggers: rp.triggers ?? [],
    supportLevel: rp.supportAvailability,
    dailyActionsCompleted: 0,
    relapseLogged: (rp.relapseCount ?? 0) > 0,
  };
  return calculateStability(input).score;
}

async function loadStorageItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (e) {
    console.log(`Error loading ${key}:`, e);
    return fallback;
  }
}

async function saveStorageItem<T>(key: string, data: T): Promise<T> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
  return data;
}

export const [RecoveryProvider, useRecovery] = createContextHook(() => {
  const queryClient = useQueryClient();
  const profileStore = useRecoveryProfileStore();
  const checkInsStore = useCheckInsStore();
  const { profile, timelineEvents, relapsePlan, showRelapseModal, daysSober, updateProfile, logRelapse, logCrisisActivation, dismissRelapseModal, saveRelapsePlan } = profileStore;
  const { checkIns, nearMissEvents, addCheckIn, logNearMiss, todayCheckIns, todayCheckIn, morningCheckIn, currentCheckInPeriod, currentPeriodCheckIn } = checkInsStore;

  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [workbookAnswers, setWorkbookAnswers] = useState<WorkbookAnswer[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [rebuildData, setRebuildData] = useState<RebuildData>(DEFAULT_REBUILD);
  const [accountabilityData, setAccountabilityData] = useState<AccountabilityData>(DEFAULT_ACCOUNTABILITY);

  const pledgesQuery = useQuery({
    queryKey: ['pledges'],
    queryFn: () => loadStorageItem<Pledge[]>(STORAGE_KEYS.PLEDGES, []),
    staleTime: Infinity,
  });

  const journalQuery = useQuery({
    queryKey: ['journal'],
    queryFn: () => loadStorageItem<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []),
    staleTime: Infinity,
  });

  const mediaQuery = useQuery({
    queryKey: ['media'],
    queryFn: () => loadStorageItem<MediaItem[]>(STORAGE_KEYS.MEDIA, []),
    staleTime: Infinity,
  });

  const workbookQuery = useQuery({
    queryKey: ['workbookAnswers'],
    queryFn: () => loadStorageItem<WorkbookAnswer[]>(STORAGE_KEYS.WORKBOOK_ANSWERS, []),
    staleTime: Infinity,
  });

  const emergencyContactsQuery = useQuery({
    queryKey: ['emergencyContacts'],
    queryFn: () => loadStorageItem<EmergencyContact[]>(STORAGE_KEYS.EMERGENCY_CONTACTS, []),
    staleTime: Infinity,
  });

  const rebuildQuery = useQuery({
    queryKey: ['rebuild'],
    queryFn: () => loadStorageItem<RebuildData>(STORAGE_KEYS.REBUILD, DEFAULT_REBUILD),
    staleTime: Infinity,
  });

  const accountabilityQuery = useQuery({
    queryKey: ['accountability'],
    queryFn: () => loadStorageItem<AccountabilityData>(STORAGE_KEYS.ACCOUNTABILITY, DEFAULT_ACCOUNTABILITY),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (pledgesQuery.data) setPledges(pledgesQuery.data);
  }, [pledgesQuery.data]);

  useEffect(() => {
    if (journalQuery.data) setJournal(journalQuery.data);
  }, [journalQuery.data]);

  useEffect(() => {
    if (mediaQuery.data) setMedia(mediaQuery.data);
  }, [mediaQuery.data]);

  useEffect(() => {
    if (workbookQuery.data) setWorkbookAnswers(workbookQuery.data);
  }, [workbookQuery.data]);

  useEffect(() => {
    if (emergencyContactsQuery.data) setEmergencyContacts(emergencyContactsQuery.data);
  }, [emergencyContactsQuery.data]);

  useEffect(() => {
    if (rebuildQuery.data) setRebuildData(rebuildQuery.data);
  }, [rebuildQuery.data]);

  useEffect(() => {
    if (accountabilityQuery.data) setAccountabilityData(accountabilityQuery.data);
  }, [accountabilityQuery.data]);

  const savePledgesMutation = useMutation({
    mutationFn: (newPledges: Pledge[]) => saveStorageItem(STORAGE_KEYS.PLEDGES, newPledges),
    onSuccess: (data) => {
      setPledges(data);
      queryClient.setQueryData(['pledges'], data);
    },
  });

  const saveJournalMutation = useMutation({
    mutationFn: (newJournal: JournalEntry[]) => saveStorageItem(STORAGE_KEYS.JOURNAL, newJournal),
    onSuccess: (data) => {
      setJournal(data);
      queryClient.setQueryData(['journal'], data);
    },
  });

  const saveMediaMutation = useMutation({
    mutationFn: (newMedia: MediaItem[]) => saveStorageItem(STORAGE_KEYS.MEDIA, newMedia),
    onSuccess: (data) => {
      setMedia(data);
      queryClient.setQueryData(['media'], data);
    },
  });

  const saveWorkbookMutation = useMutation({
    mutationFn: (newAnswers: WorkbookAnswer[]) => saveStorageItem(STORAGE_KEYS.WORKBOOK_ANSWERS, newAnswers),
    onSuccess: (data) => {
      setWorkbookAnswers(data);
      queryClient.setQueryData(['workbookAnswers'], data);
    },
  });

  const saveEmergencyContactsMutation = useMutation({
    mutationFn: (contacts: EmergencyContact[]) => saveStorageItem(STORAGE_KEYS.EMERGENCY_CONTACTS, contacts),
    onSuccess: (data) => {
      setEmergencyContacts(data);
      queryClient.setQueryData(['emergencyContacts'], data);
    },
  });

  const saveRebuildMutation = useMutation({
    mutationFn: (data: RebuildData) => saveStorageItem(STORAGE_KEYS.REBUILD, data),
    onSuccess: (data) => {
      setRebuildData(data);
      queryClient.setQueryData(['rebuild'], data);
    },
  });

  const saveAccountabilityMutation = useMutation({
    mutationFn: (data: AccountabilityData) => saveStorageItem(STORAGE_KEYS.ACCOUNTABILITY, data),
    onSuccess: (data) => {
      setAccountabilityData(data);
      queryClient.setQueryData(['accountability'], data);
    },
  });

  const addPledge = useCallback((pledge: Pledge) => {
    const updated = [pledge, ...pledges];
    setPledges(updated);
    savePledgesMutation.mutate(updated);
  }, [pledges]);

  const addJournalEntry = useCallback((entry: JournalEntry) => {
    const updated = [entry, ...journal];
    setJournal(updated);
    saveJournalMutation.mutate(updated);
  }, [journal]);

  const deleteJournalEntry = useCallback((id: string) => {
    const updated = journal.filter(e => e.id !== id);
    setJournal(updated);
    saveJournalMutation.mutate(updated);
  }, [journal]);

  const addMedia = useCallback((item: MediaItem) => {
    const updated = [item, ...media];
    setMedia(updated);
    saveMediaMutation.mutate(updated);
  }, [media]);

  const addMultipleMedia = useCallback((items: MediaItem[]) => {
    const updated = [...items, ...media];
    setMedia(updated);
    saveMediaMutation.mutate(updated);
  }, [media]);

  const deleteMedia = useCallback((id: string) => {
    const updated = media.filter(m => m.id !== id);
    setMedia(updated);
    saveMediaMutation.mutate(updated);
  }, [media]);

  const saveWorkbookAnswer = useCallback((answer: WorkbookAnswer) => {
    const existing = workbookAnswers.findIndex(
      a => a.questionId === answer.questionId && a.sectionId === answer.sectionId
    );
    let updated: WorkbookAnswer[];
    if (existing >= 0) {
      updated = [...workbookAnswers];
      updated[existing] = answer;
    } else {
      updated = [...workbookAnswers, answer];
    }
    setWorkbookAnswers(updated);
    saveWorkbookMutation.mutate(updated);
  }, [workbookAnswers]);

  const getWorkbookAnswer = useCallback((sectionId: string, questionId: string): WorkbookAnswer | undefined => {
    return workbookAnswers.find(a => a.sectionId === sectionId && a.questionId === questionId);
  }, [workbookAnswers]);

  const getSectionProgress = useCallback((sectionId: string, totalQuestions: number): number => {
    const answered = workbookAnswers.filter(a => a.sectionId === sectionId).length;
    return totalQuestions > 0 ? answered / totalQuestions : 0;
  }, [workbookAnswers]);

  const saveEmergencyContact = useCallback((contact: EmergencyContact) => {
    const existing = emergencyContacts.findIndex(c => c.id === contact.id);
    let updated: EmergencyContact[];
    if (existing >= 0) {
      updated = [...emergencyContacts];
      updated[existing] = contact;
    } else {
      if (emergencyContacts.length >= 3) return;
      updated = [...emergencyContacts, contact];
    }
    setEmergencyContacts(updated);
    saveEmergencyContactsMutation.mutate(updated);
  }, [emergencyContacts]);

  const deleteEmergencyContact = useCallback((id: string) => {
    const updated = emergencyContacts.filter(c => c.id !== id);
    setEmergencyContacts(updated);
    saveEmergencyContactsMutation.mutate(updated);
  }, [emergencyContacts]);

  const addReplacementHabit = useCallback((habit: ReplacementHabit) => {
    const updated = { ...rebuildData, habits: [...rebuildData.habits, habit] };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const updateReplacementHabit = useCallback((id: string, updates: Partial<ReplacementHabit>) => {
    const updated = {
      ...rebuildData,
      habits: rebuildData.habits.map(h => h.id === id ? { ...h, ...updates } : h),
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const deleteReplacementHabit = useCallback((id: string) => {
    const updated = { ...rebuildData, habits: rebuildData.habits.filter(h => h.id !== id) };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const addRoutineBlock = useCallback((block: RoutineBlock) => {
    const updated = { ...rebuildData, routines: [...rebuildData.routines, block] };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const updateRoutineBlock = useCallback((id: string, updates: Partial<RoutineBlock>) => {
    const updated = {
      ...rebuildData,
      routines: rebuildData.routines.map(r => r.id === id ? { ...r, ...updates } : r),
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const deleteRoutineBlock = useCallback((id: string) => {
    const updated = { ...rebuildData, routines: rebuildData.routines.filter(r => r.id !== id) };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const addPurposeGoal = useCallback((goal: PurposeGoal) => {
    const updated = { ...rebuildData, goals: [...rebuildData.goals, goal] };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const updatePurposeGoal = useCallback((id: string, updates: Partial<PurposeGoal>) => {
    const updated = {
      ...rebuildData,
      goals: rebuildData.goals.map(g => g.id === id ? { ...g, ...updates } : g),
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const deletePurposeGoal = useCallback((id: string) => {
    const updated = { ...rebuildData, goals: rebuildData.goals.filter(g => g.id !== id) };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const addConfidenceMilestone = useCallback((milestone: ConfidenceMilestone) => {
    const updated = { ...rebuildData, confidenceMilestones: [...rebuildData.confidenceMilestones, milestone] };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const startIdentityProgram = useCallback(() => {
    const program: IdentityProgramData = {
      ...DEFAULT_IDENTITY_PROGRAM,
      startedAt: new Date().toISOString(),
      currentWeek: 1,
    };
    const updated = { ...rebuildData, identityProgram: program };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const saveExerciseResponse = useCallback((response: IdentityExerciseResponse) => {
    const program = rebuildData.identityProgram ?? DEFAULT_IDENTITY_PROGRAM;
    const existing = program.exerciseResponses.findIndex(
      r => r.moduleId === response.moduleId && r.exerciseId === response.exerciseId
    );
    let newResponses: IdentityExerciseResponse[];
    if (existing >= 0) {
      newResponses = [...program.exerciseResponses];
      newResponses[existing] = response;
    } else {
      newResponses = [...program.exerciseResponses, response];
    }
    const updated = {
      ...rebuildData,
      identityProgram: { ...program, exerciseResponses: newResponses },
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const completeModule = useCallback((moduleId: string) => {
    const program = rebuildData.identityProgram ?? DEFAULT_IDENTITY_PROGRAM;
    if (program.completedModuleIds.includes(moduleId)) return;
    const updated = {
      ...rebuildData,
      identityProgram: {
        ...program,
        completedModuleIds: [...program.completedModuleIds, moduleId],
      },
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const advanceIdentityWeek = useCallback(() => {
    const program = rebuildData.identityProgram ?? DEFAULT_IDENTITY_PROGRAM;
    const updated = {
      ...rebuildData,
      identityProgram: { ...program, currentWeek: program.currentWeek + 1 },
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const addIdentityValue = useCallback((value: IdentityValue) => {
    const program = rebuildData.identityProgram ?? DEFAULT_IDENTITY_PROGRAM;
    const updated = {
      ...rebuildData,
      identityProgram: { ...program, values: [...program.values, value] },
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const removeIdentityValue = useCallback((id: string) => {
    const program = rebuildData.identityProgram ?? DEFAULT_IDENTITY_PROGRAM;
    const updated = {
      ...rebuildData,
      identityProgram: { ...program, values: program.values.filter(v => v.id !== id) },
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const resetRoutineCompletion = useCallback(() => {
    const updated = {
      ...rebuildData,
      routines: rebuildData.routines.map(r => ({ ...r, isCompleted: false, completedAt: '' })),
    };
    setRebuildData(updated);
    saveRebuildMutation.mutate(updated);
  }, [rebuildData]);

  const addContract = useCallback((contract: CommitmentContract) => {
    const updated = { ...accountabilityData, contracts: [...accountabilityData.contracts, contract] };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const updateContract = useCallback((id: string, updates: Partial<CommitmentContract>) => {
    const updated = {
      ...accountabilityData,
      contracts: accountabilityData.contracts.map(c => c.id === id ? { ...c, ...updates } : c),
    };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const deleteContract = useCallback((id: string) => {
    const updated = { ...accountabilityData, contracts: accountabilityData.contracts.filter(c => c.id !== id) };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const checkInContract = useCallback((contractId: string, honored: boolean, note: string) => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn: ContractCheckIn = {
      id: Date.now().toString(),
      contractId,
      date: today,
      honored,
      note,
    };
    const updated = {
      ...accountabilityData,
      contracts: accountabilityData.contracts.map(c => {
        if (c.id !== contractId) return c;
        const newCheckIns = [checkIn, ...c.checkIns];
        const newStreak = honored ? c.streakDays + 1 : 0;
        return { ...c, checkIns: newCheckIns, streakDays: newStreak, lastCheckedIn: today };
      }),
    };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const addPartner = useCallback((partner: AccountabilityPartner) => {
    const updated = { ...accountabilityData, partners: [...accountabilityData.partners, partner] };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const updatePartner = useCallback((id: string, updates: Partial<AccountabilityPartner>) => {
    const updated = {
      ...accountabilityData,
      partners: accountabilityData.partners.map(p => p.id === id ? { ...p, ...updates } : p),
    };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const deletePartner = useCallback((id: string) => {
    const updated = { ...accountabilityData, partners: accountabilityData.partners.filter(p => p.id !== id) };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const dismissAlert = useCallback((id: string) => {
    const updated = {
      ...accountabilityData,
      alerts: accountabilityData.alerts.map(a => a.id === id ? { ...a, isDismissed: true } : a),
    };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
  }, [accountabilityData]);

  const useStreakProtection = useCallback(() => {
    if (accountabilityData.streakProtectionUsed >= accountabilityData.streakProtectionMax) return false;
    const updated = { ...accountabilityData, streakProtectionUsed: accountabilityData.streakProtectionUsed + 1 };
    setAccountabilityData(updated);
    saveAccountabilityMutation.mutate(updated);
    return true;
  }, [accountabilityData]);

  const stabilityScore = useMemo(() => {
    const sorted = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = sorted.slice(0, 7);
    if (recent.length === 0) {
      const rp = profile.recoveryProfile;
      const input = {
        intensity: rp.struggleLevel,
        sleepQuality: (rp.sleepQuality === 'fair' ? 'okay' : rp.sleepQuality === 'excellent' ? 'good' : rp.sleepQuality === 'poor' ? 'poor' : 'good') as 'poor' | 'okay' | 'good',
        triggers: rp.triggers ?? [],
        supportLevel: rp.supportAvailability,
        dailyActionsCompleted: 0,
        relapseLogged: (rp.relapseCount ?? 0) > 0,
      };
      return calculateStability(input).score;
    }
    const avg = recent.reduce((sum, c) => sum + c.stabilityScore, 0) / recent.length;
    return Math.round(avg);
  }, [checkIns, profile.recoveryProfile]);

  const resetAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PROFILE,
      STORAGE_KEYS.PLEDGES,
      STORAGE_KEYS.JOURNAL,
      STORAGE_KEYS.MEDIA,
      STORAGE_KEYS.WORKBOOK_ANSWERS,
      STORAGE_KEYS.EMERGENCY_CONTACTS,
      STORAGE_KEYS.CHECK_INS,
      STORAGE_KEYS.NEAR_MISS_EVENTS,
      STORAGE_KEYS.REBUILD,
      STORAGE_KEYS.ACCOUNTABILITY,
      STORAGE_KEYS.TIMELINE_EVENTS,
      STORAGE_KEYS.RELAPSE_PLAN,
    ]);
    setPledges([]);
    setJournal([]);
    setMedia([]);
    setWorkbookAnswers([]);
    setEmergencyContacts([]);
    setRebuildData(DEFAULT_REBUILD);
    setAccountabilityData(DEFAULT_ACCOUNTABILITY);
    queryClient.clear();
  }, [queryClient]);

  const todayPledge = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return pledges.find(p => p.date === today) ?? null;
  }, [pledges]);

  const currentStreak = useMemo(() => {
    if (pledges.length === 0) return 0;
    let streak = 0;
    const sorted = [...pledges].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const pledgeDate = new Date(sorted[i].date);
      pledgeDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (pledgeDate.getTime() === expectedDate.getTime() && sorted[i].completed) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [pledges]);

  const isLoading =
    profileStore.isLoading ||
    checkInsStore.isLoading ||
    pledgesQuery.isLoading ||
    journalQuery.isLoading ||
    mediaQuery.isLoading ||
    workbookQuery.isLoading ||
    emergencyContactsQuery.isLoading ||
    rebuildQuery.isLoading ||
    accountabilityQuery.isLoading;

  return useMemo(() => ({
    profile,
    pledges,
    journal,
    media,
    workbookAnswers,
    todayPledge,
    currentStreak,
    daysSober,
    isLoading,
    updateProfile,
    addPledge,
    addJournalEntry,
    deleteJournalEntry,
    addMedia,
    addMultipleMedia,
    deleteMedia,
    saveWorkbookAnswer,
    getWorkbookAnswer,
    getSectionProgress,
    emergencyContacts,
    saveEmergencyContact,
    deleteEmergencyContact,
    checkIns,
    addCheckIn,
    todayCheckIn,
    todayCheckIns,
    morningCheckIn,
    currentCheckInPeriod,
    currentPeriodCheckIn,
    stabilityScore,
    resetAllData,
    rebuildData,
    addReplacementHabit,
    updateReplacementHabit,
    deleteReplacementHabit,
    addRoutineBlock,
    updateRoutineBlock,
    deleteRoutineBlock,
    addPurposeGoal,
    updatePurposeGoal,
    deletePurposeGoal,
    addConfidenceMilestone,
    resetRoutineCompletion,
    startIdentityProgram,
    saveExerciseResponse,
    completeModule,
    advanceIdentityWeek,
    addIdentityValue,
    removeIdentityValue,
    accountabilityData,
    addContract,
    updateContract,
    deleteContract,
    checkInContract,
    addPartner,
    updatePartner,
    deletePartner,
    dismissAlert,
    useStreakProtection,
    timelineEvents,
    logRelapse,
    logCrisisActivation,
    showRelapseModal,
    dismissRelapseModal,
    relapsePlan,
    saveRelapsePlan,
    nearMissEvents,
    logNearMiss,
  }), [
    profile, pledges, journal, media, workbookAnswers,
    todayPledge, currentStreak, daysSober, isLoading,
    updateProfile, addPledge, addJournalEntry, deleteJournalEntry,
    addMedia, addMultipleMedia, deleteMedia,
    saveWorkbookAnswer, getWorkbookAnswer, getSectionProgress,
    emergencyContacts, saveEmergencyContact, deleteEmergencyContact,
    checkIns, addCheckIn, todayCheckIn, todayCheckIns, morningCheckIn,
    currentCheckInPeriod, currentPeriodCheckIn, stabilityScore, resetAllData,
    rebuildData, addReplacementHabit, updateReplacementHabit, deleteReplacementHabit,
    addRoutineBlock, updateRoutineBlock, deleteRoutineBlock,
    addPurposeGoal, updatePurposeGoal, deletePurposeGoal,
    addConfidenceMilestone, resetRoutineCompletion,
    startIdentityProgram, saveExerciseResponse, completeModule, advanceIdentityWeek,
    addIdentityValue, removeIdentityValue,
    accountabilityData, addContract, updateContract, deleteContract,
    checkInContract, addPartner, updatePartner, deletePartner,
    dismissAlert, useStreakProtection,
    timelineEvents, logRelapse, showRelapseModal, dismissRelapseModal,
    logCrisisActivation,
    relapsePlan, saveRelapsePlan,
    nearMissEvents, logNearMiss,
  ]);
});
