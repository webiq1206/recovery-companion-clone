import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Shield, Lock, Fingerprint, Eye, EyeOff, FileText, BarChart3, ChevronRight, Trash2, ShieldCheck, ShieldAlert, ShieldOff, Clock, Activity, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSecurity } from '@/providers/SecurityProvider';
import { SecurityLevel, AuditLogEntry } from '@/types';
import LockScreen from '@/components/LockScreen';

export default function SecuritySettingsScreen() {
  const {
    settings,
    biometricAvailable,
    securitySummary,
    auditLog,
    setupPIN,
    disableAuth,
    toggleBiometric,
    updateSecurityLevel,
    toggleEncryption,
    toggleAuditLogging,
    toggleAnalytics,
    lockApp,
    clearAuditLog,
    clearAnalytics,
  } = useSecurity();

  const [showPinSetup, setShowPinSetup] = useState<boolean>(false);
  const [showPinVerify, setShowPinVerify] = useState<boolean>(false);
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<string>('');

  const handleSetupPIN = useCallback(async (pin: string) => {
    await setupPIN(pin);
    setShowPinSetup(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('PIN Created', 'Your app is now protected with a PIN.');
  }, [setupPIN]);

  const handleDisableAuth = useCallback(() => {
    setPendingAction('disable_auth');
    setShowPinVerify(true);
  }, []);

  const handleVerifyForAction = useCallback(async (pin: string) => {
    const success = await disableAuth(pin);
    setShowPinVerify(false);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('PIN Removed', 'App protection has been disabled.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Incorrect PIN', 'Please try again.');
    }
    setPendingAction('');
  }, [disableAuth]);

  const handleToggleBiometric = useCallback(() => {
    Haptics.selectionAsync();
    toggleBiometric(!settings.biometricEnabled);
  }, [settings.biometricEnabled, toggleBiometric]);

  const handleSecurityLevel = useCallback((level: SecurityLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSecurityLevel(level);
  }, [updateSecurityLevel]);

  const handleLockApp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    lockApp();
  }, [lockApp]);

  const handleClearAuditLog = useCallback(() => {
    Alert.alert(
      'Clear Audit Log',
      'This will permanently delete all audit log entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAuditLog();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }, [clearAuditLog]);

  const formatTimestamp = useCallback((ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getActionColor = useCallback((entry: AuditLogEntry) => {
    if (!entry.success) return Colors.danger;
    if (entry.action.includes('auth')) return Colors.primary;
    if (entry.action.includes('delete')) return Colors.danger;
    if (entry.action.includes('change') || entry.action.includes('toggle')) return Colors.accentWarm;
    return Colors.textSecondary;
  }, []);

  const getActionLabel = useCallback((action: string) => {
    const labels: Record<string, string> = {
      'auth_success': 'Login Success',
      'auth_failure': 'Login Failed',
      'auth_lockout': 'Account Locked',
      'data_access': 'Data Accessed',
      'data_export': 'Data Exported',
      'data_delete': 'Data Deleted',
      'settings_change': 'Settings Changed',
      'consent_change': 'Consent Updated',
      'session_start': 'Session Started',
      'session_end': 'Session Ended',
      'pin_change': 'PIN Updated',
      'biometric_toggle': 'Biometric Changed',
      'encryption_toggle': 'Encryption Changed',
      'provider_access': 'Provider Access',
      'report_generated': 'Report Generated',
      'data_shared': 'Data Shared',
    };
    return labels[action] ?? action;
  }, []);

  const securityLevelOptions: { level: SecurityLevel; label: string; description: string; icon: typeof ShieldCheck }[] = [
    { level: 'standard', label: 'Standard', description: '5 min auto-lock', icon: ShieldOff },
    { level: 'enhanced', label: 'Enhanced', description: '3 min auto-lock', icon: Shield },
    { level: 'maximum', label: 'Maximum', description: '1 min auto-lock, screen capture blocked', icon: ShieldAlert },
  ];

  if (showPinSetup) {
    return (
      <LockScreen
        mode="setup"
        onUnlock={() => setShowPinSetup(false)}
        onSetupComplete={handleSetupPIN}
      />
    );
  }

  if (showPinVerify) {
    return (
      <LockScreen
        mode="verify"
        onUnlock={() => setShowPinVerify(false)}
        onVerifyComplete={handleVerifyForAction}
        title="Verify PIN"
        subtitle="Enter your current PIN to continue"
      />
    );
  }

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Shield size={28} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Security & Privacy</Text>
        <Text style={styles.headerSubtitle}>HIPAA-ready privacy controls</Text>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: settings.dataEncryptionEnabled ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.statusLabel}>Encrypted</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: settings.isAuthEnabled ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.statusLabel}>PIN Lock</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: settings.auditLoggingEnabled ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.statusLabel}>Audit Log</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>AUTHENTICATION</Text>

      {!settings.isAuthEnabled ? (
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPinSetup(true);
          }}
          testID="setup-pin-button"
        >
          <View style={styles.rowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
              <Lock size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.rowTitle}>Set Up PIN</Text>
              <Text style={styles.rowSubtitle}>Protect your recovery data</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      ) : (
        <>
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
                <Lock size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.rowTitle}>PIN Protection</Text>
                <Text style={styles.rowSubtitle}>Active</Text>
              </View>
            </View>
            <Pressable
              style={styles.removeBtn}
              onPress={handleDisableAuth}
            >
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          </View>

          {biometricAvailable && (
            <Pressable
              style={styles.settingRow}
              onPress={handleToggleBiometric}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: 'rgba(124,140,248,0.12)' }]}>
                  <Fingerprint size={18} color="#7C8CF8" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Biometric Login</Text>
                  <Text style={styles.rowSubtitle}>Face ID / Fingerprint</Text>
                </View>
              </View>
              <View style={[styles.toggle, settings.biometricEnabled && styles.toggleOn]}>
                <View style={[styles.toggleThumb, settings.biometricEnabled && styles.toggleThumbOn]} />
              </View>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.lockBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLockApp}
            testID="lock-app-button"
          >
            <Lock size={16} color={Colors.white} />
            <Text style={styles.lockBtnText}>Lock App Now</Text>
          </Pressable>
        </>
      )}

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>SECURITY LEVEL</Text>

      {securityLevelOptions.map((opt) => {
        const isSelected = settings.securityLevel === opt.level;
        const IconComp = opt.icon;
        return (
          <Pressable
            key={opt.level}
            style={[styles.levelRow, isSelected && styles.levelRowSelected]}
            onPress={() => handleSecurityLevel(opt.level)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: isSelected ? 'rgba(46,196,182,0.12)' : 'rgba(90,106,122,0.1)' }]}>
                <IconComp size={18} color={isSelected ? Colors.primary : Colors.textMuted} />
              </View>
              <View>
                <Text style={[styles.rowTitle, isSelected && { color: Colors.primary }]}>{opt.label}</Text>
                <Text style={styles.rowSubtitle}>{opt.description}</Text>
              </View>
            </View>
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        );
      })}

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>DATA PROTECTION</Text>

      <Pressable
        style={styles.settingRow}
        onPress={() => {
          Haptics.selectionAsync();
          toggleEncryption(!settings.dataEncryptionEnabled);
        }}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
            {settings.dataEncryptionEnabled ? <Eye size={18} color={Colors.success} /> : <EyeOff size={18} color={Colors.textMuted} />}
          </View>
          <View>
            <Text style={styles.rowTitle}>Data Encryption</Text>
            <Text style={styles.rowSubtitle}>Encrypt stored recovery data</Text>
          </View>
        </View>
        <View style={[styles.toggle, settings.dataEncryptionEnabled && styles.toggleOn]}>
          <View style={[styles.toggleThumb, settings.dataEncryptionEnabled && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <Pressable
        style={styles.settingRow}
        onPress={() => {
          Haptics.selectionAsync();
          toggleAuditLogging(!settings.auditLoggingEnabled);
        }}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,179,71,0.12)' }]}>
            <FileText size={18} color={Colors.accentWarm} />
          </View>
          <View>
            <Text style={styles.rowTitle}>HIPAA Audit Logging</Text>
            <Text style={styles.rowSubtitle}>Track all data access events</Text>
          </View>
        </View>
        <View style={[styles.toggle, settings.auditLoggingEnabled && styles.toggleOn]}>
          <View style={[styles.toggleThumb, settings.auditLoggingEnabled && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <Pressable
        style={styles.settingRow}
        onPress={() => {
          Haptics.selectionAsync();
          toggleAnalytics(!settings.anonymizedAnalyticsEnabled);
        }}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(66,165,245,0.12)' }]}>
            <BarChart3 size={18} color="#42A5F5" />
          </View>
          <View>
            <Text style={styles.rowTitle}>Anonymized Analytics</Text>
            <Text style={styles.rowSubtitle}>Privacy-safe usage insights</Text>
          </View>
        </View>
        <View style={[styles.toggle, settings.anonymizedAnalyticsEnabled && styles.toggleOn]}>
          <View style={[styles.toggleThumb, settings.anonymizedAnalyticsEnabled && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>AUDIT LOG</Text>

      <Pressable
        style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowAuditLog(true);
        }}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
            <Activity size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.rowTitle}>View Audit Log</Text>
            <Text style={styles.rowSubtitle}>{securitySummary.totalAuditEntries} entries recorded</Text>
          </View>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} />
      </Pressable>

      {securitySummary.totalAuditEntries > 0 && (
        <Pressable
          style={styles.dangerRow}
          onPress={handleClearAuditLog}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(239,83,80,0.12)' }]}>
              <Trash2 size={18} color={Colors.danger} />
            </View>
            <View>
              <Text style={[styles.rowTitle, { color: Colors.danger }]}>Clear Audit Log</Text>
              <Text style={styles.rowSubtitle}>Permanently delete all entries</Text>
            </View>
          </View>
        </Pressable>
      )}

      <View style={styles.complianceCard}>
        <ShieldCheck size={20} color={Colors.primary} />
        <View style={styles.complianceTextWrap}>
          <Text style={styles.complianceTitle}>HIPAA-Ready Compliance</Text>
          <Text style={styles.complianceBody}>
            All data is encrypted at rest. Audit logging tracks every access event. No personal data leaves your device without explicit consent.
          </Text>
        </View>
      </View>

      <Modal
        visible={showAuditLog}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAuditLog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Log</Text>
              <Pressable onPress={() => setShowAuditLog(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              {auditLog.length} events • Last 500 entries retained
            </Text>
            <ScreenScrollView style={styles.auditList} showsVerticalScrollIndicator={true}>
              {auditLog.length === 0 ? (
                <View style={styles.emptyState}>
                  <FileText size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No audit events yet</Text>
                </View>
              ) : (
                [...auditLog].reverse().map((entry) => (
                  <View key={entry.id} style={styles.auditEntry}>
                    <View style={[styles.auditDot, { backgroundColor: getActionColor(entry) }]} />
                    <View style={styles.auditInfo}>
                      <Text style={styles.auditAction}>{getActionLabel(entry.action)}</Text>
                      <Text style={styles.auditDetails}>{entry.details}</Text>
                      <Text style={styles.auditTime}>{formatTimestamp(entry.timestamp)}</Text>
                    </View>
                    {!entry.success && (
                      <View style={styles.failBadge}>
                        <Text style={styles.failBadgeText}>FAIL</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScreenScrollView>
          </View>
        </View>
      </Modal>
    </ScreenScrollView>
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
  headerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
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
  removeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239,83,80,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(239,83,80,0.3)',
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.danger,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  lockBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelRowSelected: {
    borderColor: Colors.primary + '50',
    backgroundColor: 'rgba(46,196,182,0.04)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(239,83,80,0.3)',
  },
  complianceCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(46,196,182,0.06)',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.15)',
  },
  complianceTextWrap: {
    flex: 1,
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  complianceBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
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
    marginBottom: 16,
  },
  auditList: {
    marginBottom: 16,
  },
  auditEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  auditInfo: {
    flex: 1,
  },
  auditAction: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  auditDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  auditTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  failBadge: {
    backgroundColor: 'rgba(239,83,80,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  failBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
