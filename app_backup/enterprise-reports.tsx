import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Animated,
  Platform,
  Share,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  FileText,
  Plus,
  Download,
  Share2,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  X,
  ChevronDown,
  BarChart3,
  Shield,
  Activity,
  FileBarChart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRequireProviderMode } from '@/hooks/useRequireProviderMode';
import { useEnterprise } from '@/providers/EnterpriseProvider';
import { ExportableReport, ReportFormat } from '@/types';

const FORMAT_LABELS: Record<ReportFormat, { label: string; icon: typeof FileText; color: string }> = {
  summary: { label: 'Summary', icon: FileText, color: Colors.primary },
  detailed: { label: 'Detailed', icon: FileBarChart, color: Colors.accent },
  compliance: { label: 'Compliance', icon: Shield, color: Colors.success },
  clinical: { label: 'Clinical', icon: Activity, color: '#9C7CF4' },
};

const PERIOD_OPTIONS = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: '6 Months', value: 180 },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EnterpriseReports() {
  const canAccess = useRequireProviderMode();
  const { reports, heatmapData, generateReport, currentPermissions } = useEnterprise();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('summary');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const handleGenerate = useCallback(() => {
    const clientIds = heatmapData.map(h => h.clientId);
    const report = generateReport(selectedFormat, clientIds, selectedPeriod);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowGenerate(false);
    if (report) {
      setExpandedReport(report.id);
    }
  }, [selectedFormat, selectedPeriod, heatmapData, generateReport]);

  const handleShare = useCallback(async (report: ExportableReport) => {
    const content = report.sections.map(s => `${s.title}\n${s.content}`).join('\n\n');
    const message = `${report.title}\nGenerated: ${formatDate(report.generatedAt)}\nPeriod: ${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}\n\n${content}`;

    try {
      await Share.share({ message, title: report.title });
    } catch (err) {
      console.log('[Reports] Share error:', err);
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    if (status === 'ready') return <CheckCircle size={14} color={Colors.success} />;
    if (status === 'generating') return <Clock size={14} color={Colors.accentWarm} />;
    return <AlertCircle size={14} color={Colors.danger} />;
  }, []);

  if (!canAccess) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Reports', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScreenScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Reports</Text>
              <Text style={styles.pageSubtitle}>{reports.length} report{reports.length !== 1 ? 's' : ''} generated</Text>
            </View>
            {currentPermissions.canExportReports && (
              <Pressable style={styles.generateBtn} onPress={() => setShowGenerate(true)} testID="generate-report-btn">
                <Plus size={16} color="#fff" />
                <Text style={styles.generateBtnText}>Generate</Text>
              </Pressable>
            )}
          </View>

          {reports.map(report => {
            const formatInfo = FORMAT_LABELS[report.format];
            const isExpanded = expandedReport === report.id;
            const FormatIcon = formatInfo.icon;

            return (
              <Pressable
                key={report.id}
                style={styles.reportCard}
                onPress={() => setExpandedReport(isExpanded ? null : report.id)}
                testID={`report-${report.id}`}
              >
                <View style={styles.reportHeader}>
                  <View style={[styles.formatBadge, { backgroundColor: `${formatInfo.color}20` }]}>
                    <FormatIcon size={14} color={formatInfo.color} />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>{report.title}</Text>
                    <Text style={styles.reportMeta}>
                      {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                    </Text>
                  </View>
                  <View style={styles.reportStatus}>
                    {getStatusIcon(report.status)}
                  </View>
                </View>

                <View style={styles.reportFooter}>
                  <Text style={styles.reportBy}>{report.generatedBy}</Text>
                  <Text style={styles.reportDate}>{formatDate(report.generatedAt)}</Text>
                </View>

                {isExpanded && (
                  <View style={styles.reportExpanded}>
                    {report.sections.map((section, idx) => (
                      <View key={idx} style={styles.reportSection}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                        {Object.entries(section.data).length > 0 && (
                          <View style={styles.sectionData}>
                            {Object.entries(section.data).map(([key, val]) => (
                              <View key={key} style={styles.dataItem}>
                                <Text style={styles.dataKey}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</Text>
                                <Text style={styles.dataValue}>{String(val)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}

                    <View style={styles.reportActions}>
                      <Pressable style={styles.shareBtn} onPress={() => handleShare(report)}>
                        <Share2 size={14} color={Colors.primary} />
                        <Text style={styles.shareBtnText}>Share Report</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}

          {reports.length === 0 && (
            <View style={styles.emptyState}>
              <FileText size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Reports Yet</Text>
              <Text style={styles.emptyText}>Generate your first report to track client progress and compliance across your organization.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>

      <Modal visible={showGenerate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Report</Text>
              <Pressable onPress={() => setShowGenerate(false)}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Report Type</Text>
            <View style={styles.formatGrid}>
              {(Object.keys(FORMAT_LABELS) as ReportFormat[]).map(format => {
                const info = FORMAT_LABELS[format];
                const Icon = info.icon;
                return (
                  <Pressable
                    key={format}
                    style={[styles.formatOption, selectedFormat === format && { borderColor: info.color, backgroundColor: `${info.color}10` }]}
                    onPress={() => setSelectedFormat(format)}
                  >
                    <Icon size={18} color={selectedFormat === format ? info.color : Colors.textMuted} />
                    <Text style={[styles.formatText, selectedFormat === format && { color: info.color }]}>{info.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Time Period</Text>
            <View style={styles.periodGrid}>
              {PERIOD_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[styles.periodOption, selectedPeriod === opt.value && styles.periodActive]}
                  onPress={() => setSelectedPeriod(opt.value)}
                >
                  <Text style={[styles.periodText, selectedPeriod === opt.value && styles.periodTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                This report will include {heatmapData.length} client{heatmapData.length !== 1 ? 's' : ''} over the last {selectedPeriod} days.
              </Text>
            </View>

            <Pressable style={styles.modalSubmit} onPress={handleGenerate} testID="submit-generate">
              <FileText size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Generate Report</Text>
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
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  reportCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formatBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reportMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reportStatus: {
    marginLeft: 8,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportBy: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  reportExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionData: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dataItem: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  dataKey: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 3,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 196, 182, 0.12)',
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 8,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatOption: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  formatText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  periodGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  periodActive: {
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    borderColor: Colors.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.primary,
  },
  modalInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  modalInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  modalSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
