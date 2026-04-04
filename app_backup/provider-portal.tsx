import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack, useRouter } from 'expo-router';
import {
  Shield,
  Users,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  Search,
  FileText,
  Clock,
  Heart,
  BarChart3,
  X,
  Check,
  Send,
  Settings,
  LogOut,
  Minus,
  Eye,
  Filter,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTherapist } from '@/providers/TherapistProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { PremiumSectionOverlay } from '@/components/PremiumGate';
import { useRequireProviderMode } from '@/hooks/useRequireProviderMode';
import { ConnectedClient, ProviderRole, ConsentScope } from '@/types';

const ROLE_LABELS: Record<ProviderRole, string> = {
  therapist: 'Therapist',
  counselor: 'Counselor',
  case_manager: 'Case Manager',
  peer_specialist: 'Peer Specialist',
  psychiatrist: 'Psychiatrist',
};

const RISK_COLORS = {
  low: '#4CAF50',
  moderate: '#FFB347',
  high: '#FF6B35',
  critical: '#EF5350',
};

function getRiskLabel(level: number): { label: string; color: string } {
  if (level <= 25) return { label: 'Low', color: RISK_COLORS.low };
  if (level <= 50) return { label: 'Moderate', color: RISK_COLORS.moderate };
  if (level <= 75) return { label: 'High', color: RISK_COLORS.high };
  return { label: 'Critical', color: RISK_COLORS.critical };
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function getTrendIcon(trend: string) {
  if (trend === 'rising') return <TrendingUp size={14} color={RISK_COLORS.high} />;
  if (trend === 'falling') return <TrendingDown size={14} color={RISK_COLORS.low} />;
  return <Minus size={14} color={Colors.textSecondary} />;
}

export default function ProviderPortalScreen() {
  const router = useRouter();
  const canAccess = useRequireProviderMode();
  const {
    isPortalEnabled,
    provider,
    clients,
    activeClients,
    atRiskClients,
    invitations,
    avgStability,
    avgEngagement,
    setupProvider,
    inviteClient,
    disablePortal,
  } = useTherapist();
  const { hasFeature } = useSubscription();

  const [showSetup, setShowSetup] = useState<boolean>(!isPortalEnabled);
  const [showInvite, setShowInvite] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [setupName, setSetupName] = useState<string>('');
  const [setupRole, setSetupRole] = useState<ProviderRole>('therapist');
  const [setupOrg, setSetupOrg] = useState<string>('');
  const [setupEmail, setSetupEmail] = useState<string>('');

  const [inviteName, setInviteName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    setShowSetup(!isPortalEnabled);
  }, [isPortalEnabled]);

  const handleSetup = useCallback(() => {
    if (!setupName.trim() || !setupEmail.trim()) {
      Alert.alert('Required Fields', 'Please enter your name and email.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setupProvider(setupName.trim(), setupRole, setupOrg.trim(), setupEmail.trim());
    setShowSetup(false);
  }, [setupName, setupRole, setupOrg, setupEmail, setupProvider]);

  const handleInviteClient = useCallback(() => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      Alert.alert('Required Fields', 'Please enter client name and email.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const scope: ConsentScope = {
      progressData: true,
      moodTrends: true,
      relapseAlerts: true,
      engagementMetrics: true,
      journalSummaries: false,
      checkInData: true,
    };
    inviteClient(inviteName.trim(), inviteEmail.trim(), scope);
    setInviteName('');
    setInviteEmail('');
    setShowInvite(false);
    Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteName.trim()}.`);
  }, [inviteName, inviteEmail, inviteClient]);

  const handleDisablePortal = useCallback(() => {
    Alert.alert(
      'Disable Provider Portal',
      'This will remove all provider data. Client recovery data is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            disablePortal();
            router.back();
          },
        },
      ]
    );
  }, [disablePortal, router]);

  const handleClientPress = useCallback((clientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/client-detail', params: { clientId } } as any);
  }, [router]);

  const renderClientCard = useCallback((client: ConnectedClient) => {
    const risk = getRiskLabel(client.riskLevel);
    const isAtRisk = client.riskLevel > 50 || client.riskTrend === 'rising';

    return (
      <Pressable
        key={client.id}
        style={({ pressed }) => [
          styles.clientCard,
          isAtRisk && styles.clientCardAtRisk,
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => handleClientPress(client.id)}
        testID={`client-card-${client.id}`}
      >
        <View style={styles.clientHeader}>
          <View style={styles.clientNameRow}>
            <View style={[styles.clientAvatar, { borderColor: risk.color }]}>
              <Text style={styles.clientInitial}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientAlias}>{client.anonymousAlias}</Text>
            </View>
          </View>
          <View style={styles.clientBadges}>
            <View style={[styles.statusBadge, { backgroundColor: client.status === 'active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,179,71,0.15)' }]}>
              <Text style={[styles.statusText, { color: client.status === 'active' ? Colors.success : Colors.accentWarm }]}>
                {client.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.clientMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Stability</Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: client.stabilityScore >= 60 ? Colors.success : client.stabilityScore >= 40 ? Colors.accentWarm : Colors.danger }]}>
                {client.stabilityScore}
              </Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricBarFill, { width: `${client.stabilityScore}%`, backgroundColor: client.stabilityScore >= 60 ? Colors.success : client.stabilityScore >= 40 ? Colors.accentWarm : Colors.danger }]} />
              </View>
            </View>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Risk</Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: risk.color }]}>
                {client.riskLevel}
              </Text>
              {getTrendIcon(client.riskTrend)}
            </View>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Mood</Text>
            <Text style={[styles.metricValue, { color: client.moodAverage >= 60 ? Colors.success : client.moodAverage >= 40 ? Colors.accentWarm : Colors.danger }]}>
              {client.moodAverage}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Engage</Text>
            <Text style={[styles.metricValue, { color: Colors.primary }]}>
              {client.engagementScore}
            </Text>
          </View>
        </View>

        <View style={styles.clientFooter}>
          <View style={styles.footerLeft}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.lastActivity}>{getTimeAgo(client.lastActivity)}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.soberDays}>{client.daysSober}d sober</Text>
            <ChevronRight size={14} color={Colors.textMuted} />
          </View>
        </View>

        {isAtRisk && (
          <View style={styles.riskBanner}>
            <AlertTriangle size={12} color={Colors.accent} />
            <Text style={styles.riskBannerText}>
              {client.riskTrend === 'rising' ? 'Risk trending upward' : 'Elevated risk level'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }, [handleClientPress]);

  const filteredClients = useMemo(() => {
    let result = clients;
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.anonymousAlias.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.riskLevel - a.riskLevel);
  }, [clients, filterStatus, searchQuery]);

  if (!canAccess) return null;

  if (!hasFeature('therapist_export')) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Provider Portal', headerShown: true }} />
        <View style={styles.portalGateContainer}>
          <PremiumSectionOverlay
            feature="therapist_export"
            title="Provider Companion Portal"
            description="Unlock the therapist portal to monitor client progress, receive risk alerts, generate reports, and export treatment insights."
          />
        </View>
      </View>
    );
  }

  if (showSetup) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Provider Portal', headerShown: true }} />
        <ScreenScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.setupIcon}>
              <Shield size={40} color={Colors.primary} />
            </View>
            <Text style={styles.setupTitle}>Provider Companion Portal</Text>
            <Text style={styles.setupSubtitle}>
              Set up your secure portal to monitor client progress, receive risk alerts, and generate treatment insights - all with consent-based data sharing.
            </Text>

            <View style={styles.setupCard}>
              <Text style={styles.setupFieldLabel}>Your Name</Text>
              <TextInput
                style={styles.setupInput}
                value={setupName}
                onChangeText={setSetupName}
                placeholder="Dr. Jane Smith"
                placeholderTextColor={Colors.textMuted}
                maxLength={50}
              />

              <Text style={styles.setupFieldLabel}>Role</Text>
              <View style={styles.roleGrid}>
                {(Object.keys(ROLE_LABELS) as ProviderRole[]).map((role) => (
                  <Pressable
                    key={role}
                    style={[styles.roleChip, setupRole === role && styles.roleChipActive]}
                    onPress={() => { Haptics.selectionAsync(); setSetupRole(role); }}
                  >
                    <Text style={[styles.roleChipText, setupRole === role && styles.roleChipTextActive]}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.setupFieldLabel}>Organization (Optional)</Text>
              <TextInput
                style={styles.setupInput}
                value={setupOrg}
                onChangeText={setSetupOrg}
                placeholder="Recovery Center LLC"
                placeholderTextColor={Colors.textMuted}
                maxLength={80}
              />

              <Text style={styles.setupFieldLabel}>Email</Text>
              <TextInput
                style={styles.setupInput}
                value={setupEmail}
                onChangeText={setSetupEmail}
                placeholder="provider@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={80}
              />
            </View>

            <View style={styles.privacyNote}>
              <Shield size={16} color={Colors.primary} />
              <Text style={styles.privacyNoteText}>
                All data sharing requires explicit client consent. Clients can revoke access at any time. Data is encrypted and HIPAA-aligned.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.9 }]}
              onPress={handleSetup}
              testID="setup-portal-btn"
            >
              <Text style={styles.setupBtnText}>Enable Provider Portal</Text>
            </Pressable>

            <Pressable
              style={styles.cancelSetup}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelSetupText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </ScreenScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Provider Portal', headerShown: true }} />
      <ScreenScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.portalHeader}>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <Shield size={20} color={Colors.primary} />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerRole}>
                  {ROLE_LABELS[provider.role]}{provider.organization ? ` · ${provider.organization}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.portalSettings}
                onPress={handleDisablePortal}
                hitSlop={12}
              >
                <LogOut size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
                <Users size={18} color={Colors.primary} />
              </View>
              <Text style={styles.overviewValue}>{activeClients.length}</Text>
              <Text style={styles.overviewLabel}>Active Clients</Text>
            </View>

            <View style={styles.overviewCard}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(255,107,53,0.12)' }]}>
                <AlertTriangle size={18} color={Colors.accent} />
              </View>
              <Text style={[styles.overviewValue, atRiskClients.length > 0 && { color: Colors.accent }]}>
                {atRiskClients.length}
              </Text>
              <Text style={styles.overviewLabel}>At Risk</Text>
            </View>

            <View style={styles.overviewCard}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
                <Activity size={18} color={Colors.success} />
              </View>
              <Text style={styles.overviewValue}>{avgStability}</Text>
              <Text style={styles.overviewLabel}>Avg Stability</Text>
            </View>

            <View style={styles.overviewCard}>
              <View style={[styles.overviewIcon, { backgroundColor: 'rgba(66,165,245,0.12)' }]}>
                <BarChart3 size={18} color="#42A5F5" />
              </View>
              <Text style={styles.overviewValue}>{avgEngagement}</Text>
              <Text style={styles.overviewLabel}>Avg Engage</Text>
            </View>
          </View>

          {atRiskClients.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <AlertTriangle size={16} color={Colors.accent} />
                <Text style={styles.alertTitle}>Clients Needing Attention</Text>
              </View>
              {atRiskClients.map((client) => {
                const risk = getRiskLabel(client.riskLevel);
                return (
                  <Pressable
                    key={client.id}
                    style={({ pressed }) => [styles.alertRow, pressed && { opacity: 0.85 }]}
                    onPress={() => handleClientPress(client.id)}
                  >
                    <View style={styles.alertLeft}>
                      <View style={[styles.alertDot, { backgroundColor: risk.color }]} />
                      <View>
                        <Text style={styles.alertName}>{client.name}</Text>
                        <Text style={styles.alertDetail}>
                          Risk: {client.riskLevel} ({risk.label}) · {client.riskTrend === 'rising' ? 'Trending up' : 'Elevated'}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.clientsSection}>
            <View style={styles.clientsSectionHeader}>
              <Text style={styles.sectionTitle}>CLIENTS</Text>
              <Pressable
                style={styles.inviteBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowInvite(true); }}
              >
                <UserPlus size={14} color={Colors.primary} />
                <Text style={styles.inviteBtnText}>Invite</Text>
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search clients..."
                  placeholderTextColor={Colors.textMuted}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <X size={14} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.filterRow}>
              {['all', 'active', 'paused', 'discharged'].map((status) => (
                <Pressable
                  key={status}
                  style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                  onPress={() => { Haptics.selectionAsync(); setFilterStatus(status); }}
                >
                  <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {filteredClients.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No clients found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try adjusting your search' : 'Invite your first client to get started'}
                </Text>
              </View>
            ) : (
              filteredClients.map(renderClientCard)
            )}
          </View>

          {invitations.length > 0 && (
            <View style={styles.invitationsSection}>
              <Text style={styles.sectionTitle}>PENDING INVITATIONS</Text>
              {invitations.filter(i => i.status === 'pending').map((inv) => (
                <View key={inv.id} style={styles.invitationRow}>
                  <View style={styles.invitationLeft}>
                    <Send size={14} color={Colors.primary} />
                    <View>
                      <Text style={styles.invitationName}>{inv.clientName}</Text>
                      <Text style={styles.invitationEmail}>{inv.clientEmail}</Text>
                    </View>
                  </View>
                  <Text style={styles.invitationTime}>{getTimeAgo(inv.sentAt)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.complianceNote}>
            <Shield size={14} color={Colors.textMuted} />
            <Text style={styles.complianceText}>
              All data is shared with explicit client consent. Clients may revoke access at any time. Data handling follows HIPAA-aligned practices.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>

      <Modal
        visible={showInvite}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInvite(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Client</Text>
              <Pressable onPress={() => setShowInvite(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              Client will receive an invitation to share their recovery data with you.
            </Text>

            <Text style={styles.modalFieldLabel}>Client Name</Text>
            <TextInput
              style={styles.modalInput}
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Client's name"
              placeholderTextColor={Colors.textMuted}
              maxLength={50}
            />

            <Text style={styles.modalFieldLabel}>Client Email</Text>
            <TextInput
              style={styles.modalInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="client@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={80}
            />

            <View style={styles.consentInfo}>
              <Eye size={14} color={Colors.primary} />
              <Text style={styles.consentInfoText}>
                Default shared data: progress, mood trends, risk alerts, engagement, and check-ins. Journal summaries require additional consent.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.modalSendBtn, pressed && { opacity: 0.9 }]}
              onPress={handleInviteClient}
            >
              <Send size={16} color={Colors.white} />
              <Text style={styles.modalSendText}>Send Invitation</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  setupContent: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center' as const,
  },
  setupIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(46,196,182,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  setupSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  setupCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 20,
    width: '100%' as const,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  setupFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  setupInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  roleGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleChipActive: {
    backgroundColor: 'rgba(46,196,182,0.12)',
    borderColor: Colors.primary,
  },
  roleChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  roleChipTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  privacyNote: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    backgroundColor: 'rgba(46,196,182,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    width: '100%' as const,
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  privacyNoteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    flex: 1,
  },
  setupBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center' as const,
    width: '100%' as const,
    marginBottom: 12,
  },
  setupBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  cancelSetup: {
    paddingVertical: 12,
  },
  cancelSetupText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  portalHeader: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  providerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  providerRole: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  portalSettings: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  overviewGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    width: '48%' as any,
    flexGrow: 1,
    alignItems: 'center' as const,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  alertSection: {
    backgroundColor: 'rgba(255,107,53,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  alertHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  alertRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,107,53,0.15)',
  },
  alertLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  alertDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  clientsSection: {
    marginBottom: 16,
  },
  clientsSectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  inviteBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(46,196,182,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  searchRow: {
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: 'rgba(46,196,182,0.15)',
  },
  filterText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
  clientCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  clientCardAtRisk: {
    borderColor: 'rgba(255,107,53,0.3)',
  },
  clientHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 14,
  },
  clientNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
  },
  clientInitial: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  clientAlias: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  clientBadges: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  clientMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center' as const,
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  metricValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  metricBar: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface,
    overflow: 'hidden' as const,
  },
  metricBarFill: {
    height: '100%' as const,
    borderRadius: 2,
  },
  clientFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  footerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  lastActivity: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  footerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  soberDays: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  riskBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  riskBannerText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  invitationsSection: {
    marginBottom: 16,
  },
  invitationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  invitationLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  invitationName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  invitationEmail: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  invitationTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  complianceNote: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginTop: 8,
  },
  complianceText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 19,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  consentInfo: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    backgroundColor: 'rgba(46,196,182,0.06)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  consentInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  modalSendBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 8,
  },
  modalSendText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  portalGateContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
});
