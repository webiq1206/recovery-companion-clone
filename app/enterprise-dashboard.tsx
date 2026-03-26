import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  Users,
  Bell,
  BellOff,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  FileText,
  CreditCard,
  Palette,
  UserPlus,
  X,
  Check,
  Clock,
  Activity,
  Eye,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRequireProviderMode } from '@/hooks/useRequireProviderMode';
import { useEnterprise } from '@/providers/EnterpriseProvider';
import { DEFAULT_ORGANIZATION, ROLE_LABELS, TIER_LABELS } from '@/constants/enterprise';
import { EnterpriseRole, OrgMember } from '@/types';

const METRIC_COLORS = {
  excellent: '#4CAF50',
  good: '#66BB6A',
  moderate: '#FFB347',
  poor: '#FF6B35',
  critical: '#EF5350',
};

function getMetricColor(value: number, inverted = false): string {
  const v = inverted ? 100 - value : value;
  if (v >= 80) return METRIC_COLORS.excellent;
  if (v >= 60) return METRIC_COLORS.good;
  if (v >= 40) return METRIC_COLORS.moderate;
  if (v >= 20) return METRIC_COLORS.poor;
  return METRIC_COLORS.critical;
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EnterpriseDashboard() {
  const router = useRouter();
  const canAccess = useRequireProviderMode();
  const {
    organization,
    members,
    currentMember,
    currentPermissions,
    unacknowledgedAlerts,
    alerts,
    heatmapData,
    complianceSummaries,
    acknowledgeAlert,
    addMember,
  } = useEnterprise();

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<EnterpriseRole>('therapist');
  const org = organization ?? DEFAULT_ORGANIZATION;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const activeMembers = useMemo(() => members.filter(m => m.isActive), [members]);

  const avgEngagement = useMemo(() => {
    if (heatmapData.length === 0) return 0;
    return Math.round(heatmapData.reduce((s, h) => {
      const recent = h.weekData.slice(-7);
      const avg = recent.reduce((ws, w) => ws + w.engagementScore, 0) / recent.length;
      return s + avg;
    }, 0) / heatmapData.length);
  }, [heatmapData]);

  const avgCompliance = useMemo(() => {
    if (complianceSummaries.length === 0) return 0;
    return Math.round(complianceSummaries.reduce((s, c) => s + c.overallRate, 0) / complianceSummaries.length);
  }, [complianceSummaries]);

  const atRiskCount = useMemo(() => {
    return complianceSummaries.filter(c => c.status !== 'compliant').length;
  }, [complianceSummaries]);

  const handleAddMember = useCallback(() => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    const success = addMember(newMemberName.trim(), newMemberEmail.trim(), newMemberRole);
    if (!success) {
      Alert.alert('Seat Limit', 'Your organization has reached its seat limit. Upgrade your plan to add more members.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('therapist');
  }, [newMemberName, newMemberEmail, newMemberRole, addMember]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    acknowledgeAlert(alertId);
  }, [acknowledgeAlert]);

  const roleOptions: EnterpriseRole[] = ['therapist', 'case_manager', 'clinical_director', 'billing_admin', 'viewer'];

  if (!canAccess) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
              <ChevronLeft size={22} color={Colors.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            <View style={styles.headerTop}>
              <View style={styles.orgBadge}>
                <Building2 size={18} color={Colors.primary} />
                <Text style={styles.orgName}>{org.name}</Text>
              </View>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{TIER_LABELS[org.tier]}</Text>
              </View>
            </View>
            <Text style={styles.welcomeText}>Welcome, {currentMember?.name?.split(' ')[0] ?? 'Admin'}</Text>
            <Text style={styles.roleText}>{ROLE_LABELS[currentMember?.role ?? 'viewer']}</Text>
          </View>

          {unacknowledgedAlerts.length > 0 && (
            <View style={styles.alertBanner}>
              <View style={styles.alertBannerHeader}>
                <Bell size={16} color="#EF5350" />
                <Text style={styles.alertBannerTitle}>{unacknowledgedAlerts.length} Active Alert{unacknowledgedAlerts.length > 1 ? 's' : ''}</Text>
              </View>
              {unacknowledgedAlerts.slice(0, 3).map(alert => (
                <Pressable
                  key={alert.id}
                  style={styles.alertItem}
                  onPress={() => handleAcknowledgeAlert(alert.id)}
                  testID={`alert-${alert.id}`}
                >
                  <View style={styles.alertContent}>
                    <AlertTriangle size={14} color="#FFB347" />
                    <View style={styles.alertTextWrap}>
                      <Text style={styles.alertClientName}>{alert.clientName}</Text>
                      <Text style={styles.alertMetric}>
                        {alert.metric.replace('_', ' ')}: {alert.currentValue} (threshold: {alert.thresholdValue})
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.alertTime}>{getTimeAgo(alert.triggeredAt)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Clients</Text>
              <Text style={[styles.metricValue, { color: Colors.primary }]}>{heatmapData.length}</Text>
              <Text style={styles.metricSub}>monitored</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Engagement</Text>
              <Text style={[styles.metricValue, { color: getMetricColor(avgEngagement) }]}>{avgEngagement}%</Text>
              <Text style={styles.metricSub}>average</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Compliance</Text>
              <Text style={[styles.metricValue, { color: getMetricColor(avgCompliance) }]}>{avgCompliance}%</Text>
              <Text style={styles.metricSub}>overall rate</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>At Risk</Text>
              <Text style={[styles.metricValue, { color: atRiskCount > 0 ? METRIC_COLORS.poor : METRIC_COLORS.excellent }]}>{atRiskCount}</Text>
              <Text style={styles.metricSub}>clients</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.actionsGrid}>
              <Pressable style={styles.actionCard} onPress={() => router.push('/enterprise-heatmaps' as never)} testID="nav-heatmaps">
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(46, 196, 182, 0.15)' }]}>
                  <BarChart3 size={20} color={Colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Heatmaps</Text>
                <Text style={styles.actionSub}>Engagement & compliance</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => router.push('/enterprise-reports' as never)} testID="nav-reports">
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                  <FileText size={20} color={Colors.accent} />
                </View>
                <Text style={styles.actionLabel}>Reports</Text>
                <Text style={styles.actionSub}>Generate & export</Text>
              </Pressable>
              {currentPermissions.canManageBilling && (
                <Pressable style={styles.actionCard} onPress={() => router.push('/enterprise-billing' as never)} testID="nav-billing">
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                    <CreditCard size={20} color={Colors.success} />
                  </View>
                  <Text style={styles.actionLabel}>Billing</Text>
                  <Text style={styles.actionSub}>Plans & invoices</Text>
                </Pressable>
              )}
              {currentPermissions.canWhiteLabel && (
                <Pressable style={styles.actionCard} onPress={() => router.push('/enterprise-whitelabel' as never)} testID="nav-whitelabel">
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 179, 71, 0.15)' }]}>
                    <Palette size={20} color={Colors.accentWarm} />
                  </View>
                  <Text style={styles.actionLabel}>White Label</Text>
                  <Text style={styles.actionSub}>Branding & custom</Text>
                </Pressable>
              )}
            </View>
          </View>

          {currentPermissions.canManageMembers && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team Members</Text>
                <Pressable style={styles.addBtn} onPress={() => setShowAddMember(true)} testID="add-member-btn">
                  <UserPlus size={16} color={Colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
              <View style={styles.seatInfo}>
                <Text style={styles.seatText}>{org.usedSeats} / {org.maxSeats} seats used</Text>
                <View style={styles.seatBar}>
                  <View style={[styles.seatBarFill, { width: `${(org.usedSeats / Math.max(1, org.maxSeats)) * 100}%` }]} />
                </View>
              </View>
              {members.map(member => (
                <View key={member.id} style={[styles.memberRow, !member.isActive && styles.memberInactive]}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>{ROLE_LABELS[member.role]}</Text>
                  </View>
                  <View style={styles.memberMeta}>
                    <View style={[styles.statusDot, { backgroundColor: member.isActive ? Colors.success : Colors.textMuted }]} />
                    <Text style={styles.memberLastActive}>{getTimeAgo(member.lastActiveAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Compliance Overview</Text>
              <Pressable onPress={() => router.push('/enterprise-heatmaps' as never)}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
            {complianceSummaries.map(summary => (
              <View key={summary.clientId} style={styles.complianceRow}>
                <View style={styles.complianceInfo}>
                  <Text style={styles.complianceName}>{summary.clientName}</Text>
                  <View style={[styles.complianceStatus, {
                    backgroundColor: summary.status === 'compliant' ? 'rgba(76,175,80,0.15)' :
                      summary.status === 'at_risk' ? 'rgba(255,179,71,0.15)' : 'rgba(239,83,80,0.15)'
                  }]}>
                    <Text style={[styles.complianceStatusText, {
                      color: summary.status === 'compliant' ? Colors.success :
                        summary.status === 'at_risk' ? Colors.accentWarm : Colors.danger
                    }]}>
                      {summary.status === 'compliant' ? 'Compliant' : summary.status === 'at_risk' ? 'At Risk' : 'Non-Compliant'}
                    </Text>
                  </View>
                </View>
                <View style={styles.complianceBar}>
                  <View style={styles.complianceBarBg}>
                    <View style={[styles.complianceBarFill, {
                      width: `${summary.overallRate}%`,
                      backgroundColor: getMetricColor(summary.overallRate),
                    }]} />
                  </View>
                  <Text style={styles.complianceRate}>{summary.overallRate}%</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>

      <Modal visible={showAddMember} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Team Member</Text>
              <Pressable onPress={() => setShowAddMember(false)}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={newMemberName}
              onChangeText={setNewMemberName}
              placeholder="Enter name"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              placeholder="Enter email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleGrid}>
              {roleOptions.map(role => (
                <Pressable
                  key={role}
                  style={[styles.roleOption, newMemberRole === role && styles.roleOptionActive]}
                  onPress={() => setNewMemberRole(role)}
                >
                  <Text style={[styles.roleOptionText, newMemberRole === role && styles.roleOptionTextActive]}>
                    {ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.modalSubmit} onPress={handleAddMember} testID="submit-add-member">
              <Check size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Member</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: 'flex-start' as const,
  },
  backBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  tierBadge: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  roleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  alertBanner: {
    backgroundColor: 'rgba(239, 83, 80, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.2)',
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#EF5350',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 83, 80, 0.1)',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertClientName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  alertMetric: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  alertTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  metricSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  viewAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  actionSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  seatInfo: {
    marginBottom: 14,
  },
  seatText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  seatBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  seatBarFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  memberInactive: {
    opacity: 0.5,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  memberRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  memberLastActive: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  complianceRow: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  complianceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  complianceName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  complianceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  complianceStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  complianceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
  },
  complianceBarFill: {
    height: 6,
    borderRadius: 3,
  },
  complianceRate: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    width: 40,
    textAlign: 'right' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleOptionActive: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    borderColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  roleOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  modalSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
