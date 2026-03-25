import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  ChevronRight,
  Check,
  Activity,
  Brain,
  Moon,
  MapPin,
  Heart,
  Zap,
  Sun,
  Sunset,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useDailyCheckInFlow } from '@/features/checkin/hooks/useDailyCheckInFlow';
import { useUser } from '@/core/domains/useUser';
import { useAppStore } from '@/stores/useAppStore';
import { mergeRecoveryProfiles } from '@/utils/mergeProfile';
import { getScoreColor, getScoreLabel } from '@/lib/services/checkInAnalysis';
import { computeDailyCheckInStabilityScore } from '@/utils/stabilityEngine';
import type { DailyCheckIn } from '@/types';
import type { CheckInTimeOfDay } from '@/features/checkin/constants/checkinMetrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80;
const THUMB_SIZE = 28;
/** Lower = thumb moves less per pixel of finger travel (finer control). */
const SLIDER_DAMPING = 0.22;

const METRIC_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  heart: Heart,
  zap: Zap,
  activity: Activity,
  moon: Moon,
  mapPin: MapPin,
  brain: Brain,
};

interface SliderMetric {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  lowLabel: string;
  highLabel: string;
}

function buildMetricsWithIcons(
  metricsConfig: { key: string; label: string; iconKey: string; color: string; lowLabel: string; highLabel: string }[],
): SliderMetric[] {
  return metricsConfig.map((m) => {
    const IconComp = METRIC_ICONS[m.iconKey] ?? Heart;
    return {
      key: m.key,
      label: m.label,
      icon: <IconComp size={18} color={m.color} />,
      color: m.color,
      lowLabel: m.lowLabel,
      highLabel: m.highLabel,
    };
  });
}

function periodWithIcon(
  config: { label: string; iconKey: string; color: string; greeting: string },
): { label: string; icon: React.ReactNode; color: string; greeting: string } {
  const IconComp = config.iconKey === 'sunset' ? Sunset : Sun;
  return {
    ...config,
    icon: <IconComp size={18} color={config.color} />,
  };
}

interface CustomSliderProps {
  metric: SliderMetric;
  value: number;
  onValueChange: (val: number) => void;
  readOnly?: boolean;
  locked?: boolean;
}

