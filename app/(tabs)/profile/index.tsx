import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Animated, TextInput, Modal } from 'react-native';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
import { User, Shield, Target, TrendingUp, Bell, BellOff, Lock, Unlock, MessageCircle, BarChart3, ChevronRight, Sparkles, Clock, Heart, AlertTriangle, Sun, Moon as MoonIcon, ShieldAlert, Award, Crown, RotateCcw, Calendar, DollarSign, BookOpen, Check, X, Scale, Gauge, PauseCircle, PlayCircle, Activity } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../../constants/colors';
import { useUser } from '../../../core/domains/useUser';
import { useAppMeta } from '../../../core/domains/useAppMeta';
import { useEngagement } from '../../../providers/EngagementProvider';
import { useSubscription } from '../../../providers/SubscriptionProvider';
import { useNotifications } from '../../../providers/NotificationProvider';
import { RecoveryStage, PrivacyControls, NotificationIntensityLevel } from '../../../types';
import { ADDICTION_TYPES } from '../../../constants/milestones';
import { NOTIFICATION_INTENSITY_CONFIG, NotificationIntensity } from '../../../constants/notifications';
import { useWizardEngineHook } from '../../../hooks/useWizardEngine';
import { resolveCanonicalRoute } from '../../../utils/legacyRoutes';


const STAGE_CONFIG: Record<RecoveryStage, { label: string; color: string; icon: string; description: string }> = {
  crisis: { label: 'Crisis', color: '#EF5350', icon: 'alert', description: 'Navigating the hardest moments' },
  stabilize: { label: 'Stabilize', color: '#FF9800', icon: 'anchor', description: 'Building a steady foundation' },
  rebuild: { label: 'Rebuild', color: '#42A5F5', icon: 'hammer', description: 'Reconstructing your life with purpose' },
  maintain: { label: 'Maintain', color: '#66BB6A', icon: 'shield', description: 'Sustaining long-term growth' },
};

const STAGE_ORDER: RecoveryStage[] = ['crisis', 'stabilize', 'rebuild', 'maintain'];

