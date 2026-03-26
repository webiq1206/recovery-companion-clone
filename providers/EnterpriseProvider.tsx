import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EnterpriseData,
  Organization,
  OrgMember,
  RolePermission,
  EnterpriseRole,
  AlertThreshold,
  OrgAlert,
  EngagementHeatmapData,
  ComplianceSummary,
  ExportableReport,
  BillingInfo,
  WhiteLabelConfig,
  ReportFormat,
  ReportSection,
} from '@/types';
import {
  ROLE_PERMISSIONS,
  DEFAULT_ORGANIZATION,
  SAMPLE_MEMBERS,
  SAMPLE_THRESHOLDS,
  SAMPLE_ORG_ALERTS,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_COMPLIANCE_SUMMARIES,
  SAMPLE_REPORTS,
  SAMPLE_BILLING,
  DEFAULT_WHITE_LABEL,
} from '@/constants/enterprise';

const STORAGE_KEY = 'enterprise_data';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DEFAULT_DATA: EnterpriseData = {
  organization: DEFAULT_ORGANIZATION,
  members: SAMPLE_MEMBERS,
  permissions: ROLE_PERMISSIONS,
  alertThresholds: SAMPLE_THRESHOLDS,
  alerts: SAMPLE_ORG_ALERTS,
  heatmapData: SAMPLE_HEATMAP_DATA,
  complianceSummaries: SAMPLE_COMPLIANCE_SUMMARIES,
  reports: SAMPLE_REPORTS,
  billing: SAMPLE_BILLING,
  whiteLabel: DEFAULT_WHITE_LABEL,
};

function normalizeEnterpriseData(raw: unknown): { data: EnterpriseData; wasNormalized: boolean } {
  if (!raw || typeof raw !== 'object') {
    return { data: DEFAULT_DATA, wasNormalized: true };
  }
  const candidate = raw as Partial<EnterpriseData>;
  const safeData: EnterpriseData = {
    organization: candidate.organization
      ? { ...DEFAULT_DATA.organization, ...candidate.organization }
      : DEFAULT_DATA.organization,
    members: Array.isArray(candidate.members) ? candidate.members : DEFAULT_DATA.members,
    permissions: Array.isArray(candidate.permissions) ? candidate.permissions : DEFAULT_DATA.permissions,
    alertThresholds: Array.isArray(candidate.alertThresholds) ? candidate.alertThresholds : DEFAULT_DATA.alertThresholds,
    alerts: Array.isArray(candidate.alerts) ? candidate.alerts : DEFAULT_DATA.alerts,
    heatmapData: Array.isArray(candidate.heatmapData) ? candidate.heatmapData : DEFAULT_DATA.heatmapData,
    complianceSummaries: Array.isArray(candidate.complianceSummaries)
      ? candidate.complianceSummaries
      : DEFAULT_DATA.complianceSummaries,
    reports: Array.isArray(candidate.reports) ? candidate.reports : DEFAULT_DATA.reports,
    billing: candidate.billing
      ? { ...DEFAULT_DATA.billing, ...candidate.billing }
      : DEFAULT_DATA.billing,
    whiteLabel: candidate.whiteLabel
      ? { ...DEFAULT_DATA.whiteLabel, ...candidate.whiteLabel }
      : DEFAULT_DATA.whiteLabel,
  };
  const wasNormalized = JSON.stringify(safeData) !== JSON.stringify(raw);
  return { data: safeData, wasNormalized };
}