function CustomSlider({ metric, value, onValueChange, readOnly = false, locked = false }: CustomSliderProps) {
  const panX = useRef(new Animated.Value((value / 100) * SLIDER_WIDTH)).current;
  const lastValue = useRef(value);
  const isDragging = useRef(false);
  const dragStartValue = useRef(value);
  const lastHapticValue = useRef(value);
  const isDisabled = readOnly || locked;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        dragStartValue.current = lastValue.current;
        lastHapticValue.current = lastValue.current;
        panX.setOffset((dragStartValue.current / 100) * SLIDER_WIDTH);
        panX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const dampedDx = gestureState.dx * SLIDER_DAMPING;
        const startX = (dragStartValue.current / 100) * SLIDER_WIDTH;
        const newX = Math.max(0, Math.min(SLIDER_WIDTH, startX + dampedDx));
        panX.setOffset(0);
        panX.setValue(newX);
        const newVal = Math.round((newX / SLIDER_WIDTH) * 100);
        if (newVal !== lastHapticValue.current) {
          lastHapticValue.current = newVal;
          Haptics.selectionAsync();
        }
        onValueChange(newVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dampedDx = gestureState.dx * SLIDER_DAMPING;
        const startX = (dragStartValue.current / 100) * SLIDER_WIDTH;
        const finalX = Math.max(0, Math.min(SLIDER_WIDTH, startX + dampedDx));
        const finalVal = Math.round((finalX / SLIDER_WIDTH) * 100);
        lastValue.current = finalVal;
        isDragging.current = false;
        panX.flattenOffset();
        onValueChange(finalVal);
      },
    })
  ).current;

  useEffect(() => {
    if (isDragging.current) return;
    lastValue.current = value;
    lastHapticValue.current = value;
    panX.setValue((value / 100) * SLIDER_WIDTH);
  }, [value]);

  const fillWidth = panX.interpolate({
    inputRange: [0, SLIDER_WIDTH],
    outputRange: [0, SLIDER_WIDTH],
    extrapolate: 'clamp',
  });

  const thumbLeft = panX.interpolate({
    inputRange: [0, SLIDER_WIDTH],
    outputRange: [-(THUMB_SIZE / 2), SLIDER_WIDTH - (THUMB_SIZE / 2)],
    extrapolate: 'clamp',
  });

  const sliderOpacity = isDisabled ? 0.45 : 1;

  return (
    <View style={[sliderStyles.container, { opacity: sliderOpacity }]}>
      <View style={sliderStyles.labelRow}>
        <View style={sliderStyles.iconLabel}>
          {metric.icon}
          <Text style={sliderStyles.label}>{metric.label}</Text>
          {locked && <Lock size={12} color={Colors.textMuted} />}
        </View>
        <Text style={[sliderStyles.valueText, { color: locked ? Colors.textMuted : metric.color }]}>{value}</Text>
      </View>
      <View style={sliderStyles.trackContainer} {...(isDisabled ? {} : panResponder.panHandlers)}>
        <View style={sliderStyles.track}>
          <Animated.View
            style={[
              sliderStyles.fill,
              { width: fillWidth, backgroundColor: locked ? Colors.textMuted : metric.color },
            ]}
          />
        </View>
        <Animated.View
          style={[
            sliderStyles.thumb,
            {
              left: thumbLeft,
              backgroundColor: locked ? Colors.textMuted : metric.color,
              shadowColor: locked ? Colors.textMuted : metric.color,
            },
          ]}
        />
      </View>
      <View style={sliderStyles.rangeLabels}>
        <Text style={sliderStyles.rangeText}>{metric.lowLabel}</Text>
        {locked && <Text style={sliderStyles.lockedText}>From morning check-in</Text>}
        <Text style={sliderStyles.rangeText}>{metric.highLabel}</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
  },
  trackContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative' as const,
  },
  track: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute' as const,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (40 - THUMB_SIZE) / 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rangeText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  lockedText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
});

