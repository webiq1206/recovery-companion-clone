import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Pledge, JournalEntry, MediaItem, WorkbookAnswer, EmergencyContact, DailyCheckIn, CheckInTimeOfDay, RebuildData, ReplacementHabit, RoutineBlock, PurposeGoal, ConfidenceMilestone, AccountabilityData, CommitmentContract, AccountabilityPartner, DriftAlert, ContractCheckIn, RecoveryProfile, PrivacyControls, IdentityProgramData, IdentityExerciseResponse, IdentityValue, TimelineEvent, RelapsePlan, NearMissEvent } from '@/types';
import { calculateStability } from '@/utils/stabilityEngine';
import { useRecoveryProfileStore } from '@/stores/useRecoveryProfileStore';
import {
  useCheckInsStore,
  useTodayCheckIns,
  useTodayCheckIn,
  useMorningCheckIn,
  useCurrentCheckInPeriod,
  useCurrentPeriodCheckIn,
  useHydrateCheckInsStore,
} from '@/stores/useCheckInsStore';
import { useHydrateRecoveryProfileStore, useDaysSober } from '@/stores/useRecoveryProfileStore';
import { usePledgesStore, useHydratePledgesStore, usePledgeStreak, useTodayPledge } from '@/features/pledges/state/usePledgesStore';
import { useJournalStore, useHydrateJournalStore } from '@/features/journal/state/useJournalStore';
import { useMediaStore, useHydrateMediaStore } from '@/features/media/state/useMediaStore';
import { useWorkbookStore, useHydrateWorkbookStore } from '@/features/workbook/state/useWorkbookStore';
import { useSupportContactsStore, useHydrateSupportContactsStore } from '@/features/supportContacts/state/useSupportContactsStore';
import { useRebuildStore, useHydrateRebuildStore } from '@/features/rebuild/state/useRebuildStore';
import { useAccountabilityStore, useHydrateAccountabilityStore } from '@/features/accountability/state/useAccountabilityStore';
import { useAppMetaStore, useStabilityScore } from '@/features/appMeta/state/useAppMetaStore';

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

