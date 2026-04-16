import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack, useRouter } from 'expo-router';
import {
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Wind,
  Users,
  Moon,
  ChevronRight,
  X,
  Phone,
  FileText,
  Calendar,
  CircleCheck as CircleCheckIcon,
  Info,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useRequireProviderMode } from '../hooks/useRequireProviderMode';
import { useCompliance } from '../providers/ComplianceProvider';
import { ComplianceRequirement, ComplianceRequirementType } from '../types';

const REQUIREMENT_ICONS: Record<ComplianceRequirementType, typeof Shield> = {
  checkin: CheckCircle,
  breath_test: Wind,
  location_verify: MapPin,
  meeting_attendance: Users,
  curfew: Moon,
};

const REQUIREMENT_COLORS: Record<ComplianceRequirementType, string> = {
  checkin: Colors.primary,
  breath_test: '#5B9BD5',
  location_verify: '#E8A838',
  meeting_attendance: '#7B68EE',
  curfew: '#8899AA',
};

const STATUS_LABELS = {
  completed: 'Completed',
  missed: 'Missed',
  pending: 'Pending',
  excused: 'Excused',
};

function ComplianceRateRing({ rate }: { rate: number }) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [rate]);

  const rateColor = rate >= 90 ? Colors.success : rate >= 70 ? Colors.warning : Colors.danger;

  return (
    <View style={rateStyles.container}>
      <View style={[rateStyles.ring, { borderColor: rateColor + '30' }]}>
        <View style={[rateStyles.ringFill, { borderColor: rateColor }]} />
        <View style={rateStyles.innerCircle}>
          <Text style={[rateStyles.rateText, { color: rateColor }]}>{rate}%</Text>
          <Text style={rateStyles.rateLabel}>On track</Text>
        </View>
      </View>
    </View>
  );
}

const rateStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  ring: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringFill: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 70,
    borderWidth: 8,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  innerCircle: {
    alignItems: 'center',
  },
  rateText: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  rateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
});