export default function ProfileScreen() {
  const { resetAllData } = useAppMeta();
  const { profile, updateProfile } = useUser();
  const { notificationPreferences, updateNotificationPrefs } = useEngagement();
  const { isPremium } = useSubscription();
  const {
    intensity,
    setIntensity,
    isPaused,
    todayNotificationCount,
    effectiveMaxPerDay,
    frequencyMultiplier,
    pauseNotifications,
    resumeNotifications,
    isPermissionGranted,
  } = useNotifications();
  const router = require('expo-router').useRouter();
  const { plan: wizardPlan } = useWizardEngineHook();
  const { setupProgress } = wizardPlan;

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [showAddictionModal, setShowAddictionModal] = useState<boolean>(false);
  const [tempAddictions, setTempAddictions] = useState<string[]>([]);
  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [tempMonth, setTempMonth] = useState<number>(new Date().getMonth());
  const [tempDay, setTempDay] = useState<number>(new Date().getDate());
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());

  const stageProgress = useRef(new Animated.Value(0)).current;

  const currentStage = profile.recoveryProfile?.recoveryStage ?? 'crisis';
  const stageConfig = STAGE_CONFIG[currentStage];
  const stageIndex = STAGE_ORDER.indexOf(currentStage);
  const stageProgressValue = ((stageIndex + 1) / STAGE_ORDER.length);

  useEffect(() => {
    Animated.timing(stageProgress, {
      toValue: stageProgressValue,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [stageProgressValue]);

  const handleTogglePrivacy = useCallback((key: keyof PrivacyControls) => {
    Haptics.selectionAsync();
    const current = profile.privacyControls ?? { isAnonymous: false, shareProgress: false, shareMood: false, allowCommunityMessages: true };
    updateProfile({
      privacyControls: { ...current, [key]: !current[key] },
    });
  }, [profile.privacyControls, updateProfile]);

  const handleStartEdit = useCallback((field: string, currentValue: string) => {
    Haptics.selectionAsync();
    setEditingField(field);
    setTempValue(currentValue);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingField) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (editingField === 'name') {
      updateProfile({ name: tempValue.trim() });
    } else if (editingField === 'dailySavings') {
      const val = parseFloat(tempValue.replace(/^\$/, '').trim());
      if (!isNaN(val) && val >= 0) {
        updateProfile({ dailySavings: Math.round(val * 100) / 100 });
      }
    } else if (editingField === 'timeSpentDaily') {
      const val = parseFloat(tempValue.trim());
      if (!isNaN(val) && val >= 0) {
        updateProfile({ timeSpentDaily: Math.round(val * 100) / 100 });
      }
    } else if (editingField === 'motivation') {
      updateProfile({ motivation: tempValue.trim() });
    }
    setEditingField(null);
  }, [editingField, tempValue, updateProfile]);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setTempValue('');
  }, []);

  const handleOpenAddictionModal = useCallback(() => {
    Haptics.selectionAsync();
    setTempAddictions([...(profile.addictions ?? [])]);
    setShowAddictionModal(true);
  }, [profile.addictions]);

  const handleToggleAddiction = useCallback((type: string) => {
    Haptics.selectionAsync();
    setTempAddictions((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleSaveAddictions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateProfile({ addictions: tempAddictions });
    setShowAddictionModal(false);
  }, [tempAddictions, updateProfile]);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 80; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const daysInSelectedMonth = useMemo(() => getDaysInMonth(tempMonth, tempYear), [tempMonth, tempYear, getDaysInMonth]);

  const handleOpenDateModal = useCallback(() => {
    Haptics.selectionAsync();
    const d = new Date(profile.soberDate);
    setTempMonth(d.getMonth());
    setTempDay(d.getDate());
    setTempYear(d.getFullYear());
    setShowDateModal(true);
  }, [profile.soberDate]);

  const handleSaveSoberDate = useCallback(() => {
    const maxDay = getDaysInMonth(tempMonth, tempYear);
    const safeDay = Math.min(tempDay, maxDay);
    const selected = new Date(tempYear, tempMonth, safeDay, 12, 0, 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selected > today) {
      Alert.alert('Invalid Date', 'Sober date cannot be in the future.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateProfile({ soberDate: selected.toISOString() });
    setShowDateModal(false);
  }, [tempMonth, tempDay, tempYear, getDaysInMonth, updateProfile]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      "You're still building. Clearing data only removes what's stored here - it doesn't change your progress. This will permanently delete all your recovery data including pledges, journal entries, and settings. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetAllData();
          },
        },
      ]
    );
  }, [resetAllData]);

  const soberDate = new Date(profile.soberDate);
  const formattedSoberDate = soberDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const progressWidth = stageProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const privacyControls = profile.privacyControls ?? { isAnonymous: false, shareProgress: false, shareMood: false, allowCommunityMessages: true };

  return (
    <ScreenScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      testID="profile-screen"
    >
      {!isPremium ? (
        <View style={styles.upgradeRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={14} color={Colors.primary} />
              <Text style={styles.upgradeTitle}>Freemium</Text>
            </View>
            <Text style={styles.upgradeSubtitle}>
              Core recovery tools are free. Compare plans or upgrade for AI, programs, and more.
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <Pressable
              style={({ pressed }) => [styles.comparePlansBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/subscription-plans' as any);
              }}
              testID="profile-compare-plans"
            >
              <Text style={styles.comparePlansBtnText}>Compare</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.upgradePremiumBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/premium-upgrade' as any);
              }}
              testID="profile-upgrade-premium"
            >
              <Crown size={14} color="#1a1a1a" />
              <Text style={styles.upgradePremiumBtnText}>Upgrade</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {setupProgress &&
        setupProgress.completedSteps < setupProgress.totalSteps &&
        setupProgress.nextStep && (
        <Pressable
          style={({ pressed }) => [
            styles.setupBanner,
            pressed && { opacity: 0.92 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const step =
              setupProgress.nextStep ?? setupProgress.remainingSteps[0];
            if (step) {
              router.push(resolveCanonicalRoute(step.route) as any);
            }
          }}
          testID="profile-setup-banner"
        >
          <View style={styles.setupProgressBar}>
            <View
              style={[
                styles.setupProgressFill,
                {
                  width: `${(setupProgress.completedSteps / setupProgress.totalSteps) * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.setupTextWrap}>
            <Text style={styles.setupTitle}>
              {setupProgress.completedSteps} of {setupProgress.totalSteps} setup steps done
            </Text>
            <Text style={styles.setupNext}>
              Next: {setupProgress.nextStep.title}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.primary} />
        </Pressable>
      )}

      {/* Recovery Stage */}
      <View style={styles.stageCard}>
        <View style={styles.stageHeaderBlock}>
          <View style={styles.stageTopRow}>
            <View style={styles.stageLabelRow}>
              <View style={[styles.stageDot, { backgroundColor: stageConfig.color }]} />
              <Text style={styles.stageTitle}>Recovery Stage</Text>
            </View>
            <View
              style={[
                styles.stageBadge,
                { backgroundColor: stageConfig.color + '20', borderColor: stageConfig.color + '40' },
              ]}
            >
              <Text style={[styles.stageBadgeText, { color: stageConfig.color }]}>{stageConfig.label}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.stageExplainedBtn, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/recovery-stages-explained' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Recovery Stages Explained"
            testID="profile-recovery-stage-explained-link"
          >
            <Text style={styles.stageExplainedBtnText}>Explained</Text>
          </Pressable>
        </View>
        <Text style={styles.stageDescription}>{stageConfig.description}</Text>
        <View style={styles.stageProgressTrack}>
          <Animated.View style={[styles.stageProgressFill, { width: progressWidth, backgroundColor: stageConfig.color }]} />
        </View>
        <View style={styles.stageSteps}>
          {STAGE_ORDER.map((s, i) => {
            const isActive = i <= stageIndex;
            const config = STAGE_CONFIG[s];
            return (
              <View key={s} style={styles.stageStep}>
                <View style={[styles.stageStepDot, isActive && { backgroundColor: config.color, borderColor: config.color }]} />
                <Text style={[styles.stageStepLabel, isActive && { color: Colors.text }]}>{config.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Profile Details */}
      <Text style={styles.sectionLabel}>PROFILE DETAILS</Text>

      {editingField === 'name' ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={tempValue}
            onChangeText={setTempValue}
            autoFocus
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            maxLength={30}
          />
          <View style={styles.editActions}>
            <Pressable onPress={handleCancelEdit} style={styles.editCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.editSave}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.settingRow} onPress={() => handleStartEdit('name', profile.name)}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
              <User size={17} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Name</Text>
              <Text style={styles.settingValue}>{profile.name || 'Not set'}</Text>
            </View>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      <Pressable style={styles.settingRow} onPress={handleOpenAddictionModal}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,107,53,0.12)' }]}>
            <Shield size={17} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Recovery Types</Text>
            <Text style={styles.settingValue} numberOfLines={2}>
              {profile.addictions?.length > 0 ? profile.addictions.join(', ') : 'Not set'}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      <Pressable style={styles.settingRow} onPress={handleOpenDateModal}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
            <Calendar size={17} color={Colors.success} />
          </View>
          <View>
            <Text style={styles.settingLabel}>Sober Date</Text>
            <Text style={styles.settingValue}>{formattedSoberDate}</Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      {editingField === 'dailySavings' ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={tempValue}
            onChangeText={setTempValue}
            autoFocus
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.editActions}>
            <Pressable onPress={handleCancelEdit} style={styles.editCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.editSave}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.settingRow} onPress={() => handleStartEdit('dailySavings', String(profile.dailySavings))}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,179,71,0.12)' }]}>
              <DollarSign size={17} color={Colors.accentWarm} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Money Spent Daily</Text>
              <Text style={styles.settingValue}>${profile.dailySavings.toFixed(2)}/day</Text>
            </View>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      {editingField === 'timeSpentDaily' ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={tempValue}
            onChangeText={setTempValue}
            autoFocus
            keyboardType="decimal-pad"
            placeholder="e.g. 2"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.editActions}>
            <Pressable onPress={handleCancelEdit} style={styles.editCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.editSave}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.settingRow}
          onPress={() =>
            handleStartEdit('timeSpentDaily', String(profile.timeSpentDaily ?? 0))
          }
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
              <Clock size={17} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Time Spent Daily</Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {(() => {
                  const n = Math.round(Math.max(0, profile.timeSpentDaily ?? 0) * 100) / 100;
                  const s = n.toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0,
                  });
                  const unit = n === 1 ? 'hour' : 'hours';
                  return `${s} ${unit}/day`;
                })()}
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      {editingField === 'motivation' ? (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.editInput, { minHeight: 60 }]}
            value={tempValue}
            onChangeText={setTempValue}
            autoFocus
            multiline
            placeholder="Your motivation"
            placeholderTextColor={Colors.textMuted}
            maxLength={200}
          />
          <View style={styles.editActions}>
            <Pressable onPress={handleCancelEdit} style={styles.editCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.editSave}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.settingRow} onPress={() => handleStartEdit('motivation', profile.motivation)}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(239,83,80,0.12)' }]}>
              <Heart size={17} color={Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Motivation</Text>
              <Text style={styles.settingValue} numberOfLines={2}>{profile.motivation || 'Not set'}</Text>
            </View>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>HELP</Text>

      <Pressable
        style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/how-to-use' as any);
        }}
        testID="how-to-use-link"
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(46,196,182,0.12)' }]}>
            <BookOpen size={17} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.settingLabel}>How to Use Recovery Companion</Text>
            <Text style={styles.settingValue}>Daily flow, scores, and guides</Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/insights' as any);
        }}
        testID="insights-hub-link"
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(66,165,245,0.12)' }]}>
            <BarChart3 size={17} color="#42A5F5" />
          </View>
          <View>
            <Text style={styles.settingLabel}>Growth Insights</Text>
            <Text style={styles.settingValue}>Recovery and retention insights in one place</Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/tools' as any);
        }}
        testID="tools-link"
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(171,71,188,0.12)' }]}>
            <Sparkles size={17} color="#AB47BC" />
          </View>
          <View>
            <Text style={styles.settingLabel}>Quick Coping Tools</Text>
            <Text style={styles.settingValue}>Breathing, urge timer, and quick coping tools</Text>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </Pressable>

      <View style={styles.bottomSpacer} />

      {/* Addiction Modal */}
      <Modal
        visible={showAddictionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddictionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Recovery Types</Text>
              <Pressable onPress={() => setShowAddictionModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Select all that apply</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
              {ADDICTION_TYPES.map((type) => {
                const isSelected = tempAddictions.includes(type);
                return (
                  <Pressable
                    key={type}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => handleToggleAddiction(type)}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {type}
                    </Text>
                    {isSelected && (
                      <View style={styles.modalCheckCircle}>
                        <Check size={14} color={Colors.white} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={[styles.modalSaveBtn, tempAddictions.length === 0 && styles.modalSaveBtnDisabled]}
              onPress={handleSaveAddictions}
              disabled={tempAddictions.length === 0}
            >
              <Text style={styles.modalSaveBtnText}>
                Save ({tempAddictions.length} selected)
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sober Date</Text>
              <Pressable onPress={() => setShowDateModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Choose your sobriety start date</Text>

            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Month</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
                  {MONTHS.map((m, idx) => (
                    <Pressable
                      key={m}
                      style={[styles.datePickerItem, tempMonth === idx && styles.datePickerItemSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTempMonth(idx);
                        const maxDay = getDaysInMonth(idx, tempYear);
                        if (tempDay > maxDay) setTempDay(maxDay);
                      }}
                    >
                      <Text style={[styles.datePickerItemText, tempMonth === idx && styles.datePickerItemTextSelected]}>
                        {m.slice(0, 3)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Day</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.datePickerItem, tempDay === d && styles.datePickerItemSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTempDay(d);
                      }}
                    >
                      <Text style={[styles.datePickerItemText, tempDay === d && styles.datePickerItemTextSelected]}>
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Year</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
                  {yearOptions.map((y) => (
                    <Pressable
                      key={y}
                      style={[styles.datePickerItem, tempYear === y && styles.datePickerItemSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTempYear(y);
                        const maxDay = getDaysInMonth(tempMonth, y);
                        if (tempDay > maxDay) setTempDay(maxDay);
                      }}
                    >
                      <Text style={[styles.datePickerItemText, tempYear === y && styles.datePickerItemTextSelected]}>
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.datePreview}>
              <Calendar size={16} color={Colors.primary} />
              <Text style={styles.datePreviewText}>
                {MONTHS[tempMonth]} {tempDay}, {tempYear}
              </Text>
            </View>

            <Pressable style={styles.modalSaveBtn} onPress={handleSaveSoberDate}>
              <Text style={styles.modalSaveBtnText}>Save Date</Text>
            </Pressable>
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
    paddingBottom: 120,
  },
  setupBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: 16,
    gap: 12,
  },
  setupProgressBar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  setupProgressFill: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
  },
  setupTextWrap: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  setupNext: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  stageCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  stageHeaderBlock: {
    marginBottom: 6,
    gap: 10,
  },
  stageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  stageExplainedBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primary + '14',
    borderWidth: 0.5,
    borderColor: Colors.primary + '30',
  },
  stageExplainedBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  stageLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  stageBadge: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  stageBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stageDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  stageProgressTrack: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stageProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stageSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageStep: {
    alignItems: 'center',
    gap: 4,
  },
  stageStepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  stageStepLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    width: '48%' as any,
    flexGrow: 1,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  insightCardWithButton: {
    position: 'relative',
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  growthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 14,
  },
  growthScoreExplainedBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primary + '14',
    borderWidth: 0.5,
    borderColor: Colors.primary + '30',
  },
  growthScoreExplainedBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  growthLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    width: 90,
  },
  growthBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  growthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  growthScore: {
    fontSize: 12,
    fontWeight: '700' as const,
    width: 28,
    textAlign: 'right' as const,
  },
  goalsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  goalBullet: {
    marginTop: 1,
  },
  goalText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
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
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  editRow: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editInput: {
    color: Colors.text,
    fontSize: 15,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editSave: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  saveText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600' as const,
  },
  groupCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  groupRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  groupSeparator: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212,165,116,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  comparePlansBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  comparePlansBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  upgradePremiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#D4A574',
  },
  upgradePremiumBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1a1a1a',
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
  intensityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  intensityOption: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  intensityOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.08)',
  },
  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  intensityLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  intensityLabelActive: {
    color: Colors.primary,
  },
  intensityBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
    marginBottom: 4,
  },
  intensityDescActive: {
    color: Colors.textSecondary,
  },
  intensityLimit: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  frequencyInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  frequencyText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bottomSpacer: {
    height: 20,
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
  modalList: {
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modalItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46,196,182,0.1)',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  modalItemTextSelected: {
    color: Colors.primary,
  },
  modalCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  datePickerColumn: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  datePickerScroll: {
    height: 200,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  datePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 1,
  },
  datePickerItemSelected: {
    backgroundColor: Colors.primary + '20',
  },
  datePickerItemText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  datePickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  datePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.primary + '30',
  },
  datePreviewText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
});
