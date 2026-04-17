import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Heart,
  BarChart3,
  AlertTriangle,
  FileText,
  Download,
  Clock,
  Calendar,
  Target,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useRequireProviderMode } from '../hooks/useRequireProviderMode';
import { useTherapist } from '../providers/TherapistProvider';
import { ConnectedClient, ClientReport, WeeklyTrend, ConsentScope } from '../types';

const STAGE_COLORS: Record<string, string> = {
  crisis: '#EF5350',
  stabilize: '#FF9800',
  rebuild: '#42A5F5',
  maintain: '#66BB6A',
};

function getRiskColor(level: number): string {
  if (level <= 25) return '#4CAF50';
  if (level <= 50) return '#FFB347';
  if (level <= 75) return '#FF6B35';
  return '#EF5350';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  const canAccess = useRequireProviderMode();
  const { getClientById, getClientReports, generateClientReport, updateClientStatus, revokeClientAccess } = useTherapist();

  const resolvedClientId = clientId ?? '';
  const client = useMemo(
    () => getClientById(resolvedClientId),
    [getClientById, resolvedClientId],
  );
  const reports = useMemo(
    () => getClientReports(resolvedClientId),
    [getClientReports, resolvedClientId],
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'reports'>('overview');
  const handleGenerateReport = useCallback(() => {
    if (!resolvedClientId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const report = generateClientReport(resolvedClientId);
    if (report) {
      Alert.alert('Report Generated', `A new progress report for ${client?.name ?? 'client'} has been created.`);
    }
  }, [resolvedClientId, client, generateClientReport]);

  const handleShareReport = useCallback(async (report: ClientReport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = `Recovery Progress Report - ${report.clientName}\n` +
      `Period: ${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}\n\n` +
      `Summary:\n${report.summary}\n\n` +
      `Key Metrics:\n` +
      `• Stability: ${report.stabilityAvg}/100\n` +
      `• Mood: ${report.moodAvg}/100\n` +
      `• Risk: ${report.riskAvg}/100\n` +
      `• Engagement: ${report.engagementAvg}/100\n` +
      `• Check-ins: ${report.checkInCount}\n` +
      `• Streak: ${report.streakDays} days\n\n` +
      (report.highlights.length > 0 ? `Highlights:\n${report.highlights.map(h => `• ${h}`).join('\n')}\n\n` : '') +
      (report.concerns.length > 0 ? `Concerns:\n${report.concerns.map(c => `• ${c}`).join('\n')}\n\n` : '') +
      (report.recommendations.length > 0 ? `Recommendations:\n${report.recommendations.map(r => `• ${r}`).join('\n')}` : '');

    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          Alert.alert('Copied', 'Report copied to clipboard.');
        }
      } else {
        await Share.share({ message: text, title: `Report - ${report.clientName}` });
      }
    } catch (e) {
      console.log('[ClientDetail] Share error:', e);
    }
  }, []);

  const handleStatusChange = useCallback((status: 'active' | 'paused' | 'discharged') => {
    if (!resolvedClientId || !client) return;
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    Alert.alert(
      `${label} Client`,
      `Set ${client.name}'s status to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateClientStatus(resolvedClientId, status);
          },
        },
      ]
    );
  }, [resolvedClientId, client, updateClientStatus]);

  const handleRevokeAccess = useCallback(() => {
    if (!resolvedClientId || !client) return;
    Alert.alert(
      'Revoke Access',
      `This will stop data sharing with ${client.name}. You will no longer receive updates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            revokeClientAccess(resolvedClientId);
            router.back();
          },
        },
      ]
    );
  }, [resolvedClientId, client, revokeClientAccess, router]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  if (!canAccess) return null;

  if (!client) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Client Detail' }} />
        <View style={styles.notFound}>
          <User size={40} color={Colors.textMuted} />
          <Text style={styles.notFoundText}>Client not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const stageColor = STAGE_COLORS[client.recoveryStage] ?? Colors.textMuted;
  const riskColor = getRiskColor(client.riskLevel);
  const isAtRisk = client.riskLevel > 50 || client.riskTrend === 'rising';

  const consentLabels: { key: keyof ConsentScope; label: string }[] = [
    { key: 'progressData', label: 'Progress Data' },
    { key: 'moodTrends', label: 'Mood Trends' },
    { key: 'relapseAlerts', label: 'Relapse Alerts' },
    { key: 'engagementMetrics', label: 'Engagement Metrics' },
    { key: 'journalSummaries', label: 'Journal Summaries' },
    { key: 'checkInData', label: 'Check-in Data' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: client.name }} />
      <ScreenScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={[styles.avatar, { borderColor: stageColor }]}>
                <Text style={styles.avatarText}>{client.name.charAt(0)}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{client.name}</Text>
                <Text style={styles.headerAlias}>{client.anonymousAlias}</Text>
                <View style={styles.headerBadges}>
                  <View style={[styles.stageBadge, { backgroundColor: stageColor + '20', borderColor: stageColor + '40' }]}>
                    <Text style={[styles.stageBadgeText, { color: stageColor }]}>
                      {client.recoveryStage.charAt(0).toUpperCase() + client.recoveryStage.slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: client.status === 'active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,179,71,0.15)' }]}>
                    <Text style={[styles.statusBadgeText, { color: client.status === 'active' ? Colors.success : Colors.accentWarm }]}>
                      {client.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerStats}>
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{client.daysSober}</Text>
                <Text style={styles.headerStatLabel}>Days Sober</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{client.currentStreak}</Text>
                <Text style={styles.headerStatLabel}>Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{client.checkInCount}</Text>
                <Text style={styles.headerStatLabel}>Check-ins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.headerStat}>
                <Text style={[styles.headerStatValue, { color: client.relapseCount > 0 ? Colors.accent : Colors.success }]}>
                  {client.relapseCount}
                </Text>
                <Text style={styles.headerStatLabel}>Relapses</Text>
              </View>
            </View>

            {isAtRisk && (
              <View style={styles.riskAlert}>
                <AlertTriangle size={14} color={Colors.accent} />
                <Text style={styles.riskAlertText}>
                  {client.riskTrend === 'rising'
                    ? 'Wellness summary is trending up—consider checking in with them soon'
                    : 'Wellness summary looks elevated—extra encouragement may help'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.tabRow}>
            {(['overview', 'trends', 'reports'] as const).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'overview' && (
            <>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
                    <Activity size={18} color={Colors.success} />
                  </View>
                  <Text style={[styles.metricCardValue, { color: client.stabilityScore >= 60 ? Colors.success : client.stabilityScore >= 40 ? Colors.accentWarm : Colors.danger }]}>
                    {client.stabilityScore}
                  </Text>
                  <Text style={styles.metricCardLabel}>Stability</Text>
                  <View style={styles.metricBarTrack}>
                    <View style={[styles.metricBarFill, { width: `${client.stabilityScore}%`, backgroundColor: client.stabilityScore >= 60 ? Colors.success : client.stabilityScore >= 40 ? Colors.accentWarm : Colors.danger }]} />
                  </View>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: 'rgba(255,107,53,0.12)' }]}>
                    <AlertTriangle size={18} color={riskColor} />
                  </View>
                  <View style={styles.metricValueRow}>
                    <Text style={[styles.metricCardValue, { color: riskColor }]}>{client.riskLevel}</Text>
                    {client.riskTrend === 'rising' ? <TrendingUp size={14} color="#EF5350" /> :
                     client.riskTrend === 'falling' ? <TrendingDown size={14} color="#4CAF50" /> :
                     <Minus size={14} color={Colors.textMuted} />}
                  </View>
                  <Text style={styles.metricCardLabel}>Support signal</Text>
                  <View style={styles.metricBarTrack}>
                    <View style={[styles.metricBarFill, { width: `${client.riskLevel}%`, backgroundColor: riskColor }]} />
                  </View>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: 'rgba(255,179,71,0.12)' }]}>
                    <Heart size={18} color={Colors.accentWarm} />
                  </View>
                  <Text style={[styles.metricCardValue, { color: client.moodAverage >= 60 ? Colors.success : client.moodAverage >= 40 ? Colors.accentWarm : Colors.danger }]}>
                    {client.moodAverage}
                  </Text>
                  <Text style={styles.metricCardLabel}>Mood Avg</Text>
                  <View style={styles.metricBarTrack}>
                    <View style={[styles.metricBarFill, { width: `${client.moodAverage}%`, backgroundColor: client.moodAverage >= 60 ? Colors.success : client.moodAverage >= 40 ? Colors.accentWarm : Colors.danger }]} />
                  </View>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
                    <Zap size={18} color={Colors.primary} />
                  </View>
                  <Text style={[styles.metricCardValue, { color: Colors.primary }]}>{client.engagementScore}</Text>
                  <Text style={styles.metricCardLabel}>Engagement</Text>
                  <View style={styles.metricBarTrack}>
                    <View style={[styles.metricBarFill, { width: `${client.engagementScore}%`, backgroundColor: Colors.primary }]} />
                  </View>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Activity Summary</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Check-in</Text>
                  <Text style={styles.detailValue}>{getTimeAgo(client.lastCheckIn)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Activity</Text>
                  <Text style={styles.detailValue}>{getTimeAgo(client.lastActivity)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Connected Since</Text>
                  <Text style={styles.detailValue}>{formatDate(client.connectedAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Consent Status</Text>
                  <View style={styles.consentBadge}>
                    {client.consentStatus === 'granted' ?
                      <CheckCircle size={12} color={Colors.success} /> :
                      <XCircle size={12} color={Colors.danger} />}
                    <Text style={[styles.consentText, { color: client.consentStatus === 'granted' ? Colors.success : Colors.danger }]}>
                      {client.consentStatus}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Data Sharing Consent</Text>
                <Text style={styles.consentSubtitle}>Client has consented to share:</Text>
                {consentLabels.map(({ key, label }) => (
                  <View key={key} style={styles.consentRow}>
                    {client.consentScope[key] ?
                      <Eye size={14} color={Colors.success} /> :
                      <EyeOff size={14} color={Colors.textMuted} />}
                    <Text style={[styles.consentLabel, !client.consentScope[key] && { color: Colors.textMuted }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionsCard}>
                <Text style={styles.detailTitle}>Actions</Text>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleGenerateReport}
                >
                  <FileText size={16} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Generate Progress Report</Text>
                  <ChevronRight size={14} color={Colors.textMuted} />
                </Pressable>

                {client.status !== 'active' && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => handleStatusChange('active')}
                  >
                    <CheckCircle size={16} color={Colors.success} />
                    <Text style={styles.actionBtnText}>Set Active</Text>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </Pressable>
                )}

                {client.status === 'active' && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => handleStatusChange('paused')}
                  >
                    <Clock size={16} color={Colors.accentWarm} />
                    <Text style={styles.actionBtnText}>Pause shared updates</Text>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </Pressable>
                )}

                <Pressable
                  style={({ pressed }) => [styles.actionBtn, styles.dangerAction, pressed && { opacity: 0.85 }]}
                  onPress={handleRevokeAccess}
                >
                  <XCircle size={16} color={Colors.danger} />
                  <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Revoke Data Access</Text>
                </Pressable>
              </View>
            </>
          )}

          {activeTab === 'trends' && (
            <>
              <Text style={styles.sectionLabel}>8-WEEK TRENDS</Text>
              {client.weeklyTrend.length > 0 ? (
                <>
                  <View style={styles.trendCard}>
                    <Text style={styles.trendTitle}>Stability</Text>
                    <View style={styles.trendBars}>
                      {client.weeklyTrend.map((w, i) => (
                        <View key={i} style={styles.trendBarCol}>
                          <View style={styles.trendBarTrack}>
                            <View style={[styles.trendBarFill, {
                              height: `${w.stability}%`,
                              backgroundColor: w.stability >= 60 ? Colors.success : w.stability >= 40 ? Colors.accentWarm : Colors.danger,
                            }]} />
                          </View>
                          <Text style={styles.trendBarLabel}>W{i + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.trendCard}>
                    <Text style={styles.trendTitle}>Mood</Text>
                    <View style={styles.trendBars}>
                      {client.weeklyTrend.map((w, i) => (
                        <View key={i} style={styles.trendBarCol}>
                          <View style={styles.trendBarTrack}>
                            <View style={[styles.trendBarFill, {
                              height: `${w.mood}%`,
                              backgroundColor: w.mood >= 60 ? '#42A5F5' : w.mood >= 40 ? Colors.accentWarm : Colors.danger,
                            }]} />
                          </View>
                          <Text style={styles.trendBarLabel}>W{i + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.trendCard}>
                    <Text style={styles.trendTitle}>Risk</Text>
                    <View style={styles.trendBars}>
                      {client.weeklyTrend.map((w, i) => (
                        <View key={i} style={styles.trendBarCol}>
                          <View style={styles.trendBarTrack}>
                            <View style={[styles.trendBarFill, {
                              height: `${w.risk}%`,
                              backgroundColor: getRiskColor(w.risk),
                            }]} />
                          </View>
                          <Text style={styles.trendBarLabel}>W{i + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.trendCard}>
                    <Text style={styles.trendTitle}>Engagement</Text>
                    <View style={styles.trendBars}>
                      {client.weeklyTrend.map((w, i) => (
                        <View key={i} style={styles.trendBarCol}>
                          <View style={styles.trendBarTrack}>
                            <View style={[styles.trendBarFill, {
                              height: `${w.engagement}%`,
                              backgroundColor: Colors.primary,
                            }]} />
                          </View>
                          <Text style={styles.trendBarLabel}>W{i + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyTrends}>
                  <BarChart3 size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyTrendsText}>Not enough data for trends yet</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'reports' && (
            <>
              <View style={styles.reportHeader}>
                <Text style={styles.sectionLabel}>PROGRESS REPORTS</Text>
                <Pressable
                  style={styles.generateBtn}
                  onPress={handleGenerateReport}
                >
                  <RefreshCw size={14} color={Colors.primary} />
                  <Text style={styles.generateBtnText}>New Report</Text>
                </Pressable>
              </View>

              {reports.length === 0 ? (
                <View style={styles.emptyReports}>
                  <FileText size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyReportsText}>No reports generated yet</Text>
                  <Pressable style={styles.firstReportBtn} onPress={handleGenerateReport}>
                    <Text style={styles.firstReportBtnText}>Generate First Report</Text>
                  </Pressable>
                </View>
              ) : (
                reports.map((report) => (
                  <View key={report.id} style={styles.reportCard}>
                    <View style={styles.reportCardHeader}>
                      <View>
                        <Text style={styles.reportDate}>
                          {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                        </Text>
                        <Text style={styles.reportGenerated}>Generated {formatDate(report.generatedAt)}</Text>
                      </View>
                      <Pressable
                        style={styles.shareBtn}
                        onPress={() => handleShareReport(report)}
                        hitSlop={8}
                      >
                        <Download size={16} color={Colors.primary} />
                      </Pressable>
                    </View>

                    <Text style={styles.reportSummary}>{report.summary}</Text>

                    <View style={styles.reportMetrics}>
                      <View style={styles.reportMetric}>
                        <Text style={styles.reportMetricLabel}>Stability</Text>
                        <Text style={[styles.reportMetricValue, { color: report.stabilityAvg >= 60 ? Colors.success : Colors.accentWarm }]}>
                          {report.stabilityAvg}
                        </Text>
                      </View>
                      <View style={styles.reportMetric}>
                        <Text style={styles.reportMetricLabel}>Mood</Text>
                        <Text style={[styles.reportMetricValue, { color: report.moodAvg >= 60 ? Colors.success : Colors.accentWarm }]}>
                          {report.moodAvg}
                        </Text>
                      </View>
                      <View style={styles.reportMetric}>
                        <Text style={styles.reportMetricLabel}>Risk</Text>
                        <Text style={[styles.reportMetricValue, { color: getRiskColor(report.riskAvg) }]}>
                          {report.riskAvg}
                        </Text>
                      </View>
                      <View style={styles.reportMetric}>
                        <Text style={styles.reportMetricLabel}>Engage</Text>
                        <Text style={[styles.reportMetricValue, { color: Colors.primary }]}>{report.engagementAvg}</Text>
                      </View>
                    </View>

                    {report.highlights.length > 0 && (
                      <View style={styles.reportSection}>
                        <Text style={styles.reportSectionTitle}>Highlights</Text>
                        {report.highlights.map((h, i) => (
                          <View key={i} style={styles.reportItem}>
                            <CheckCircle size={12} color={Colors.success} />
                            <Text style={styles.reportItemText}>{h}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {report.concerns.length > 0 && (
                      <View style={styles.reportSection}>
                        <Text style={styles.reportSectionTitle}>Concerns</Text>
                        {report.concerns.map((c, i) => (
                          <View key={i} style={styles.reportItem}>
                            <AlertTriangle size={12} color={Colors.accent} />
                            <Text style={styles.reportItemText}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {report.recommendations.length > 0 && (
                      <View style={styles.reportSection}>
                        <Text style={styles.reportSectionTitle}>Recommendations</Text>
                        {report.recommendations.map((r, i) => (
                          <View key={i} style={styles.reportItem}>
                            <Target size={12} color="#42A5F5" />
                            <Text style={styles.reportItemText}>{r}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>
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
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  headerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  headerAlias: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  headerStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  riskAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  riskAlertText: {
    fontSize: 13,
    color: Colors.accent,
    flex: 1,
    lineHeight: 19,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: Colors.surface,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    width: '48%' as any,
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricCardValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  metricCardLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  metricBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  consentText: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  consentSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  consentLabel: {
    fontSize: 13,
    color: Colors.text,
  },
  actionsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  actionBtnText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  trendCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    gap: 4,
  },
  trendBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarTrack: {
    width: '80%',
    height: '85%',
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  trendBarLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  emptyTrends: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTrendsText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46,196,182,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  emptyReports: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyReportsText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  firstReportBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  firstReportBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  reportCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  reportGenerated: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  reportMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  reportMetric: {
    alignItems: 'center',
  },
  reportMetricLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  reportMetricValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  reportSection: {
    marginTop: 8,
  },
  reportSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  reportItemText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 19,
  },
});