export default function ComplianceModeScreen() {
  const router = useRouter();
  const canAccess = useRequireProviderMode();
  const {
    data,
    isEnabled,
    requirements,
    recentLogs,
    activeAlerts,
    todayProgress,
    overallComplianceRate,
    enableCompliance,
    disableCompliance,
    toggleRequirement,
    completeRequirement,
    excuseRequirement,
    dismissAlert,
  } = useCompliance();

  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [showLogDetail, setShowLogDetail] = useState<boolean>(false);
  /** Display name for this routine set (stored in legacy `caseId` field). */
  const [planName, setPlanName] = useState<string>('');
  const [showSensitive, setShowSensitive] = useState<boolean>(false);
  const [showExcuseModal, setShowExcuseModal] = useState<boolean>(false);
  const [excuseNote, setExcuseNote] = useState<string>('');
  const [excuseReqId, setExcuseReqId] = useState<string>('');
  const handleEnableCompliance = useCallback(() => {
    const label = planName.trim() || 'My routines';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 6);
    enableCompliance({
      caseId: label,
      officerName: '',
      officerPhone: '',
      courtName: '',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    });
    setShowSetup(false);
  }, [planName, enableCompliance]);

  const handleDisableCompliance = useCallback(() => {
    Alert.alert(
      'Turn off structured routines',
      'This removes your local routine checklist and history from the app. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            disableCompliance();
          },
        },
      ]
    );
  }, [disableCompliance]);

  const handleCompleteRequirement = useCallback((req: ComplianceRequirement) => {
    const today = new Date().toISOString().split('T')[0];
    const alreadyDone = recentLogs.some(
      l => l.requirementId === req.id && l.scheduledAt.startsWith(today) && (l.status === 'completed' || l.status === 'excused')
    );
    if (alreadyDone) {
      Alert.alert('Already Completed', 'This requirement has already been fulfilled for today.');
      return;
    }

    let verificationMsg = '';
    if (req.type === 'breath_test' || req.type === 'location_verify') {
      verificationMsg = '\n\nThis saves a personal note on your device only. It is not a verified medical or legal record.';
    }

    Alert.alert(
      `Mark done: ${req.title}`,
      `Log that you completed this step for yourself.${verificationMsg}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const t = new Date().toLocaleTimeString();
            let verification = '';
            if (req.type === 'breath_test') {
              verification = `Personal sobriety check-in logged at ${t} (not a device reading).`;
            } else if (req.type === 'location_verify') {
              verification = `Personal "safe here" check-in logged at ${t} (not GPS verification).`;
            }
            completeRequirement(req.id, verification);
          },
        },
      ]
    );
  }, [recentLogs, completeRequirement]);

  const handleExcuse = useCallback((req: ComplianceRequirement) => {
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        'Excuse Note',
        'Add a short note (for example, travel day or agreed change):',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: (note: string | undefined) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              excuseRequirement(req.id, note ?? 'Skipped with note');
            },
          },
        ]
      );
    } else {
      setExcuseReqId(req.id);
      setExcuseNote('');
      setShowExcuseModal(true);
    }
  }, [excuseRequirement]);

  const handleSubmitExcuse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    excuseRequirement(excuseReqId, excuseNote.trim() || 'Skipped with note');
    setShowExcuseModal(false);
    setExcuseNote('');
    setExcuseReqId('');
  }, [excuseReqId, excuseNote, excuseRequirement]);

  const isRequirementCompletedToday = useCallback((reqId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return recentLogs.some(
      l => l.requirementId === reqId && l.scheduledAt.startsWith(today) && (l.status === 'completed' || l.status === 'excused')
    );
  }, [recentLogs]);

  const todayLogForReq = useCallback((reqId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return recentLogs.find(
      l => l.requirementId === reqId && l.scheduledAt.startsWith(today)
    );
  }, [recentLogs]);

  const formattedStartDate = useMemo(() => {
    if (!data.startDate) return '';
    return new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [data.startDate]);

  const formattedEndDate = useMemo(() => {
    if (!data.endDate) return '';
    return new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [data.endDate]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!canAccess) return null;

  if (!isEnabled) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Stack.Screen options={{ title: 'Structured routines' }} />
        <ScreenScrollView contentContainerStyle={styles.disabledContent} showsVerticalScrollIndicator={false}>
          <View style={styles.disabledHero}>
            <View style={styles.shieldCircle}>
              <Shield size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.disabledTitle}>Structured routines</Text>
            <Text style={styles.disabledDesc}>
              Optional reminders and a simple checklist for people who want extra structure. Everything is a personal wellness log on this device—not supervision, not a court or medical record, and not proof for third parties.
            </Text>
          </View>

          <View style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <Lock size={16} color={Colors.primary} />
              <Text style={styles.privacyTitle}>Private to this device</Text>
            </View>
            <Text style={styles.privacyText}>
              You can turn this on or off anytime. It stays separate from the rest of the app experience. Nothing here is sent to Recovery Companion servers unless you explicitly export or share it yourself.
            </Text>
          </View>

          <View style={styles.featureList}>
            {[
              { icon: CheckCircle, label: 'Daily wellness check-in', color: Colors.primary },
              { icon: Wind, label: 'Sobriety self-check reminder', color: '#5B9BD5' },
              { icon: MapPin, label: 'Optional "safe here" note', color: '#E8A838' },
              { icon: Users, label: 'Support meeting reminder', color: '#7B68EE' },
              { icon: AlertTriangle, label: 'Gentle nudges if a step slips', color: Colors.warning },
            ].map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: item.color + '18' }]}>
                  <item.icon size={18} color={item.color} />
                </View>
                <Text style={styles.featureLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.enableBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSetup(true);
            }}
            testID="enable-compliance-btn"
          >
            <Shield size={18} color={Colors.white} />
            <Text style={styles.enableBtnText}>Set up structured routines</Text>
          </Pressable>

          <Text style={styles.footerNote}>
            You can turn this off anytime in this screen or Settings.
          </Text>
        </ScreenScrollView>

        <Modal visible={showSetup} animationType="slide" transparent onRequestClose={() => setShowSetup(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Name your routine plan</Text>
                <Pressable onPress={() => setShowSetup(false)} hitSlop={12}>
                  <X size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>
                Optional label for your checklist. Leave blank to use “My routines.” This is not a case file, officer record, or verified report.
              </Text>

              <ScreenScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>Plan name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="e.g., Morning focus, 90-day plan"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="sentences"
                  testID="routine-plan-name-input"
                />

                <Pressable
                  style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleEnableCompliance}
                  testID="confirm-setup-btn"
                >
                  <Text style={styles.setupBtnText}>Start routines</Text>
                </Pressable>
              </ScreenScrollView>
            </View>
          </View>
        </Modal>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Stack.Screen options={{ title: 'Structured routines' }} />
      <ScreenScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusHeader}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
          <Pressable
            style={styles.sensitiveToggle}
            onPress={() => {
              Haptics.selectionAsync();
              setShowSensitive(!showSensitive);
            }}
          >
            {showSensitive ? <EyeOff size={16} color={Colors.textSecondary} /> : <Eye size={16} color={Colors.textSecondary} />}
            <Text style={styles.sensitiveToggleText}>{showSensitive ? 'Hide' : 'Show'} Details</Text>
          </Pressable>
        </View>

        <ComplianceRateRing rate={overallComplianceRate} />

        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={styles.progressNumber}>{todayProgress.completed}</Text>
            <Text style={styles.progressLabel}>Done</Text>
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressItem}>
            <Text style={[styles.progressNumber, { color: todayProgress.pending > 0 ? Colors.warning : Colors.success }]}>
              {todayProgress.pending}
            </Text>
            <Text style={styles.progressLabel}>Pending</Text>
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressItem}>
            <Text style={styles.progressNumber}>{todayProgress.total}</Text>
            <Text style={styles.progressLabel}>Total</Text>
          </View>
        </View>

        {activeAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>ALERTS</Text>
            {activeAlerts.map((alert) => {
              const isUrgent = alert.type === 'missed' || alert.type === 'overdue';
              return (
                <View
                  key={alert.id}
                  style={[styles.alertCard, isUrgent && styles.alertCardUrgent]}
                >
                  <View style={styles.alertTop}>
                    <View style={[styles.alertIcon, { backgroundColor: isUrgent ? Colors.danger + '20' : Colors.warning + '20' }]}>
                      <AlertTriangle size={16} color={isUrgent ? Colors.danger : Colors.warning} />
                    </View>
                    <View style={styles.alertTextWrap}>
                      <Text style={[styles.alertTitle, isUrgent && { color: Colors.danger }]}>{alert.title}</Text>
                      <Text style={styles.alertMsg}>{alert.message}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.alertDismiss}
                    onPress={() => {
                      Haptics.selectionAsync();
                      dismissAlert(alert.id);
                    }}
                  >
                    <Text style={styles.alertDismissText}>Dismiss</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>TODAY'S STEPS</Text>
        {requirements.filter(r => r.isActive).map((req) => {
          const Icon = REQUIREMENT_ICONS[req.type];
          const color = REQUIREMENT_COLORS[req.type];
          const isDone = isRequirementCompletedToday(req.id);
          const log = todayLogForReq(req.id);

          return (
            <View key={req.id} style={[styles.requirementCard, isDone && styles.requirementCardDone]}>
              <View style={styles.reqTop}>
                <View style={[styles.reqIcon, { backgroundColor: color + '18' }]}>
                  <Icon size={20} color={isDone ? Colors.success : color} />
                </View>
                <View style={styles.reqInfo}>
                  <Text style={[styles.reqTitle, isDone && styles.reqTitleDone]}>{req.title}</Text>
                  <Text style={styles.reqDesc}>{req.description}</Text>
                  <View style={styles.reqMeta}>
                    <Clock size={12} color={Colors.textMuted} />
                    <Text style={styles.reqTime}>Due by {req.requiredTime}</Text>
                    {isDone && log && (
                      <>
                        <CircleCheckIcon size={12} color={Colors.success} />
                        <Text style={[styles.reqTime, { color: Colors.success }]}>
                          {STATUS_LABELS[log.status]}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              {!isDone && (
                <View style={styles.reqActions}>
                  <Pressable
                    style={({ pressed }) => [styles.reqCompleteBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => handleCompleteRequirement(req)}
                  >
                    <CheckCircle size={14} color={Colors.white} />
                    <Text style={styles.reqCompleteBtnText}>Complete</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.reqExcuseBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => handleExcuse(req)}
                  >
                    <Text style={styles.reqExcuseBtnText}>Excuse</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {showSensitive && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>PLAN DETAILS</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <FileText size={14} color={Colors.textMuted} />
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{data.caseId || 'My routines'}</Text>
              </View>
              {data.officerName ? (
                <>
                  <View style={styles.detailDividerLine} />
                  <View style={styles.detailRow}>
                    <Users size={14} color={Colors.textMuted} />
                    <Text style={styles.detailLabel}>Note</Text>
                    <Text style={styles.detailValue}>{data.officerName}</Text>
                  </View>
                </>
              ) : null}
              {data.officerPhone ? (
                <>
                  <View style={styles.detailDividerLine} />
                  <View style={styles.detailRow}>
                    <Phone size={14} color={Colors.textMuted} />
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{data.officerPhone}</Text>
                  </View>
                </>
              ) : null}
              {data.courtName ? (
                <>
                  <View style={styles.detailDividerLine} />
                  <View style={styles.detailRow}>
                    <Shield size={14} color={Colors.textMuted} />
                    <Text style={styles.detailLabel}>Extra</Text>
                    <Text style={styles.detailValue}>{data.courtName}</Text>
                  </View>
                </>
              ) : null}
              <View style={styles.detailDividerLine} />
              <View style={styles.detailRow}>
                <Calendar size={14} color={Colors.textMuted} />
                <Text style={styles.detailLabel}>Period</Text>
                <Text style={styles.detailValue}>{formattedStartDate} – {formattedEndDate}</Text>
              </View>
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>MANAGE REMINDERS</Text>
        {requirements.map((req) => {
          const Icon = REQUIREMENT_ICONS[req.type];
          const color = REQUIREMENT_COLORS[req.type];
          return (
            <Pressable
              key={req.id}
              style={styles.manageRow}
              onPress={() => {
                Haptics.selectionAsync();
                toggleRequirement(req.id);
              }}
            >
              <View style={styles.manageLeft}>
                <View style={[styles.manageIcon, { backgroundColor: color + '18' }]}>
                  <Icon size={16} color={req.isActive ? color : Colors.textMuted} />
                </View>
                <View>
                  <Text style={[styles.manageTitle, !req.isActive && { color: Colors.textMuted }]}>{req.title}</Text>
                  <Text style={styles.manageFreq}>{req.frequency === 'daily' ? 'Daily' : req.frequency === 'weekly' ? 'Weekly' : 'As scheduled'}</Text>
                </View>
              </View>
              <View style={[styles.toggleTrack, req.isActive && styles.toggleTrackOn]}>
                <View style={[styles.toggleThumb, req.isActive && styles.toggleThumbOn]} />
              </View>
            </Pressable>
          );
        })}

        <Pressable
          style={({ pressed }) => [styles.logHistoryBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowLogDetail(true);
          }}
        >
          <FileText size={16} color={Colors.primary} />
          <Text style={styles.logHistoryBtnText}>View Full Log History</Text>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.disableBtn, pressed && { opacity: 0.85 }]}
          onPress={handleDisableCompliance}
          testID="disable-compliance-btn"
        >
          <Text style={styles.disableBtnText}>Turn off structured routines</Text>
        </Pressable>

        <View style={styles.bottomNote}>
          <Info size={14} color={Colors.textMuted} />
          <Text style={styles.bottomNoteText}>
            Routine logs stay on this device. They are for your own reflection and planning—not legal evidence, medical records, or official reporting.
          </Text>
        </View>
      </ScreenScrollView>

      <Modal visible={showExcuseModal} animationType="fade" transparent onRequestClose={() => setShowExcuseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Excuse Note</Text>
              <Pressable onPress={() => setShowExcuseModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Provide a reason for excusing this requirement</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={excuseNote}
              onChangeText={setExcuseNote}
              placeholder="e.g., Travel day"
              placeholderTextColor={Colors.textMuted}
              multiline
              autoFocus
              testID="excuse-note-input"
            />
            <Pressable
              style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSubmitExcuse}
              testID="submit-excuse-btn"
            >
              <Text style={styles.setupBtnText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showLogDetail} animationType="slide" transparent onRequestClose={() => setShowLogDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Routine log</Text>
              <Pressable onPress={() => setShowLogDetail(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>{recentLogs.length} entries</Text>
            <ScreenScrollView showsVerticalScrollIndicator={false}>
              {recentLogs.length === 0 ? (
                <View style={styles.emptyLog}>
                  <FileText size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyLogText}>No log entries yet</Text>
                </View>
              ) : (
                recentLogs.map((log) => {
                  const req = requirements.find(r => r.id === log.requirementId);
                  const isCompleted = log.status === 'completed' || log.status === 'excused';
                  const logDate = new Date(log.completedAt);
                  return (
                    <View key={log.id} style={styles.logEntry}>
                      <View style={[styles.logDot, { backgroundColor: isCompleted ? Colors.success : Colors.danger }]} />
                      <View style={styles.logEntryContent}>
                        <Text style={styles.logEntryTitle}>{req?.title ?? log.type}</Text>
                        <Text style={styles.logEntryStatus}>
                          {STATUS_LABELS[log.status]} • {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {logDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                        {log.note ? <Text style={styles.logEntryNote}>{log.note}</Text> : null}
                        {log.verificationData ? <Text style={styles.logEntryVerify}>{log.verificationData}</Text> : null}
                      </View>
                    </View>
                  );
                })
              )}
            </ScreenScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  disabledContent: {
    padding: 24,
    paddingBottom: 100,
  },
  disabledHero: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  disabledDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  privacyCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  enableBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success + '18',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  sensitiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sensitiveToggleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  progressDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  alertsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  alertCardUrgent: {
    borderColor: Colors.danger + '40',
    backgroundColor: Colors.danger + '08',
  },
  alertTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.warning,
    marginBottom: 3,
  },
  alertMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  alertDismiss: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  alertDismissText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  requirementCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  requirementCardDone: {
    borderColor: Colors.success + '40',
    backgroundColor: Colors.success + '06',
  },
  reqTop: {
    flexDirection: 'row',
    gap: 14,
  },
  reqIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqInfo: {
    flex: 1,
  },
  reqTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  reqTitleDone: {
    color: Colors.success,
  },
  reqDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  reqMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  reqActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  reqCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  reqCompleteBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  reqExcuseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  reqExcuseBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  detailCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  detailDividerLine: {
    height: 0.5,
    backgroundColor: Colors.border,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  manageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  manageIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  manageFreq: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    backgroundColor: Colors.primary + '30',
    borderColor: Colors.primary + '50',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textMuted,
  },
  toggleThumbOn: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  logHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  logHistoryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    flex: 1,
    marginLeft: 4,
  },
  disableBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger + '10',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '25',
  },
  disableBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  bottomNoteText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  },
  inputLabel: {
    fontSize: 12,
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
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  setupBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  setupBtnDisabled: {
    opacity: 0.4,
  },
  setupBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  emptyLog: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyLogText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  logEntry: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  logEntryContent: {
    flex: 1,
  },
  logEntryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  logEntryStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  logEntryNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  logEntryVerify: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
