import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ComplianceData,
  ComplianceRequirement,
  ComplianceLog,
  ComplianceAlert,
  ComplianceCheckInStatus,
  ComplianceRequirementType,
} from '../types';

const STORAGE_KEY = 'compliance_data';

const DEFAULT_COMPLIANCE: ComplianceData = {
  isEnabled: false,
  caseId: '',
  officerName: '',
  officerPhone: '',
  courtName: '',
  startDate: '',
  endDate: '',
  requirements: [],
  logs: [],
  alerts: [],
  overallComplianceRate: 100,
};

const DEFAULT_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'req_checkin',
    type: 'checkin',
    title: 'Daily check-in',
    description: 'Log how you are doing today in your own words',
    frequency: 'daily',
    requiredTime: '09:00',
    windowMinutes: 120,
    isActive: true,
  },
  {
    id: 'req_breath',
    type: 'breath_test',
    title: 'Sobriety check-in',
    description: 'A simple self-check you log in the app (not a breathalyzer or medical test)',
    frequency: 'daily',
    requiredTime: '08:00',
    windowMinutes: 60,
    isActive: true,
  },
  {
    id: 'req_location',
    type: 'location_verify',
    title: '"Safe here" check-in',
    description: 'Optional note that you were where you planned to be—stored only on this device',
    frequency: 'as_scheduled',
    requiredTime: '22:00',
    windowMinutes: 30,
    isActive: true,
  },
  {
    id: 'req_meeting',
    type: 'meeting_attendance',
    title: 'Support meeting',
    description: 'Reminder to attend recovery or peer support you chose for yourself',
    frequency: 'weekly',
    requiredTime: '18:00',
    windowMinutes: 180,
    isActive: true,
  },
  {
    id: 'req_curfew',
    type: 'curfew',
    title: 'Evening wind-down',
    description: 'Optional reminder to be home or settled by a time you set for yourself',
    frequency: 'daily',
    requiredTime: '23:00',
    windowMinutes: 15,
    isActive: false,
  },
];

function calculateComplianceRate(logs: ComplianceLog[]): number {
  if (logs.length === 0) return 100;
  const recent = logs.slice(0, 30);
  const completed = recent.filter(l => l.status === 'completed' || l.status === 'excused').length;
  return Math.round((completed / recent.length) * 100);
}

function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function generateAlerts(requirements: ComplianceRequirement[], logs: ComplianceLog[]): ComplianceAlert[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekStart = getWeekStartDate(now);
  const alerts: ComplianceAlert[] = [];

  requirements.filter(r => r.isActive).forEach(req => {
    if (req.frequency === 'weekly') {
      const weekLogs = logs.filter(
        l => l.requirementId === req.id && l.scheduledAt >= weekStart
      );
      const hasCompletedThisWeek = weekLogs.some(l => l.status === 'completed' || l.status === 'excused');
      if (hasCompletedThisWeek) return;
    }

    const todayLogs = logs.filter(
      l => l.requirementId === req.id && l.scheduledAt.startsWith(today)
    );
    const hasCompleted = todayLogs.some(l => l.status === 'completed' || l.status === 'excused');

    if (req.frequency === 'weekly') {
      const dayOfWeek = now.getDay();
      if (dayOfWeek < 5) return;
    }

    if (!hasCompleted) {
      const [hours, minutes] = req.requiredTime.split(':').map(Number);
      const requiredDate = new Date(now);
      requiredDate.setHours(hours, minutes, 0, 0);
      const deadlineDate = new Date(requiredDate.getTime() + req.windowMinutes * 60000);

      if (now > deadlineDate) {
        alerts.push({
          id: `alert_missed_${req.id}_${today}`,
          requirementId: req.id,
          type: 'missed',
          title: `Missed: ${req.title}`,
          message: `You missed your ${req.title.toLowerCase()} for today. If you are struggling, reach out to someone you trust or a crisis line.`,
          scheduledAt: requiredDate.toISOString(),
          createdAt: now.toISOString(),
          isDismissed: false,
        });
      } else if (now > requiredDate) {
        alerts.push({
          id: `alert_overdue_${req.id}_${today}`,
          requirementId: req.id,
          type: 'overdue',
          title: `Overdue: ${req.title}`,
          message: `Your ${req.title.toLowerCase()} is overdue. Please complete it within the next ${Math.round((deadlineDate.getTime() - now.getTime()) / 60000)} minutes.`,
          scheduledAt: requiredDate.toISOString(),
          createdAt: now.toISOString(),
          isDismissed: false,
        });
      } else {
        const thirtyMinBefore = new Date(requiredDate.getTime() - 30 * 60000);
        if (now >= thirtyMinBefore) {
          alerts.push({
            id: `alert_upcoming_${req.id}_${today}`,
            requirementId: req.id,
            type: 'upcoming',
            title: `Upcoming: ${req.title}`,
            message: `Your ${req.title.toLowerCase()} is due in ${Math.round((requiredDate.getTime() - now.getTime()) / 60000)} minutes.`,
            scheduledAt: requiredDate.toISOString(),
            createdAt: now.toISOString(),
            isDismissed: false,
          });
        }
      }
    }
  });

  return alerts;
}