export default function DailyCheckInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUser();
  const centralProfile = useAppStore((s) => s.userProfile);
  const recoveryProfileForStability = useMemo(
    () =>
      mergeRecoveryProfiles(
        centralProfile?.recoveryProfile,
        profile?.recoveryProfile,
      ) ?? null,
    [centralProfile?.recoveryProfile, profile?.recoveryProfile],
  );
  const { period: periodParam } = useLocalSearchParams<{ period?: string }>();
  const periodOverride =
    periodParam === 'morning' || periodParam === 'afternoon' || periodParam === 'evening'
      ? periodParam
      : undefined;
  const flow = useDailyCheckInFlow({ period: periodOverride });

  const {
    METRICS_CONFIG,
    EMOTIONAL_TAGS,
    periodConfig,
    PERIOD_CONFIG,
    values,
    selectedTags,
    phase,
    submitted,
    reflection,
    emotionalNote,
    calculatedScore,
    hadNearMiss,
    nearMissNote,
    stabilityScore,
    isMorning,
    sleepLocked,
    completedPeriods,
    allPeriodsComplete,
    currentCheckInPeriod,
    currentPeriodCheckIn,
    todayCheckIns,
    resultScoreColor,
    resultScoreLabel,
    setHadNearMiss,
    setNearMissNote,
    handleValueChange,
    handleToggleTag,
    handleSubmit,
    getCheckInForPeriod,
  } = flow;

  const METRICS = useMemo(() => buildMetricsWithIcons(METRICS_CONFIG), [METRICS_CONFIG]);
  const periodConfigWithIcon = useMemo(() => periodWithIcon(periodConfig), [periodConfig]);
  const PERIOD_CONFIG_WITH_ICONS = useMemo(
    () =>
      (['morning', 'afternoon', 'evening'] as CheckInTimeOfDay[]).reduce(
        (acc, p) => {
          acc[p] = periodWithIcon(PERIOD_CONFIG[p]);
          return acc;
        },
        {} as Record<CheckInTimeOfDay, { label: string; icon: React.ReactNode; color: string; greeting: string }>,
      ),
    [PERIOD_CONFIG],
  );

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnFocus(scrollRef);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(40)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;
  const prevSubmitted = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (submitted && !prevSubmitted.current) {
      prevSubmitted.current = true;
      Animated.parallel([
        Animated.timing(resultFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(resultSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.spring(scoreScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      ]).start();
    }
    if (!submitted) prevSubmitted.current = false;
  }, [submitted]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            styles.resultContainer,
            {
              opacity: resultFade,
              transform: [{ translateY: resultSlide }],
            },
          ]}
        >
          <View style={styles.periodBadgeResult}>
            {periodConfigWithIcon.icon}
            <Text style={[styles.periodBadgeText, { color: periodConfigWithIcon.color }]}>
              {periodConfigWithIcon.label} Check-In
            </Text>
          </View>

          <Animated.View
            style={[
              styles.scoreCircle,
              {
                borderColor: resultScoreColor,
                transform: [{ scale: scoreScale }],
              },
            ]}
          >
            <Text style={[styles.scoreNumber, { color: resultScoreColor }]}>{calculatedScore}</Text>
            <Text style={[styles.scoreLabel, { color: resultScoreColor }]}>{resultScoreLabel}</Text>
          </Animated.View>

          <Text style={styles.stabilityTitle}>Check-in stability</Text>

          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionText}>{reflection}</Text>
          </View>

          {emotionalNote !== '' && (
            <View style={styles.emotionalNoteCard}>
              <Text style={styles.emotionalNoteText}>{emotionalNote}</Text>
            </View>
          )}

          <View style={styles.metricsGrid}>
            {METRICS.map((m) => (
              <View key={m.key} style={styles.metricPill}>
                {m.icon}
                <Text style={styles.metricPillLabel}>{m.label}</Text>
                <Text style={[styles.metricPillValue, { color: m.color }]}>{values[m.key]}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.doneButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={handleClose}
            testID="checkin-done"
          >
            <Check size={20} color={Colors.white} />
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (currentPeriodCheckIn || allPeriodsComplete) {
    const periods: CheckInTimeOfDay[] = ['morning', 'afternoon', 'evening'];

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeBtn} testID="checkin-close">
            <X size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Today's Check-Ins</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.periodProgressRow}>
            {periods.map((period) => {
              const completed = completedPeriods.includes(period);
              const isCurrent = period === currentCheckInPeriod;
              const config = PERIOD_CONFIG_WITH_ICONS[period];
              return (
                <View
                  key={period}
                  style={[
                    styles.periodProgressItem,
                    completed && styles.periodProgressCompleted,
                    isCurrent && !completed && styles.periodProgressCurrent,
                  ]}
                >
                  {completed ? (
                    <Check size={14} color="#2EC4B6" />
                  ) : (
                    config.icon
                  )}
                  <Text
                    style={[
                      styles.periodProgressLabel,
                      completed && styles.periodProgressLabelDone,
                    ]}
                  >
                    {config.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {allPeriodsComplete && (
            <View style={styles.readOnlyBanner}>
              <Check size={16} color="#2EC4B6" />
              <Text style={styles.readOnlyBannerText}>All check-ins complete for today</Text>
            </View>
          )}

          {!allPeriodsComplete && currentPeriodCheckIn && (
            <View style={styles.readOnlyBanner}>
              <Check size={16} color="#2EC4B6" />
              <Text style={styles.readOnlyBannerText}>
                {periodConfig.label} check-in complete
              </Text>
            </View>
          )}

          {periods.map((period) => {
            const periodCheckIn = getCheckInForPeriod(period);
            if (!periodCheckIn) return null;
            const pConfig = PERIOD_CONFIG_WITH_ICONS[period];
            const displayStabilityScore = computeDailyCheckInStabilityScore(
              {
                mood: periodCheckIn.mood,
                cravingLevel: periodCheckIn.cravingLevel,
                stress: periodCheckIn.stress,
                sleepQuality: periodCheckIn.sleepQuality,
                environment: periodCheckIn.environment,
                emotionalState: periodCheckIn.emotionalState,
              },
              recoveryProfileForStability,
            );
            const scoreColor = getScoreColor(displayStabilityScore);
            const scoreLabel = getScoreLabel(displayStabilityScore);

            return (
              <View key={period} style={styles.periodSection}>
                <View style={styles.periodSectionHeader}>
                  {pConfig.icon}
                  <Text style={styles.periodSectionTitle}>{pConfig.label}</Text>
                  <View style={[styles.periodScoreBadge, { backgroundColor: `${scoreColor}18` }]}>
                    <Text style={[styles.periodScoreBadgeText, { color: scoreColor }]}>
                      {displayStabilityScore} {scoreLabel}
                    </Text>
                  </View>
                </View>

                {periodCheckIn.reflection ? (
                  <Text style={styles.periodReflection}>{periodCheckIn.reflection}</Text>
                ) : null}

                <View style={styles.periodMetricsRow}>
                  {METRICS.map((m) => {
                    const val = periodCheckIn[m.key as keyof DailyCheckIn] as number;
                    return (
                      <View key={m.key} style={styles.periodMetricItem}>
                        {m.icon}
                        <Text style={styles.periodMetricValue}>{val}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeBtn} testID="checkin-close">
          <X size={22} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{periodConfigWithIcon.label} Check-In</Text>
        <View style={{ width: 36 }} />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.periodProgressRow}>
          {(['morning', 'afternoon', 'evening'] as CheckInTimeOfDay[]).map((period) => {
            const completed = completedPeriods.includes(period);
            const isCurrent = period === currentCheckInPeriod;
            const config = PERIOD_CONFIG_WITH_ICONS[period];
            return (
              <View
                key={period}
                style={[
                  styles.periodProgressItem,
                  completed && styles.periodProgressCompleted,
                  isCurrent && !completed && styles.periodProgressCurrent,
                ]}
              >
                {completed ? (
                  <Check size={14} color="#2EC4B6" />
                ) : (
                  config.icon
                )}
                <Text
                  style={[
                    styles.periodProgressLabel,
                    completed && styles.periodProgressLabelDone,
                    isCurrent && !completed && styles.periodProgressLabelCurrent,
                  ]}
                >
                  {config.label}
                </Text>
              </View>
            );
          })}
        </View>

        {phase === 'metrics' ? (
          <>
            <Text style={styles.prompt}>{periodConfigWithIcon.greeting}. How are you?</Text>
            <Text style={styles.promptSub}>
              {isMorning
                ? 'Slide to adjust each area. Be honest \u2014 this is just for you.'
                : 'Sleep carries over from your morning check-in. Adjust the rest.'}
            </Text>

            <View style={styles.liveScore}>
              <Text style={styles.liveScoreLabel}>Stability</Text>
              <Text style={[styles.liveScoreValue, { color: getScoreColor(stabilityScore) }]}>
                {stabilityScore}
              </Text>
            </View>

            <View style={styles.slidersContainer}>
              {METRICS.map((metric) => {
                const isSleepAndLocked = metric.key === 'sleepQuality' && sleepLocked;
                return (
                  <CustomSlider
                    key={metric.key}
                    metric={metric}
                    value={values[metric.key]}
                    onValueChange={(val) => handleValueChange(metric.key, val)}
                    locked={isSleepAndLocked}
                  />
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.tagsStepContainer}>
            <Text style={styles.prompt}>Which emotions stand out right now?</Text>
            <Text style={styles.promptSub}>
              Pick up to three. This helps your companion notice emotional patterns over time.
            </Text>

            <View style={styles.tagsGrid}>
              {EMOTIONAL_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.key);
                return (
                  <Pressable
                    key={tag.key}
                    onPress={() => handleToggleTag(tag.key)}
                    style={({ pressed }) => [
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={[styles.tagChipLabel, isSelected && styles.tagChipLabelSelected]}>
                      {tag.label}
                    </Text>
                    <Text style={[styles.tagChipHelper, isSelected && styles.tagChipHelperSelected]}>
                      {tag.helper}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.tagsFooterText}>
              You can skip this if nothing fits. Your honesty here helps the app learn when to step in supportively.
            </Text>

            <View style={styles.nearMissSection}>
              <Text style={styles.nearMissTitle}>Did cravings lead to a close call today?</Text>
              <Text style={styles.nearMissSubtitle}>
                This helps your relapse detection system treat near misses as important warning signs.
              </Text>
              <View style={styles.nearMissChoices}>
                <Pressable
                  style={({ pressed }) => [
                    styles.nearMissChoice,
                    hadNearMiss === true && styles.nearMissChoiceSelected,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => setHadNearMiss(true)}
                  testID="near-miss-yes"
                >
                  <Text
                    style={[
                      styles.nearMissChoiceText,
                      hadNearMiss === true && styles.nearMissChoiceTextSelected,
                    ]}
                  >
                    Yes, it was a close call
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.nearMissChoice,
                    hadNearMiss === false && styles.nearMissChoiceSelected,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => setHadNearMiss(false)}
                  testID="near-miss-no"
                >
                  <Text
                    style={[
                      styles.nearMissChoiceText,
                      hadNearMiss === false && styles.nearMissChoiceTextSelected,
                    ]}
                  >
                    No, cravings stayed manageable
                  </Text>
                </Pressable>
              </View>

              {hadNearMiss && (
                <View style={styles.nearMissNoteContainer}>
                  <Text style={styles.nearMissNoteLabel}>Optional note about this close call</Text>
                  <TextInput
                    style={styles.nearMissNoteInput}
                    placeholder="What was happening or what helped you hold the line?"
                    placeholderTextColor={Colors.textMuted}
                    value={nearMissNote}
                    onChangeText={setNearMissNote}
                    multiline
                    maxLength={280}
                    testID="near-miss-note"
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </Animated.ScrollView>

      <View style={[styles.submitBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.submitButton, { backgroundColor: periodConfig.color }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={handleSubmit}
          testID="checkin-submit"
        >
          <Text style={styles.submitButtonText}>
            {phase === 'metrics' ? 'Next: Tag Emotions' : `Complete ${periodConfig.label} Check-In`}
          </Text>
          <ChevronRight size={20} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 28,
  },
  periodProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  periodProgressItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodProgressCompleted: {
    backgroundColor: 'rgba(46, 196, 182, 0.08)',
    borderColor: 'rgba(46, 196, 182, 0.3)',
  },
  periodProgressCurrent: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  periodProgressLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  periodProgressLabelDone: {
    color: '#2EC4B6',
  },
  periodProgressLabelCurrent: {
    color: Colors.text,
  },
  prompt: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  promptSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  liveScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  liveScoreLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  liveScoreValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
  },
  slidersContainer: {
    gap: 4,
  },
  tagsStepContainer: {
    marginTop: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    flexBasis: '48%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  tagChipSelected: {
    backgroundColor: 'rgba(124, 140, 248, 0.12)',
    borderColor: '#7C8CF8',
  },
  tagChipLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  tagChipLabelSelected: {
    color: '#7C8CF8',
  },
  tagChipHelper: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  tagChipHelperSelected: {
    color: Colors.text,
  },
  tagsFooterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 16,
    lineHeight: 18,
  },
  nearMissSection: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  nearMissTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nearMissSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  nearMissChoices: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  nearMissChoice: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  nearMissChoiceSelected: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderColor: '#EF5350',
  },
  nearMissChoiceText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  nearMissChoiceTextSelected: {
    color: '#EF5350',
    fontWeight: '600' as const,
  },
  nearMissNoteContainer: {
    marginTop: 6,
  },
  nearMissNoteLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  nearMissNoteInput: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.cardBackground,
    color: Colors.text,
    fontSize: 13,
    textAlignVertical: 'top' as const,
  },
  submitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  periodBadgeResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  periodBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: -2,
  },
  stabilityTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  reflectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 24,
    width: '100%',
  },
  reflectionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    fontStyle: 'italic' as const,
  },
  emotionalNoteCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#7C8CF8',
    marginBottom: 24,
    width: '100%',
  },
  emotionalNoteText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 32,
    width: '100%',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  metricPillLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  metricPillValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    gap: 8,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 196, 182, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  readOnlyBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2EC4B6',
  },
  periodSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  periodSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  periodSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  periodScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodScoreBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  periodReflection: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  periodMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodMetricItem: {
    alignItems: 'center',
    gap: 4,
  },
  periodMetricValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
});
