import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ProviderProfile,
  ProviderPortalData,
  ConnectedClient,
  ClientInvitation,
  ClientReport,
  ConsentScope,
  ProviderRole,
  WeeklyTrend,
  RecoveryStage,
  RiskTrend,
} from '../types';

const STORAGE_KEY = 'therapist_portal_data';

const DEFAULT_CONSENT_SCOPE: ConsentScope = {
  progressData: true,
  moodTrends: true,
  relapseAlerts: true,
  engagementMetrics: true,
  journalSummaries: false,
  checkInData: true,
};

const DEFAULT_PROVIDER: ProviderProfile = {
  id: '',
  name: '',
  role: 'therapist',
  organization: '',
  email: '',
  isPortalEnabled: false,
  createdAt: '',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateWeeklyTrends(weeks: number): WeeklyTrend[] {
  const trends: WeeklyTrend[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - i * 7);
    trends.push({
      week: weekDate.toISOString().split('T')[0],
      stability: Math.round(40 + Math.random() * 50),
      mood: Math.round(35 + Math.random() * 55),
      engagement: Math.round(30 + Math.random() * 60),
      risk: Math.round(10 + Math.random() * 40),
    });
  }
  return trends;
}

const SAMPLE_CLIENTS: ConnectedClient[] = [
  {
    id: 'client_1',
    name: 'Alex M.',
    anonymousAlias: 'Steady Phoenix',
    status: 'active',
    connectedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 2 * 3600000).toISOString(),
    consentStatus: 'granted',
    consentScope: { ...DEFAULT_CONSENT_SCOPE },
    daysSober: 87,
    currentStreak: 14,
    recoveryStage: 'stabilize',
    stabilityScore: 68,
    riskLevel: 28,
    riskTrend: 'falling',
    moodAverage: 62,
    engagementScore: 78,
    checkInCount: 42,
    lastCheckIn: new Date(Date.now() - 8 * 3600000).toISOString(),
    relapseCount: 1,
    weeklyTrend: generateWeeklyTrends(8),
  },
  {
    id: 'client_2',
    name: 'Jordan R.',
    anonymousAlias: 'Calm River',
    status: 'active',
    connectedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 18 * 3600000).toISOString(),
    consentStatus: 'granted',
    consentScope: { ...DEFAULT_CONSENT_SCOPE, journalSummaries: true },
    daysSober: 34,
    currentStreak: 7,
    recoveryStage: 'crisis',
    stabilityScore: 42,
    riskLevel: 58,
    riskTrend: 'rising',
    moodAverage: 38,
    engagementScore: 55,
    checkInCount: 18,
    lastCheckIn: new Date(Date.now() - 22 * 3600000).toISOString(),
    relapseCount: 3,
    weeklyTrend: generateWeeklyTrends(8),
  },
  {
    id: 'client_3',
    name: 'Sam K.',
    anonymousAlias: 'Brave Oak',
    status: 'active',
    connectedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 1 * 3600000).toISOString(),
    consentStatus: 'granted',
    consentScope: { ...DEFAULT_CONSENT_SCOPE },
    daysSober: 156,
    currentStreak: 45,
    recoveryStage: 'rebuild',
    stabilityScore: 82,
    riskLevel: 15,
    riskTrend: 'falling',
    moodAverage: 74,
    engagementScore: 91,
    checkInCount: 78,
    lastCheckIn: new Date(Date.now() - 3 * 3600000).toISOString(),
    relapseCount: 0,
    weeklyTrend: generateWeeklyTrends(8),
  },
  {
    id: 'client_4',
    name: 'Taylor W.',
    anonymousAlias: 'Kind Star',
    status: 'paused',
    connectedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 5 * 86400000).toISOString(),
    consentStatus: 'granted',
    consentScope: { progressData: true, moodTrends: true, relapseAlerts: true, engagementMetrics: false, journalSummaries: false, checkInData: false },
    daysSober: 21,
    currentStreak: 3,
    recoveryStage: 'stabilize',
    stabilityScore: 51,
    riskLevel: 45,
    riskTrend: 'stable',
    moodAverage: 48,
    engagementScore: 32,
    checkInCount: 12,
    lastCheckIn: new Date(Date.now() - 5 * 86400000).toISOString(),
    relapseCount: 2,
    weeklyTrend: generateWeeklyTrends(8),
  },
];