export const [ComplianceProvider, useCompliance] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<ComplianceData>(DEFAULT_COMPLIANCE);
  const dataRef = useRef<ComplianceData>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const dataQuery = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ComplianceData;
          return { ...DEFAULT_COMPLIANCE, ...parsed };
        }
        return DEFAULT_COMPLIANCE;
      } catch (e) {
        console.log('Error loading compliance data:', e);
        return DEFAULT_COMPLIANCE;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (dataQuery.data) setData(dataQuery.data);
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newData: ComplianceData) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: (result) => {
      setData(result);
      queryClient.setQueryData(['compliance'], result);
    },
  });

  const enableCompliance = useCallback((caseInfo: {
    caseId: string;
    officerName: string;
    officerPhone: string;
    courtName: string;
    startDate: string;
    endDate: string;
  }) => {
    console.log('Enabling compliance mode:', caseInfo);
    const updated: ComplianceData = {
      ...dataRef.current,
      isEnabled: true,
      ...caseInfo,
      requirements: DEFAULT_REQUIREMENTS,
      logs: [],
      alerts: [],
      overallComplianceRate: 100,
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const disableCompliance = useCallback(() => {
    console.log('Disabling compliance mode');
    const updated: ComplianceData = {
      ...DEFAULT_COMPLIANCE,
      isEnabled: false,
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const toggleRequirement = useCallback((id: string) => {
    const current = dataRef.current;
    const updated: ComplianceData = {
      ...current,
      requirements: current.requirements.map(r =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
      ),
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const completeRequirement = useCallback((requirementId: string, verificationData?: string) => {
    const current = dataRef.current;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log('Completing requirement:', requirementId);

    const alreadyDone = current.logs.some(
      l => l.requirementId === requirementId && l.scheduledAt.startsWith(today) && (l.status === 'completed' || l.status === 'excused')
    );
    if (alreadyDone) return;

    const req = current.requirements.find(r => r.id === requirementId);
    if (!req) return;

    const newLog: ComplianceLog = {
      id: `log_${Date.now()}`,
      requirementId,
      type: req.type,
      status: 'completed' as ComplianceCheckInStatus,
      scheduledAt: now.toISOString(),
      completedAt: now.toISOString(),
      note: '',
      verificationData: verificationData ?? '',
    };

    const updatedLogs = [newLog, ...current.logs];
    const updated: ComplianceData = {
      ...current,
      logs: updatedLogs,
      overallComplianceRate: calculateComplianceRate(updatedLogs),
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const excuseRequirement = useCallback((requirementId: string, note: string) => {
    const current = dataRef.current;
    const now = new Date();
    const req = current.requirements.find(r => r.id === requirementId);
    if (!req) return;

    const newLog: ComplianceLog = {
      id: `log_${Date.now()}`,
      requirementId,
      type: req.type,
      status: 'excused' as ComplianceCheckInStatus,
      scheduledAt: now.toISOString(),
      completedAt: now.toISOString(),
      note,
      verificationData: '',
    };

    const updatedLogs = [newLog, ...current.logs];
    const updated: ComplianceData = {
      ...current,
      logs: updatedLogs,
      overallComplianceRate: calculateComplianceRate(updatedLogs),
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    const current = dataRef.current;
    const dismissedIds = new Set(current.alerts.filter(a => a.isDismissed).map(a => a.id));
    dismissedIds.add(id);
    const updated: ComplianceData = {
      ...current,
      alerts: current.alerts.map(a => dismissedIds.has(a.id) ? { ...a, isDismissed: true } : a),
    };
    setData(updated);
    saveMutation.mutate(updated);
  }, []);

  const activeAlerts = useMemo(() => {
    if (!data.isEnabled) return [];
    const dismissedIds = new Set(data.alerts.filter(a => a.isDismissed).map(a => a.id));
    return generateAlerts(data.requirements, data.logs).filter(a => !dismissedIds.has(a.id));
  }, [data.isEnabled, data.requirements, data.logs, data.alerts]);

  const todayProgress = useMemo(() => {
    if (!data.isEnabled) return { completed: 0, total: 0, pending: 0 };
    const today = new Date().toISOString().split('T')[0];
    const activeReqs = data.requirements.filter(r => r.isActive);
    const todayLogs = data.logs.filter(l => l.scheduledAt.startsWith(today));
    const completedIds = new Set(
      todayLogs.filter(l => l.status === 'completed' || l.status === 'excused').map(l => l.requirementId)
    );
    return {
      completed: completedIds.size,
      total: activeReqs.length,
      pending: activeReqs.length - completedIds.size,
    };
  }, [data]);

  const recentLogs = useMemo(() => {
    return data.logs.slice(0, 50);
  }, [data.logs]);

  const isLoading = dataQuery.isLoading;

  return useMemo(() => ({
    data,
    isEnabled: data.isEnabled,
    isLoading,
    requirements: data.requirements,
    logs: data.logs,
    recentLogs,
    activeAlerts,
    todayProgress,
    overallComplianceRate: data.overallComplianceRate,
    enableCompliance,
    disableCompliance,
    toggleRequirement,
    completeRequirement,
    excuseRequirement,
    dismissAlert,
  }), [
    data, isLoading, recentLogs, activeAlerts, todayProgress,
    enableCompliance, disableCompliance, toggleRequirement,
    completeRequirement, excuseRequirement, dismissAlert,
  ]);
});