export const [RecoveryProvider, useRecovery] = createContextHook(() => {
  const queryClient = useQueryClient();
  useHydrateRecoveryProfileStore();
  useHydrateCheckInsStore();
  const profileStore = useRecoveryProfileStore();
  const checkInsStore = useCheckInsStore();
  const daysSober = useDaysSober();
  const { profile, timelineEvents, relapsePlan, updateProfile, logRelapse, logCrisisActivation, saveRelapsePlan, isLoading: profileIsLoading } = profileStore;
  const { checkIns, nearMissEvents, addCheckIn, logNearMiss, isLoading: checkInsIsLoading } = checkInsStore;
  const todayCheckIns = useTodayCheckIns();
  const todayCheckIn = useTodayCheckIn();
  const morningCheckIn = useMorningCheckIn();
  const currentCheckInPeriod = useCurrentCheckInPeriod();
  const currentPeriodCheckIn = useCurrentPeriodCheckIn();

  // Client-persisted slices now live in zustand feature stores.
  useHydratePledgesStore();
  useHydrateJournalStore();
  useHydrateMediaStore();
  useHydrateWorkbookStore();
  useHydrateSupportContactsStore();
  useHydrateRebuildStore();
  useHydrateAccountabilityStore();

  const pledges = usePledgesStore.use.pledges();
  const addPledge = usePledgesStore.use.addPledge();
  const todayPledge = useTodayPledge();
  const currentStreak = usePledgeStreak();

  const journal = useJournalStore.use.journal();
  const addJournalEntry = useJournalStore.use.addJournalEntry();
  const deleteJournalEntry = useJournalStore.use.deleteJournalEntry();

  const media = useMediaStore.use.media();
  const addMedia = useMediaStore.use.addMedia();
  const addMultipleMedia = useMediaStore.use.addMultipleMedia();
  const deleteMedia = useMediaStore.use.deleteMedia();

  const workbookAnswers = useWorkbookStore.use.workbookAnswers();
  const saveWorkbookAnswer = useWorkbookStore.use.saveWorkbookAnswer();
  const getWorkbookAnswer = useWorkbookStore.use.getWorkbookAnswer();
  const getSectionProgress = useWorkbookStore.use.getSectionProgress();

  const emergencyContacts = useSupportContactsStore.use.emergencyContacts();
  const saveEmergencyContact = useSupportContactsStore.use.saveEmergencyContact();
  const deleteEmergencyContact = useSupportContactsStore.use.deleteEmergencyContact();

  const rebuildData = useRebuildStore.use.rebuildData();
  const addReplacementHabit = useRebuildStore.use.addReplacementHabit();
  const updateReplacementHabit = useRebuildStore.use.updateReplacementHabit();
  const deleteReplacementHabit = useRebuildStore.use.deleteReplacementHabit();
  const addRoutineBlock = useRebuildStore.use.addRoutineBlock();
  const updateRoutineBlock = useRebuildStore.use.updateRoutineBlock();
  const deleteRoutineBlock = useRebuildStore.use.deleteRoutineBlock();
  const addPurposeGoal = useRebuildStore.use.addPurposeGoal();
  const updatePurposeGoal = useRebuildStore.use.updatePurposeGoal();
  const deletePurposeGoal = useRebuildStore.use.deletePurposeGoal();
  const addConfidenceMilestone = useRebuildStore.use.addConfidenceMilestone();
  const resetRoutineCompletion = useRebuildStore.use.resetRoutineCompletion();
  const startIdentityProgram = useRebuildStore.use.startIdentityProgram();
  const saveExerciseResponse = useRebuildStore.use.saveExerciseResponse();
  const completeModule = useRebuildStore.use.completeModule();
  const advanceIdentityWeek = useRebuildStore.use.advanceIdentityWeek();
  const addIdentityValue = useRebuildStore.use.addIdentityValue();
  const removeIdentityValue = useRebuildStore.use.removeIdentityValue();

  const accountabilityData = useAccountabilityStore.use.accountabilityData();
  const addContract = useAccountabilityStore.use.addContract();
  const updateContract = useAccountabilityStore.use.updateContract();
  const deleteContract = useAccountabilityStore.use.deleteContract();
  const checkInContract = useAccountabilityStore.use.checkInContract();
  const addPartner = useAccountabilityStore.use.addPartner();
  const deletePartner = useAccountabilityStore.use.deletePartner();
  const dismissAlert = useAccountabilityStore.use.dismissAlert();
  const useStreakProtection = useAccountabilityStore.use.useStreakProtection();

  const stabilityScore = useStabilityScore();
  const resetAllDataStore = useAppMetaStore.use.resetAllData();

  const resetAllData = useCallback(async () => {
    await resetAllDataStore();
    queryClient.clear();
  }, [resetAllDataStore, queryClient]);

  const pledgesIsLoading = usePledgesStore.use.isLoading();
  const journalIsLoading = useJournalStore.use.isLoading();
  const mediaIsLoading = useMediaStore.use.isLoading();
  const workbookIsLoading = useWorkbookStore.use.isLoading();
  const supportContactsIsLoading = useSupportContactsStore.use.isLoading();
  const rebuildIsLoading = useRebuildStore.use.isLoading();
  const accountabilityIsLoading = useAccountabilityStore.use.isLoading();

  const isLoading =
    profileIsLoading ||
    checkInsIsLoading ||
    pledgesIsLoading ||
    journalIsLoading ||
    mediaIsLoading ||
    workbookIsLoading ||
    supportContactsIsLoading ||
    rebuildIsLoading ||
    accountabilityIsLoading;

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
    deletePartner,
    dismissAlert,
    useStreakProtection,
    timelineEvents,
    logRelapse,
    logCrisisActivation,
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
    checkInContract, addPartner, deletePartner,
    dismissAlert, useStreakProtection,
    timelineEvents, logRelapse,
    logCrisisActivation,
    relapsePlan, saveRelapsePlan,
    nearMissEvents, logNearMiss,
  ]);
});