const SAMPLE_INVITATIONS: ClientInvitation[] = [
  {
    id: 'inv_1',
    clientName: 'Morgan P.',
    clientEmail: 'morgan.p@email.com',
    status: 'pending',
    sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    respondedAt: '',
    consentScope: { ...DEFAULT_CONSENT_SCOPE },
  },
];

function generateReport(client: ConnectedClient): ClientReport {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);

  const highlights: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  if (client.currentStreak > 7) highlights.push(`Maintained ${client.currentStreak}-day check-in streak`);
  if (client.stabilityScore > 60) highlights.push('Comprehensive Stability trending positively');
  if (client.engagementScore > 70) highlights.push('Strong engagement with recovery tools');
  if (client.moodAverage > 60) highlights.push('Mood levels showing improvement');

  if (client.riskLevel > 50) concerns.push('Elevated risk score requires attention');
  if (client.riskTrend === 'rising') concerns.push('Risk trend is increasing');
  if (client.engagementScore < 40) concerns.push('Low engagement with app features');
  if (client.moodAverage < 40) concerns.push('Persistently low mood patterns');

  recommendations.push('Continue supportive check-ins they find helpful');
  if (client.riskLevel > 40) recommendations.push('Consider more frequent supportive touchpoints');
  if (client.engagementScore < 50) recommendations.push('Discuss barriers to app engagement');
  if (client.moodAverage < 50) recommendations.push('Explore mood management techniques');

  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    generatedAt: now.toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    summary: `${client.name} has been in recovery for ${client.daysSober} days. Current Comprehensive Stability is ${client.stabilityScore}/100 with a ${client.riskTrend} risk trend. Overall engagement remains ${client.engagementScore > 60 ? 'strong' : client.engagementScore > 40 ? 'moderate' : 'low'}.`,
    stabilityAvg: client.stabilityScore,
    moodAvg: client.moodAverage,
    riskAvg: client.riskLevel,
    engagementAvg: client.engagementScore,
    checkInCount: client.checkInCount,
    streakDays: client.currentStreak,
    highlights,
    concerns,
    recommendations,
  };
}

const DEFAULT_DATA: ProviderPortalData = {
  provider: DEFAULT_PROVIDER,
  clients: [],
  invitations: [],
  reports: [],
};

