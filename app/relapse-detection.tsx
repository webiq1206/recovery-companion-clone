import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  Clock,
  Activity,
  AlertTriangle,
  ChevronRight,
  Heart,
  Brain,
  Zap,
  Eye,
  RefreshCw,
  Sun,
  Sunset,
  CloudMoon,
  Info,
  CheckCircle,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRiskPrediction } from '@/providers/RiskPredictionProvider';
import { RiskAlert, RiskCategory } from '@/types';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { resolveCanonicalRoute } from '@/utils/legacyRoutes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_SIZE = 180;
const GAUGE_STROKE = 14;
const HISTORY_BAR_WIDTH = Math.floor((SCREEN_WIDTH - 80) / 7);

function CategoryBadge({ category }: { category: RiskCategory }) {
  const configs: Record<RiskCategory, { bg: string; fg: string; label: string }> = {
    low: { bg: '#43A04718', fg: '#43A047', label: 'LOW' },
    guarded: { bg: '#FDD83518', fg: '#F9A825', label: 'GUARDED' },
    elevated: { bg: '#FB8C0018', fg: '#FB8C00', label: 'ELEVATED' },
    high: { bg: '#E5393518', fg: '#E53935', label: 'HIGH' },
  };
  const cfg = configs[category];
  return (
    <View style={[categoryStyles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[categoryStyles.dot, { backgroundColor: cfg.fg }]} />
      <Text style={[categoryStyles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

function RiskGauge({ score, color, label }: { score: number; color: string; label: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animVal, {
      toValue: score,
      useNativeDriver: false,
      tension: 25,
      friction: 12,
    }).start();
  }, [score]);

  useEffect(() => {
    if (score >= 60) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [score]);

  const rotation = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: ['-135deg', '135deg'],
  });

  return (
    <Animated.View style={[gaugeStyles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={gaugeStyles.outerRing}>
        <View style={[gaugeStyles.glowRing, { borderColor: color + '30' }]} />
        <View style={gaugeStyles.innerCircle}>
          <Text style={[gaugeStyles.score, { color }]}>{score}</Text>
          <Text style={gaugeStyles.outOf}>/100</Text>
          <Text style={[gaugeStyles.label, { color }]}>{label}</Text>
        </View>
        <View style={gaugeStyles.tickContainer}>
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = -135 + (tick / 100) * 270;
            const rad = (angle * Math.PI) / 180;
            const radius = GAUGE_SIZE / 2 - 4;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const tickColor = tick <= 25 ? '#4CAF50' : tick <= 50 ? '#FFC107' : tick <= 75 ? '#FF9800' : '#EF5350';
            return (
              <View
                key={tick}
                style={[
                  gaugeStyles.tick,
                  {
                    left: GAUGE_SIZE / 2 + x - 2,
                    top: GAUGE_SIZE / 2 + y - 2,
                    backgroundColor: tickColor,
                  },
                ]}
              />
            );
          })}
        </View>
        <Animated.View
          style={[
            gaugeStyles.needle,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <View style={[gaugeStyles.needleLine, { backgroundColor: color }]} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function FactorBar({ label, value, color, maxValue = 100 }: { label: string; value: number; color: string; maxValue?: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(value / maxValue, 1),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const width = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={factorStyles.row}>
      <Text style={factorStyles.label}>{label}</Text>
      <View style={factorStyles.barOuter}>
        <Animated.View style={[factorStyles.barFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={[factorStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

function TimeOfDayCard({ riskByPeriod, highRiskPeriod }: { riskByPeriod: Record<string, number>; highRiskPeriod: string }) {
  const periods = [
    { key: 'morning', label: 'Morning', icon: Sun, hours: '5am–12pm' },
    { key: 'afternoon', label: 'Afternoon', icon: Sunset, hours: '12pm–5pm' },
    { key: 'evening', label: 'Evening', icon: CloudMoon, hours: '5pm–9pm' },
    { key: 'night', label: 'Night', icon: Moon, hours: '9pm–5am' },
  ];

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <Clock size={16} color="#7C8CF8" />
        <Text style={cardStyles.cardTitle}>Risk by Time of Day</Text>
      </View>
      <Text style={cardStyles.cardSubtitle}>Based on when cravings tend to spike</Text>
      <View style={todStyles.grid}>
        {periods.map((p) => {
          const risk = riskByPeriod[p.key] ?? 0;
          const isHighRisk = p.key === highRiskPeriod && risk > 30;
          const barColor = risk <= 25 ? '#4CAF50' : risk <= 50 ? '#FFC107' : risk <= 75 ? '#FF9800' : '#EF5350';
          const IconComp = p.icon;
          return (
            <View key={p.key} style={[todStyles.period, isHighRisk && todStyles.periodHighlight]}>
              <View style={[todStyles.iconWrap, { backgroundColor: isHighRisk ? barColor + '20' : Colors.surface }]}>
                <IconComp size={16} color={isHighRisk ? barColor : Colors.textMuted} />
              </View>
              <Text style={todStyles.periodLabel}>{p.label}</Text>
              <View style={todStyles.miniBarOuter}>
                <View style={[todStyles.miniBarFill, { height: `${Math.max(risk, 5)}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={[todStyles.periodValue, { color: barColor }]}>{risk}</Text>
              {isHighRisk && (
                <View style={[todStyles.highRiskBadge, { backgroundColor: barColor + '20' }]}>
                  <Text style={[todStyles.highRiskText, { color: barColor }]}>Peak</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SleepCard({ score, trend }: { score: number; trend: 'improving' | 'declining' | 'stable' }) {
  const trendColor = trend === 'improving' ? '#4CAF50' : trend === 'declining' ? '#EF5350' : Colors.textMuted;
  const trendLabel = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable';
  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'declining' ? TrendingUp : Minus;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <Moon size={16} color="#7C8CF8" />
        <Text style={cardStyles.cardTitle}>Sleep Disruption</Text>
        <View style={[sleepStyles.trendBadge, { backgroundColor: trendColor + '18' }]}>
          <TrendIcon size={12} color={trendColor} />
          <Text style={[sleepStyles.trendText, { color: trendColor }]}>{trendLabel}</Text>
        </View>
      </View>
      <View style={sleepStyles.content}>
        <View style={sleepStyles.scoreCircle}>
          <Text style={[sleepStyles.scoreValue, { color: score <= 30 ? '#4CAF50' : score <= 60 ? '#FFC107' : '#EF5350' }]}>{score}</Text>
          <Text style={sleepStyles.scoreLabel}>disruption</Text>
        </View>
        <View style={sleepStyles.info}>
          <Text style={sleepStyles.infoText}>
            {score <= 30
              ? 'Your sleep patterns are supporting your recovery well. Good rest builds resilience.'
              : score <= 60
              ? 'Sleep quality has room for improvement. Better rest can strengthen your defenses.'
              : 'Sleep disruption is elevated. Poor sleep increases vulnerability - prioritize rest tonight.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function RiskHistoryChart({ predictions }: { predictions: Array<{ overallRisk: number; generatedAt: string }> }) {
  const [showExplained, setShowExplained] = useState(false);
  const data = useMemo(() => {
    return predictions.slice(0, 7).reverse();
  }, [predictions]);

  if (data.length < 2) {
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <Activity size={16} color={Colors.primary} />
          <Text style={cardStyles.cardTitle}>Risk History</Text>
          <View style={cardStyles.headerSpacer} />
          <Pressable
            style={historyStyles.explainedBtn}
            onPress={() => setShowExplained(true)}
            testID="risk-history-explained-button"
          >
            <Text style={historyStyles.explainedBtnText}>Explained</Text>
          </Pressable>
        </View>
        <View style={historyStyles.empty}>
          <Text style={historyStyles.emptyText}>Complete more check-ins to see risk trends over time</Text>
        </View>
        <Modal
          visible={showExplained}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExplained(false)}
        >
          <Pressable style={historyStyles.modalBackdrop} onPress={() => setShowExplained(false)}>
            <Pressable style={historyStyles.modalCard} onPress={() => {}}>
              <Text style={historyStyles.modalTitle}>Risk History Explained</Text>
              <Text style={historyStyles.modalBody}>
                {'~ Risk History under Trend is NOT strictly once per day.\n'}
                {'~ A new history point is added:\n'}
                {'            ~ manually via Refresh Analysis button\n'}
                {'      or automatically when:\n'}
                {'            ~ last analysis is older than ~1 hour, or\n'}
                {'            ~ there is a newer check-in than the last analysis timestamp\n'}
                {'~ So in practice, it can update multiple times in a day if there are new check-ins or manual refreshes.'}
              </Text>
              <Pressable style={historyStyles.modalCloseBtn} onPress={() => setShowExplained(false)}>
                <Text style={historyStyles.modalCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  const maxRisk = Math.max(...data.map(d => d.overallRisk), 50);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <Activity size={16} color={Colors.primary} />
        <Text style={cardStyles.cardTitle}>Risk History</Text>
        <View style={cardStyles.headerSpacer} />
        <Pressable
          style={historyStyles.explainedBtn}
          onPress={() => setShowExplained(true)}
          testID="risk-history-explained-button"
        >
          <Text style={historyStyles.explainedBtnText}>Explained</Text>
        </Pressable>
      </View>
      <Text style={cardStyles.cardSubtitle}>Risk scores over recent check-ins</Text>
      <View style={historyStyles.chartWrap}>
        <View style={historyStyles.yAxis}>
          <Text style={historyStyles.yLabel}>{maxRisk}</Text>
          <Text style={historyStyles.yLabel}>{Math.round(maxRisk / 2)}</Text>
          <Text style={historyStyles.yLabel}>0</Text>
        </View>
        <View style={historyStyles.bars}>
          {data.map((d, i) => {
            const height = Math.max((d.overallRisk / maxRisk) * 80, 4);
            const barColor = d.overallRisk <= 25 ? '#4CAF50' : d.overallRisk <= 50 ? '#FFC107' : d.overallRisk <= 75 ? '#FF9800' : '#EF5350';
            const dateLabel = new Date(d.generatedAt).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
            return (
              <View key={i} style={historyStyles.barCol}>
                <View style={historyStyles.barWrap}>
                  <View style={[historyStyles.bar, { height, backgroundColor: barColor }]} />
                </View>
                <Text style={historyStyles.barLabel}>{i === data.length - 1 ? 'Now' : dateLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <Modal
        visible={showExplained}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplained(false)}
      >
        <Pressable style={historyStyles.modalBackdrop} onPress={() => setShowExplained(false)}>
          <Pressable style={historyStyles.modalCard} onPress={() => {}}>
            <Text style={historyStyles.modalTitle}>Risk History Explained</Text>
            <Text style={historyStyles.modalBody}>
              {'~ Risk History under Trend is NOT strictly once per day.\n'}
              {'~ A new history point is added:\n'}
              {'            ~ manually via Refresh Analysis button\n'}
              {'      or automatically when:\n'}
              {'            ~ last analysis is older than ~1 hour, or\n'}
              {'            ~ there is a newer check-in than the last analysis timestamp\n'}
              {'~ So in practice, it can update multiple times in a day if there are new check-ins or manual refreshes.'}
            </Text>
            <Pressable style={historyStyles.modalCloseBtn} onPress={() => setShowExplained(false)}>
              <Text style={historyStyles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function AlertCard({ alert, onDismiss, onAct }: { alert: RiskAlert; onDismiss: () => void; onAct: () => void }) {
  const router = useRouter();
  const severityColor = alert.severity === 'critical' ? '#EF5350'
    : alert.severity === 'warning' ? '#FF9800'
    : alert.severity === 'caution' ? '#FFC107'
    : Colors.primary;

  const handleAct = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAct();
    if (alert.route) {
      router.push(resolveCanonicalRoute(alert.route) as any);
    }
  }, [alert.route, onAct, router]);

  return (
    <View style={[alertStyles.card, { borderLeftColor: severityColor }]}>
      <View style={alertStyles.header}>
        <View style={[alertStyles.iconWrap, { backgroundColor: severityColor + '18' }]}>
          <AlertTriangle size={14} color={severityColor} />
        </View>
        <Text style={alertStyles.title}>{alert.title}</Text>
      </View>
      <Text style={alertStyles.message}>{alert.message}</Text>
      {alert.suggestion && (
        <Text style={alertStyles.suggestion}>{alert.suggestion}</Text>
      )}
      <View style={alertStyles.actions}>
        <Pressable
          style={[alertStyles.actionBtn, { backgroundColor: severityColor + '18' }]}
          onPress={handleAct}
          testID={`alert-act-${alert.id}`}
        >
          <Text style={[alertStyles.actionText, { color: severityColor }]}>Take Action</Text>
          <ArrowRight size={14} color={severityColor} />
        </Pressable>
        <Pressable style={alertStyles.dismissBtn} onPress={onDismiss} testID={`alert-dismiss-${alert.id}`}>
          <Text style={alertStyles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IntensityIndicator({ level }: { level: string }) {
  const levels = ['baseline', 'elevated', 'high', 'maximum'];
  const activeIndex = levels.indexOf(level);
  const levelColors = ['#4CAF50', '#FFC107', '#FF9800', '#EF5350'];
  const levelLabels = ['Baseline', 'Elevated', 'High', 'Maximum'];

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <Shield size={16} color={levelColors[activeIndex] ?? Colors.primary} />
        <Text style={cardStyles.cardTitle}>Support Intensity</Text>
      </View>
      <Text style={cardStyles.cardSubtitle}>Automatically adjusts based on your risk level</Text>
      <View style={intensityStyles.track}>
        {levels.map((l, i) => (
          <View key={l} style={intensityStyles.step}>
            <View
              style={[
                intensityStyles.dot,
                {
                  backgroundColor: i <= activeIndex ? levelColors[i] : Colors.surface,
                  borderColor: i <= activeIndex ? levelColors[i] : Colors.border,
                },
              ]}
            >
              {i <= activeIndex && <CheckCircle size={10} color="#fff" />}
            </View>
            <Text style={[intensityStyles.stepLabel, i === activeIndex && { color: levelColors[i], fontWeight: '600' as const }]}>
              {levelLabels[i]}
            </Text>
            {i < levels.length - 1 && (
              <View style={[intensityStyles.connector, { backgroundColor: i < activeIndex ? levelColors[i] : Colors.border }]} />
            )}
          </View>
        ))}
      </View>
      <View style={[intensityStyles.infoBox, { backgroundColor: (levelColors[activeIndex] ?? Colors.primary) + '10', borderColor: (levelColors[activeIndex] ?? Colors.primary) + '25' }]}>
        <Info size={14} color={levelColors[activeIndex] ?? Colors.primary} />
        <Text style={[intensityStyles.infoText, { color: levelColors[activeIndex] ?? Colors.primary }]}>
          {level === 'baseline' && 'Standard support level. You are doing well.'}
          {level === 'elevated' && 'Extra check-ins and proactive alerts are enabled.'}
          {level === 'high' && 'Increased monitoring with crisis tools readily available.'}
          {level === 'maximum' && 'All protective measures active. Crisis support is one tap away.'}
        </Text>
      </View>
    </View>
  );
}

export default function RelapseDetectionScreen() {
  const router = useRouter();
  const {
    currentPrediction,
    predictions,
    activeAlerts,
    currentIntensity,
    riskCategory,
    riskLabel,
    riskColor,
    trendLabel,
    reassuringMessage,
    runPrediction,
    dismissAlert,
    actOnAlert,
    timeOfDayRisk,
    sleepDisruption,
    missedEngagement,
    isolationScore,
    riskFactors,
    adaptiveWeights,
    hasAutoIntervention,
  } = useRiskPrediction();
  const { daysSober } = useUser();
  const { checkIns } = useCheckin();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runPrediction();
  }, [runPrediction]);

  const handleCrisis = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/crisis-mode' as any);
  }, []);

  const overallScore = currentPrediction?.overallRisk ?? 0;
  const showCrisisPrompt = currentIntensity.showCrisisButton || overallScore >= 65;
  const isHighRisk = riskCategory === 'high';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Relapse Warning',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScreenScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="relapse-detection-screen"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.reassuranceCard}>
            <Heart size={14} color={Colors.primary} />
            <Text style={styles.reassuranceText}>{reassuringMessage}</Text>
          </View>

          <View style={styles.gaugeSection}>
            <CategoryBadge category={riskCategory} />
            <RiskGauge score={overallScore} color={riskColor} label={riskLabel} />
            <View style={styles.gaugeInfo}>
              <View style={styles.gaugeMeta}>
                <Text style={styles.gaugeMetaLabel}>Trend</Text>
                <View style={styles.trendRow}>
                  {currentPrediction?.trend === 'rising' && <TrendingUp size={14} color="#EF5350" />}
                  {currentPrediction?.trend === 'falling' && <TrendingDown size={14} color="#4CAF50" />}
                  {currentPrediction?.trend === 'stable' && <Minus size={14} color={Colors.textMuted} />}
                  <Text style={[styles.trendText, {
                    color: currentPrediction?.trend === 'rising' ? '#EF5350'
                      : currentPrediction?.trend === 'falling' ? '#4CAF50'
                      : Colors.textMuted
                  }]}>{trendLabel || 'Stable'}</Text>
                </View>
              </View>
              <View style={styles.gaugeMeta}>
                <Text style={styles.gaugeMetaLabel}>Confidence</Text>
                <Text style={styles.gaugeMetaValue}>{currentPrediction?.confidence ?? 0}%</Text>
              </View>
              <View style={styles.gaugeMeta}>
                <Text style={styles.gaugeMetaLabel}>Check-ins</Text>
                <Text style={styles.gaugeMetaValue}>{checkIns.length}</Text>
              </View>
            </View>
            <Pressable style={styles.refreshBtn} onPress={handleRefresh} testID="refresh-prediction">
              <RefreshCw size={14} color={Colors.primary} />
              <Text style={styles.refreshText}>Refresh Analysis</Text>
            </Pressable>
          </View>

          {showCrisisPrompt && (
            <Pressable style={styles.crisisPrompt} onPress={handleCrisis} testID="crisis-prompt">
              <View style={styles.crisisLeft}>
                <View style={styles.crisisIconWrap}>
                  <Shield size={18} color="#fff" />
                </View>
                <View style={styles.crisisTextWrap}>
                  <Text style={styles.crisisTitle}>Your safety tools are ready</Text>
                  <Text style={styles.crisisSubtitle}>Breathing, grounding, and connection - whenever you need them</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#EF5350" />
            </Pressable>
          )}

          {isHighRisk && (
            <Pressable
              style={styles.relapsePlanCard}
              onPress={() => router.push('/relapse-plan' as any)}
              testID="relapse-plan-cta-relapse-detection"
            >
              <View style={styles.relapsePlanLeft}>
                <View style={styles.relapsePlanIconWrap}>
                  <Shield size={18} color="#E53935" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.relapsePlanTitle}>Open your Relapse Plan</Text>
                  <Text style={styles.relapsePlanSubtitle}>
                    Review your warning signs, triggers, and coping tools before taking any action.
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#E53935" />
            </Pressable>
          )}

          {hasAutoIntervention && (
            <View style={styles.autoInterventionBanner}>
              <Zap size={14} color="#FB8C00" />
              <Text style={styles.autoInterventionText}>
                Your support level has been automatically adjusted based on today's patterns.
              </Text>
            </View>
          )}

          {activeAlerts.length > 0 && (() => {
            const byTitle = new Map<string, RiskAlert>();
            for (const a of activeAlerts) {
              const existing = byTitle.get(a.title);
              if (!existing || new Date(a.createdAt) > new Date(existing.createdAt)) byTitle.set(a.title, a);
            }
            const uniqueAlerts = Array.from(byTitle.values()).slice(0, 3);
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Alerts</Text>
                {uniqueAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                    onAct={() => actOnAlert(alert.id)}
                  />
                ))}
              </View>
            );
          })()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Factors</Text>
            <View style={cardStyles.card}>
              <View style={cardStyles.cardHeader}>
                <Brain size={16} color={Colors.primary} />
                <Text style={cardStyles.cardTitle}>Factor Breakdown</Text>
              </View>
              <Text style={cardStyles.cardSubtitle}>What's contributing to your current score</Text>
              <View style={{ marginTop: 12 }}>
                {riskFactors.map((f) => (
                  <FactorBar key={f.label} label={f.label} value={f.value} color={f.color} />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patterns</Text>
            <TimeOfDayCard
              riskByPeriod={timeOfDayRisk.riskByPeriod}
              highRiskPeriod={timeOfDayRisk.highRiskPeriod}
            />
            <SleepCard score={sleepDisruption.score} trend={sleepDisruption.trend} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trend</Text>
            <RiskHistoryChart predictions={predictions} />
          </View>

          <IntensityIndicator level={currentIntensity.level} />

          {adaptiveWeights.adaptationCount > 0 && (
            <View style={styles.adaptiveNote}>
              <Brain size={13} color={Colors.primary} />
              <Text style={styles.adaptiveNoteText}>
                Your risk weights have been personalized {adaptiveWeights.adaptationCount} time{adaptiveWeights.adaptationCount !== 1 ? 's' : ''} based on your unique patterns.
              </Text>
            </View>
          )}

          <View style={styles.footerNote}>
            <Info size={13} color={Colors.textMuted} />
            <Text style={styles.footerText}>
              This system learns from your check-ins to spot patterns early. It's here to support you, not to define you. 
              Trust yourself - and reach out whenever you need a hand.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>
    </>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  outerRing: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  glowRing: {
    position: 'absolute',
    width: GAUGE_SIZE + 12,
    height: GAUGE_SIZE + 12,
    borderRadius: (GAUGE_SIZE + 12) / 2,
    borderWidth: 2,
    top: -7,
    left: -7,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 44,
    fontWeight: '800' as const,
    lineHeight: 50,
  },
  outOf: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: -2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tickContainer: {
    position: 'absolute',
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
  },
  tick: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  needle: {
    position: 'absolute',
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleLine: {
    width: 2,
    height: GAUGE_SIZE / 2 - 30,
    borderRadius: 1,
    position: 'absolute',
    top: 16,
    opacity: 0.7,
  },
});

const factorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 80,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  barOuter: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  value: {
    width: 28,
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'right',
  },
});

const todStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  period: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  periodHighlight: {
    borderWidth: 1,
    borderColor: '#FF980040',
    backgroundColor: '#FF980008',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  periodLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  miniBarOuter: {
    width: 8,
    height: 40,
    backgroundColor: Colors.cardBackground,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  miniBarFill: {
    width: 8,
    borderRadius: 4,
  },
  periodValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  highRiskBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  highRiskText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
});

const sleepStyles = StyleSheet.create({
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  content: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 14,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: -1,
  },
  info: {
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});

const historyStyles = StyleSheet.create({
  explainedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primary + '14',
    borderWidth: 0.5,
    borderColor: Colors.primary + '30',
  },
  explainedBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  empty: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chartWrap: {
    flexDirection: 'row',
    marginTop: 14,
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  yLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 100,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrap: {
    height: 80,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '16',
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});

const alertStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  suggestion: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dismissBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});

const intensityStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  connector: {
    position: 'absolute',
    top: 10,
    left: '60%',
    right: '-40%',
    height: 2,
    borderRadius: 1,
    zIndex: -1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500' as const,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

const categoryStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.primary + '25',
  },
  reassuranceText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
    lineHeight: 19,
  },
  gaugeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gaugeInfo: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  gaugeMeta: {
    alignItems: 'center',
  },
  gaugeMetaLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gaugeMetaValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
  },
  refreshText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  crisisPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EF535010',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF535025',
  },
  crisisLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  crisisIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EF5350',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  crisisTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF5350',
  },
  crisisSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    flexShrink: 1,
  },
  relapsePlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E5393510',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5393525',
  },
  relapsePlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  relapsePlanIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relapsePlanTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E53935',
  },
  relapsePlanSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  autoInterventionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FB8C0010',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#FB8C0025',
  },
  autoInterventionText: {
    flex: 1,
    fontSize: 12,
    color: '#FB8C00',
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  adaptiveNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '08',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  adaptiveNoteText: {
    flex: 1,
    fontSize: 11,
    color: Colors.primary,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
});
