import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  BarChart3,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useRequireProviderMode } from '@/hooks/useRequireProviderMode';
import { useEnterprise } from '@/providers/EnterpriseProvider';
import { EngagementHeatmapData, ComplianceSummary } from '@/types';

type ViewMode = 'heatmap' | 'compliance';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getHeatColor(score: number): string {
  if (score >= 80) return '#2EC4B6';
  if (score >= 60) return '#3DA89E';
  if (score >= 40) return '#FFB347';
  if (score >= 20) return '#FF8C42';
  if (score > 0) return '#EF5350';
  return 'rgba(255,255,255,0.04)';
}

function getComplianceColor(status: string): string {
  if (status === 'compliant') return Colors.success;
  if (status === 'at_risk') return Colors.accentWarm;
  return Colors.danger;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EnterpriseHeatmaps() {
  const canAccess = useRequireProviderMode();
  const { heatmapData, complianceSummaries } = useEnterprise();
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const toggleExpand = useCallback((clientId: string) => {
    setExpandedClient(prev => prev === clientId ? null : clientId);
  }, []);

  const overallAvgEngagement = useMemo(() => {
    if (heatmapData.length === 0) return 0;
    return Math.round(heatmapData.reduce((s, h) => {
      const avg = h.weekData.reduce((ws, w) => ws + w.engagementScore, 0) / h.weekData.length;
      return s + avg;
    }, 0) / heatmapData.length);
  }, [heatmapData]);

  const overallAvgCompliance = useMemo(() => {
    if (complianceSummaries.length === 0) return 0;
    return Math.round(complianceSummaries.reduce((s, c) => s + c.overallRate, 0) / complianceSummaries.length);
  }, [complianceSummaries]);

  const renderHeatmapGrid = useCallback((clientData: EngagementHeatmapData) => {
    const weeks: Array<typeof clientData.weekData> = [];
    for (let i = 0; i < clientData.weekData.length; i += 7) {
      weeks.push(clientData.weekData.slice(i, i + 7));
    }

    return (
      <View style={styles.heatmapContainer}>
        <View style={styles.dayLabels}>
          {DAYS.map((day, i) => (
            <Text key={i} style={styles.dayLabel}>{day}</Text>
          ))}
        </View>
        <View style={styles.heatGrid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.heatWeek}>
              {week.map((day, di) => (
                <View
                  key={di}
                  style={[styles.heatCell, { backgroundColor: getHeatColor(day.engagementScore) }]}
                >
                  {day.checkIns > 0 && (
                    <Text style={styles.heatCellText}>{day.checkIns}</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.heatLegend}>
          <Text style={styles.legendLabel}>Low</Text>
          <View style={[styles.legendDot, { backgroundColor: '#EF5350' }]} />
          <View style={[styles.legendDot, { backgroundColor: '#FF8C42' }]} />
          <View style={[styles.legendDot, { backgroundColor: '#FFB347' }]} />
          <View style={[styles.legendDot, { backgroundColor: '#3DA89E' }]} />
          <View style={[styles.legendDot, { backgroundColor: '#2EC4B6' }]} />
          <Text style={styles.legendLabel}>High</Text>
        </View>
      </View>
    );
  }, []);

  const renderClientMetrics = useCallback((clientData: EngagementHeatmapData) => {
    const recent = clientData.weekData.slice(-7);
    const avgEngagement = Math.round(recent.reduce((s, d) => s + d.engagementScore, 0) / recent.length);
    const avgMood = Math.round(recent.reduce((s, d) => s + d.moodAvg, 0) / recent.length);
    const avgRisk = Math.round(recent.reduce((s, d) => s + d.riskLevel, 0) / recent.length);
    const totalCheckins = recent.reduce((s, d) => s + d.checkIns, 0);

    const prev = clientData.weekData.slice(-14, -7);
    const prevAvg = prev.length > 0 ? Math.round(prev.reduce((s, d) => s + d.engagementScore, 0) / prev.length) : avgEngagement;
    const trend = avgEngagement - prevAvg;

    return (
      <View style={styles.clientMetrics}>
        <View style={styles.miniMetric}>
          <Text style={styles.miniMetricLabel}>Engagement</Text>
          <View style={styles.miniMetricRow}>
            <Text style={[styles.miniMetricValue, { color: getHeatColor(avgEngagement) }]}>{avgEngagement}%</Text>
            {trend > 2 ? <TrendingUp size={12} color={Colors.success} /> :
             trend < -2 ? <TrendingDown size={12} color={Colors.danger} /> :
             <Minus size={12} color={Colors.textMuted} />}
          </View>
        </View>
        <View style={styles.miniMetric}>
          <Text style={styles.miniMetricLabel}>Mood</Text>
          <Text style={[styles.miniMetricValue, { color: getHeatColor(avgMood) }]}>{avgMood}</Text>
        </View>
        <View style={styles.miniMetric}>
          <Text style={styles.miniMetricLabel}>Risk</Text>
          <Text style={[styles.miniMetricValue, { color: getHeatColor(100 - avgRisk) }]}>{avgRisk}</Text>
        </View>
        <View style={styles.miniMetric}>
          <Text style={styles.miniMetricLabel}>Check-ins</Text>
          <Text style={[styles.miniMetricValue, { color: Colors.primary }]}>{totalCheckins}</Text>
        </View>
      </View>
    );
  }, []);

  if (!canAccess) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Analytics', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScreenScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'heatmap' && styles.toggleActive]}
              onPress={() => setViewMode('heatmap')}
            >
              <BarChart3 size={15} color={viewMode === 'heatmap' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.toggleText, viewMode === 'heatmap' && styles.toggleTextActive]}>Heatmaps</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'compliance' && styles.toggleActive]}
              onPress={() => setViewMode('compliance')}
            >
              <Shield size={15} color={viewMode === 'compliance' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.toggleText, viewMode === 'compliance' && styles.toggleTextActive]}>Compliance</Text>
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{viewMode === 'heatmap' ? 'Avg Engagement' : 'Avg Compliance'}</Text>
              <Text style={[styles.summaryValue, { color: getHeatColor(viewMode === 'heatmap' ? overallAvgEngagement : overallAvgCompliance) }]}>
                {viewMode === 'heatmap' ? overallAvgEngagement : overallAvgCompliance}%
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Clients</Text>
              <Text style={[styles.summaryValue, { color: Colors.primary }]}>{heatmapData.length}</Text>
            </View>
            {viewMode === 'compliance' && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Non-Compliant</Text>
                <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                  {complianceSummaries.filter(c => c.status === 'non_compliant').length}
                </Text>
              </View>
            )}
          </View>

          {viewMode === 'heatmap' ? (
            heatmapData.map(client => (
              <Pressable
                key={client.clientId}
                style={styles.clientCard}
                onPress={() => toggleExpand(client.clientId)}
                testID={`heatmap-${client.clientId}`}
              >
                <View style={styles.clientHeader}>
                  <View style={styles.clientNameRow}>
                    <Activity size={16} color={Colors.primary} />
                    <Text style={styles.clientName}>{client.clientName}</Text>
                  </View>
                  {expandedClient === client.clientId ? (
                    <ChevronUp size={18} color={Colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={Colors.textMuted} />
                  )}
                </View>
                {renderClientMetrics(client)}
                {expandedClient === client.clientId && renderHeatmapGrid(client)}
              </Pressable>
            ))
          ) : (
            complianceSummaries.map(summary => (
              <View key={summary.clientId} style={styles.complianceCard} testID={`compliance-${summary.clientId}`}>
                <View style={styles.complianceHeader}>
                  <Text style={styles.clientName}>{summary.clientName}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${getComplianceColor(summary.status)}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: getComplianceColor(summary.status) }]} />
                    <Text style={[styles.statusText, { color: getComplianceColor(summary.status) }]}>
                      {summary.status === 'compliant' ? 'Compliant' : summary.status === 'at_risk' ? 'At Risk' : 'Non-Compliant'}
                    </Text>
                  </View>
                </View>

                <View style={styles.complianceBarWrap}>
                  <View style={styles.complianceBarBg}>
                    <View style={[styles.complianceBarFill, {
                      width: `${summary.overallRate}%`,
                      backgroundColor: getComplianceColor(summary.status),
                    }]} />
                  </View>
                  <Text style={styles.compliancePercent}>{summary.overallRate}%</Text>
                </View>

                <View style={styles.complianceDetails}>
                  <View style={styles.complianceDetail}>
                    <Text style={styles.detailLabel}>Completed</Text>
                    <Text style={styles.detailValue}>{summary.completedRequirements}/{summary.totalRequirements}</Text>
                  </View>
                  <View style={styles.complianceDetail}>
                    <Text style={styles.detailLabel}>Missed</Text>
                    <Text style={[styles.detailValue, { color: summary.missedCount > 5 ? Colors.danger : Colors.text }]}>{summary.missedCount}</Text>
                  </View>
                  <View style={styles.complianceDetail}>
                    <Text style={styles.detailLabel}>Streak</Text>
                    <Text style={styles.detailValue}>{summary.currentStreak}d</Text>
                  </View>
                  <View style={styles.complianceDetail}>
                    <Text style={styles.detailLabel}>Last</Text>
                    <Text style={styles.detailValue}>{formatDate(summary.lastComplianceAt)}</Text>
                  </View>
                </View>
              </View>
            ))
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  clientCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  clientMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  miniMetric: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  miniMetricLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  miniMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniMetricValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  heatmapContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingLeft: 0,
  },
  dayLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    width: 28,
    textAlign: 'center' as const,
  },
  heatGrid: {
    gap: 3,
  },
  heatWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 3,
  },
  heatCell: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatCellText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  legendLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  complianceCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  complianceBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  complianceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  complianceBarFill: {
    height: 8,
    borderRadius: 4,
  },
  compliancePercent: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    width: 45,
    textAlign: 'right' as const,
  },
  complianceDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  complianceDetail: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
});