export const [TherapistProvider, useTherapist] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [portalData, setPortalData] = useState<ProviderPortalData>(DEFAULT_DATA);

  const dataQuery = useQuery({
    queryKey: ['therapist_portal'],
    queryFn: async () => {
      console.log('[TherapistProvider] Loading portal data from storage');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ProviderPortalData;
        console.log('[TherapistProvider] Loaded portal data, clients:', parsed.clients.length);
        return parsed;
      }
      return DEFAULT_DATA;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProviderPortalData) => {
      console.log('[TherapistProvider] Saving portal data');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist_portal'] });
    },
  });

  useEffect(() => {
    if (dataQuery.data) {
      setPortalData(dataQuery.data);
    }
  }, [dataQuery.data]);

  const saveData = useCallback((data: ProviderPortalData) => {
    setPortalData(data);
    saveMutation.mutate(data);
  }, [saveMutation]);

  const setupProvider = useCallback((name: string, role: ProviderRole, organization: string, email: string) => {
    console.log('[TherapistProvider] Setting up provider portal');
    const provider: ProviderProfile = {
      id: generateId(),
      name,
      role,
      organization,
      email,
      isPortalEnabled: true,
      createdAt: new Date().toISOString(),
    };
    const newData: ProviderPortalData = {
      provider,
      clients: SAMPLE_CLIENTS,
      invitations: SAMPLE_INVITATIONS,
      reports: SAMPLE_CLIENTS.map(c => generateReport(c)),
    };
    saveData(newData);
  }, [saveData]);

  const inviteClient = useCallback((clientName: string, clientEmail: string, scope: ConsentScope) => {
    console.log('[TherapistProvider] Inviting client:', clientName);
    const invitation: ClientInvitation = {
      id: generateId(),
      clientName,
      clientEmail,
      status: 'pending',
      sentAt: new Date().toISOString(),
      respondedAt: '',
      consentScope: scope,
    };
    const updated = {
      ...portalData,
      invitations: [invitation, ...portalData.invitations],
    };
    saveData(updated);
  }, [portalData, saveData]);

  const generateClientReport = useCallback((clientId: string) => {
    console.log('[TherapistProvider] Generating report for client:', clientId);
    const client = portalData.clients.find(c => c.id === clientId);
    if (!client) return null;
    const report = generateReport(client);
    const updated = {
      ...portalData,
      reports: [report, ...portalData.reports],
    };
    saveData(updated);
    return report;
  }, [portalData, saveData]);

  const getClientById = useCallback((clientId: string): ConnectedClient | undefined => {
    return portalData.clients.find(c => c.id === clientId);
  }, [portalData.clients]);

  const getClientReports = useCallback((clientId: string): ClientReport[] => {
    return portalData.reports.filter(r => r.clientId === clientId);
  }, [portalData.reports]);

  const updateClientStatus = useCallback((clientId: string, status: 'active' | 'paused' | 'discharged') => {
    console.log('[TherapistProvider] Updating client status:', clientId, status);
    const updated = {
      ...portalData,
      clients: portalData.clients.map(c => c.id === clientId ? { ...c, status } : c),
    };
    saveData(updated);
  }, [portalData, saveData]);

  const revokeClientAccess = useCallback((clientId: string) => {
    console.log('[TherapistProvider] Revoking client access:', clientId);
    const updated = {
      ...portalData,
      clients: portalData.clients.map(c =>
        c.id === clientId ? { ...c, consentStatus: 'revoked' as const } : c
      ),
    };
    saveData(updated);
  }, [portalData, saveData]);

  const disablePortal = useCallback(() => {
    console.log('[TherapistProvider] Disabling portal');
    saveData(DEFAULT_DATA);
  }, [saveData]);

  const activeClients = useMemo(() =>
    portalData.clients.filter(c => c.status === 'active' && c.consentStatus === 'granted'),
    [portalData.clients]
  );

  const atRiskClients = useMemo(() =>
    activeClients.filter(c => c.riskLevel > 50 || c.riskTrend === 'rising'),
    [activeClients]
  );

  const avgStability = useMemo(() => {
    if (activeClients.length === 0) return 0;
    return Math.round(activeClients.reduce((s, c) => s + c.stabilityScore, 0) / activeClients.length);
  }, [activeClients]);

  const avgEngagement = useMemo(() => {
    if (activeClients.length === 0) return 0;
    return Math.round(activeClients.reduce((s, c) => s + c.engagementScore, 0) / activeClients.length);
  }, [activeClients]);

  return useMemo(() => ({
    portalData,
    isPortalEnabled: portalData.provider.isPortalEnabled,
    provider: portalData.provider,
    clients: portalData.clients,
    invitations: portalData.invitations,
    reports: portalData.reports,
    activeClients,
    atRiskClients,
    avgStability,
    avgEngagement,
    isLoading: dataQuery.isLoading,
    setupProvider,
    inviteClient,
    generateClientReport,
    getClientById,
    getClientReports,
    updateClientStatus,
    revokeClientAccess,
    disablePortal,
  }), [
    portalData, activeClients, atRiskClients, avgStability, avgEngagement,
    dataQuery.isLoading, setupProvider, inviteClient, generateClientReport,
    getClientById, getClientReports, updateClientStatus, revokeClientAccess,
    disablePortal,
  ]);
});
