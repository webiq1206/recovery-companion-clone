/**
 * Recovery profile slice: profile, timeline, relapse plan, relapse modal.
 * Consumed by RecoveryProvider (facade). Can be used directly by screens for a lighter dependency.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile, TimelineEvent, RelapsePlan } from '@/types';
import {
  STORAGE_KEYS,
  DEFAULT_PROFILE,
  migrateProfile,
  loadStorageItem,
  saveStorageItem,
} from '@/lib/recoveryDefaults';

export function useRecoveryProfileStore() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [relapsePlan, setRelapsePlan] = useState<RelapsePlan | null>(null);
  const [showRelapseModal, setShowRelapseModal] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const stored = await loadStorageItem<string | null>(STORAGE_KEYS.PROFILE, null);
      return stored ? migrateProfile(JSON.parse(stored)) : DEFAULT_PROFILE;
    },
    staleTime: Infinity,
  });

  const timelineQuery = useQuery({
    queryKey: ['timelineEvents'],
    queryFn: () =>
      loadStorageItem<TimelineEvent[]>(STORAGE_KEYS.TIMELINE_EVENTS, []),
    staleTime: Infinity,
  });

  const relapsePlanQuery = useQuery({
    queryKey: ['relapsePlan'],
    queryFn: () =>
      loadStorageItem<RelapsePlan | null>(STORAGE_KEYS.RELAPSE_PLAN, null),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  useEffect(() => {
    if (timelineQuery.data) setTimelineEvents(timelineQuery.data);
  }, [timelineQuery.data]);

  useEffect(() => {
    if (relapsePlanQuery.data !== undefined) {
      setRelapsePlan(relapsePlanQuery.data);
    }
  }, [relapsePlanQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: (newProfile: UserProfile) =>
      saveStorageItem(STORAGE_KEYS.PROFILE, newProfile),
    onSuccess: (data) => {
      setProfile(data);
      queryClient.setQueryData(['profile'], data);
    },
  });

  const saveTimelineMutation = useMutation({
    mutationFn: (events: TimelineEvent[]) =>
      saveStorageItem(STORAGE_KEYS.TIMELINE_EVENTS, events),
    onSuccess: (data) => {
      setTimelineEvents(data);
      queryClient.setQueryData(['timelineEvents'], data);
    },
  });

  const saveRelapsePlanMutation = useMutation({
    mutationFn: (plan: RelapsePlan | null) =>
      saveStorageItem(STORAGE_KEYS.RELAPSE_PLAN, plan),
    onSuccess: (data) => {
      setRelapsePlan(data);
      queryClient.setQueryData(['relapsePlan'], data);
    },
  });

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      saveProfileMutation.mutate(updated);
    },
    [profile]
  );

  const logRelapse = useCallback(() => {
    const rp = profile.recoveryProfile ?? DEFAULT_PROFILE.recoveryProfile;
    const updatedProfile: UserProfile = {
      ...profile,
      recoveryProfile: { ...rp, relapseCount: (rp.relapseCount ?? 0) + 1 },
    };
    setProfile(updatedProfile);
    saveProfileMutation.mutate(updatedProfile);

    const today = new Date().toISOString().split('T')[0];
    const event: TimelineEvent = {
      id: `relapse-${Date.now()}`,
      type: 'relapse',
      date: today,
    };
    const updatedEvents = [event, ...timelineEvents];
    setTimelineEvents(updatedEvents);
    saveTimelineMutation.mutate(updatedEvents);
    setShowRelapseModal(true);
  }, [profile, timelineEvents]);

  const logCrisisActivation = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const event: TimelineEvent = {
      id: `crisis-${Date.now()}`,
      type: 'crisis_activation',
      date: today,
    };
    const updatedEvents = [event, ...timelineEvents];
    setTimelineEvents(updatedEvents);
    saveTimelineMutation.mutate(updatedEvents);
  }, [timelineEvents]);

  const dismissRelapseModal = useCallback(() => {
    setShowRelapseModal(false);
  }, []);

  const saveRelapsePlan = useCallback((plan: RelapsePlan) => {
    setRelapsePlan(plan);
    saveRelapsePlanMutation.mutate(plan);
  }, []);

  const daysSober = useMemo(() => {
    const soberDate = new Date(profile.soberDate);
    const now = new Date();
    return Math.max(
      0,
      Math.floor((now.getTime() - soberDate.getTime()) / 86400000)
    );
  }, [profile.soberDate]);

  const isLoading =
    profileQuery.isLoading ||
    timelineQuery.isLoading ||
    relapsePlanQuery.isLoading;

  return useMemo(
    () => ({
      profile,
      timelineEvents,
      relapsePlan,
      showRelapseModal,
      daysSober,
      isLoading: isLoading && profileQuery.isLoading,
      updateProfile,
      logRelapse,
      logCrisisActivation,
      dismissRelapseModal,
      saveRelapsePlan,
    }),
    [
      profile,
      timelineEvents,
      relapsePlan,
      showRelapseModal,
      daysSober,
      isLoading,
      updateProfile,
      logRelapse,
      logCrisisActivation,
      dismissRelapseModal,
      saveRelapsePlan,
    ]
  );
}