export const [EnterpriseProvider, useEnterprise] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<EnterpriseData>(DEFAULT_DATA);
  const [currentMemberId, setCurrentMemberId] = useState<string>('mem_1');

  const dataQuery = useQuery({
    queryKey: ['enterprise_data'],
    queryFn: async () => {
      console.log('[EnterpriseProvider] Loading enterprise data');
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as unknown;
          const { data: normalized, wasNormalized } = normalizeEnterpriseData(parsed);
          if (wasNormalized) {
            console.log('[EnterpriseProvider] Normalized enterprise data from storage');
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          }
          console.log('[EnterpriseProvider] Loaded enterprise data, members:', normalized.members.length);
          return normalized;
        }
      } catch (e) {
        console.log('[EnterpriseProvider] Failed to load enterprise data, using defaults:', e);
      }
      console.log('[EnterpriseProvider] Using default enterprise data');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
      return DEFAULT_DATA;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newData: EnterpriseData) => {
      console.log('[EnterpriseProvider] Saving enterprise data');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise_data'] });
    },
  });

  useEffect(() => {
    if (dataQuery.data) {
      setData(dataQuery.data);
    }
  }, [dataQuery.data]);

  const saveData = useCallback((newData: EnterpriseData) => {
    setData(newData);
    saveMutation.mutate(newData);
  }, [saveMutation]);

  const currentMember = useMemo(() => {
    return data.members.find(m => m.id === currentMemberId) ?? data.members[0];
  }, [data.members, currentMemberId]);

  const currentPermissions = useMemo((): RolePermission => {
    const role = currentMember?.role ?? 'viewer';
    return data.permissions.find(p => p.role === role) ?? ROLE_PERMISSIONS[5];
  }, [currentMember, data.permissions]);

  const getClientsForMember = useCallback((memberId: string): string[] => {
    const member = data.members.find(m => m.id === memberId);
    if (!member) return [];
    const perm = data.permissions.find(p => p.role === member.role);
    if (perm?.canViewAllClients) return data.heatmapData.map(h => h.clientId);
    return member.clientIds;
  }, [data.members, data.permissions, data.heatmapData]);

  const filteredHeatmapData = useMemo((): EngagementHeatmapData[] => {
    const allowedIds = getClientsForMember(currentMemberId);
    return data.heatmapData.filter(h => allowedIds.includes(h.clientId));
  }, [data.heatmapData, currentMemberId, getClientsForMember]);

  const filteredComplianceSummaries = useMemo((): ComplianceSummary[] => {
    const allowedIds = getClientsForMember(currentMemberId);
    return data.complianceSummaries.filter(c => allowedIds.includes(c.clientId));
  }, [data.complianceSummaries, currentMemberId, getClientsForMember]);

  const filteredAlerts = useMemo((): OrgAlert[] => {
    const allowedIds = getClientsForMember(currentMemberId);
    return data.alerts.filter(a => allowedIds.includes(a.clientId));
  }, [data.alerts, currentMemberId, getClientsForMember]);

  const unacknowledgedAlerts = useMemo(() => {
    return filteredAlerts.filter(a => !a.isAcknowledged);
  }, [filteredAlerts]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    console.log('[EnterpriseProvider] Acknowledging alert:', alertId);
    const updated = {
      ...data,
      alerts: data.alerts.map(a =>
        a.id === alertId
          ? { ...a, isAcknowledged: true, acknowledgedBy: currentMember?.name ?? '', acknowledgedAt: new Date().toISOString() }
          : a
      ),
    };
    saveData(updated);
  }, [data, currentMember, saveData]);

  const addAlertThreshold = useCallback((threshold: Omit<AlertThreshold, 'id' | 'orgId' | 'createdAt'>) => {
    console.log('[EnterpriseProvider] Adding alert threshold:', threshold.name);
    const newThreshold: AlertThreshold = {
      ...threshold,
      id: generateId(),
      orgId: data.organization.id,
      createdAt: new Date().toISOString(),
    };
    const updated = { ...data, alertThresholds: [...data.alertThresholds, newThreshold] };
    saveData(updated);
  }, [data, saveData]);

  const toggleThreshold = useCallback((thresholdId: string) => {
    console.log('[EnterpriseProvider] Toggling threshold:', thresholdId);
    const updated = {
      ...data,
      alertThresholds: data.alertThresholds.map(t =>
        t.id === thresholdId ? { ...t, isActive: !t.isActive } : t
      ),
    };
    saveData(updated);
  }, [data, saveData]);

  const addMember = useCallback((name: string, email: string, role: EnterpriseRole) => {
    console.log('[EnterpriseProvider] Adding member:', name);
    if (data.organization.usedSeats >= data.organization.maxSeats) {
      console.log('[EnterpriseProvider] Seat limit reached');
      return false;
    }
    const member: OrgMember = {
      id: generateId(),
      orgId: data.organization.id,
      name,
      email,
      role,
      isActive: true,
      lastActiveAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      clientIds: [],
      avatar: '',
    };
    const updated = {
      ...data,
      members: [...data.members, member],
      organization: { ...data.organization, usedSeats: data.organization.usedSeats + 1 },
    };
    saveData(updated);
    return true;
  }, [data, saveData]);

  const removeMember = useCallback((memberId: string) => {
    console.log('[EnterpriseProvider] Removing member:', memberId);
    const updated = {
      ...data,
      members: data.members.filter(m => m.id !== memberId),
      organization: { ...data.organization, usedSeats: Math.max(0, data.organization.usedSeats - 1) },
    };
    saveData(updated);
  }, [data, saveData]);

  const updateMemberRole = useCallback((memberId: string, role: EnterpriseRole) => {
    console.log('[EnterpriseProvider] Updating member role:', memberId, role);
    const updated = {
      ...data,
      members: data.members.map(m => m.id === memberId ? { ...m, role } : m),
    };
    saveData(updated);
  }, [data, saveData]);

  const generateReport = useCallback((format: ReportFormat, clientIds: string[], periodDays: number) => {
    console.log('[EnterpriseProvider] Generating report:', format);
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    const sections: ReportSection[] = [];
    const relevantCompliance = data.complianceSummaries.filter(c => clientIds.includes(c.clientId));
    const relevantHeatmap = data.heatmapData.filter(h => clientIds.includes(h.clientId));

    const avgCompliance = relevantCompliance.length > 0
      ? Math.round(relevantCompliance.reduce((s, c) => s + c.overallRate, 0) / relevantCompliance.length)
      : 0;

    const avgEngagement = relevantHeatmap.length > 0
      ? Math.round(relevantHeatmap.reduce((s, h) => {
          const avg = h.weekData.reduce((ws, w) => ws + w.engagementScore, 0) / h.weekData.length;
          return s + avg;
        }, 0) / relevantHeatmap.length)
      : 0;

    sections.push({
      title: 'Executive Summary',
      type: 'metrics',
      content: `Report covering ${clientIds.length} clients over the last ${periodDays} days.`,
      data: { clients: clientIds.length, avgCompliance, avgEngagement, period: `${periodDays} days` },
    });

    if (format === 'compliance' || format === 'detailed') {
      sections.push({
        title: 'Compliance Overview',
        type: 'table',
        content: relevantCompliance.map(c => `${c.clientName}: ${c.overallRate}% (${c.status})`).join('\n'),
        data: { compliant: relevantCompliance.filter(c => c.status === 'compliant').length, atRisk: relevantCompliance.filter(c => c.status === 'at_risk').length, nonCompliant: relevantCompliance.filter(c => c.status === 'non_compliant').length },
      });
    }

    if (format === 'clinical' || format === 'detailed') {
      sections.push({
        title: 'Engagement Analysis',
        type: 'chart',
        content: 'Engagement trends across all monitored clients.',
        data: { avgEngagement, highEngagement: relevantHeatmap.filter(h => h.weekData[h.weekData.length - 1]?.engagementScore > 60).length },
      });
    }

    const titles: Record<ReportFormat, string> = {
      summary: 'Summary Report',
      detailed: 'Detailed Analysis Report',
      compliance: 'Compliance Report',
      clinical: 'Clinical Summary Report',
    };

    const report: ExportableReport = {
      id: generateId(),
      orgId: data.organization.id,
      title: titles[format],
      format,
      generatedAt: now.toISOString(),
      generatedBy: currentMember?.name ?? 'Unknown',
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      clientIds,
      sections,
      status: 'ready',
    };

    const updated = { ...data, reports: [report, ...data.reports] };
    saveData(updated);
    return report;
  }, [data, currentMember, saveData]);

  const updateWhiteLabel = useCallback((config: Partial<WhiteLabelConfig>) => {
    console.log('[EnterpriseProvider] Updating white label config');
    const updated = {
      ...data,
      whiteLabel: { ...data.whiteLabel, ...config },
    };
    saveData(updated);
  }, [data, saveData]);

  const updateOrganization = useCallback((orgUpdate: Partial<Organization>) => {
    console.log('[EnterpriseProvider] Updating organization');
    const updated = {
      ...data,
      organization: { ...data.organization, ...orgUpdate },
    };
    saveData(updated);
  }, [data, saveData]);

  return useMemo(() => ({
    data,
    organization: data.organization,
    members: data.members,
    currentMember,
    currentPermissions,
    alertThresholds: data.alertThresholds,
    alerts: filteredAlerts,
    unacknowledgedAlerts,
    heatmapData: filteredHeatmapData,
    complianceSummaries: filteredComplianceSummaries,
    reports: data.reports,
    billing: data.billing,
    whiteLabel: data.whiteLabel,
    isLoading: dataQuery.isLoading,
    setCurrentMemberId,
    acknowledgeAlert,
    addAlertThreshold,
    toggleThreshold,
    addMember,
    removeMember,
    updateMemberRole,
    generateReport,
    updateWhiteLabel,
    updateOrganization,
    getClientsForMember,
  }), [
    data, currentMember, currentPermissions, filteredAlerts, unacknowledgedAlerts,
    filteredHeatmapData, filteredComplianceSummaries, dataQuery.isLoading,
    acknowledgeAlert, addAlertThreshold, toggleThreshold, addMember, removeMember,
    updateMemberRole, generateReport, updateWhiteLabel, updateOrganization, getClientsForMember,
  ]);
});
