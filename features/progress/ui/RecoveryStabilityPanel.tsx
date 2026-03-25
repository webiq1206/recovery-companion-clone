import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Activity, Minus, Shield, TrendingDown, TrendingUp } from 'lucide-react-native';

import Colors from '@/constants/colors';
import type { StabilityTrend } from '@/utils/stabilityEngine';
import type { RiskCategory } from '@/types';

type StabilityZoneId = 'green' | 'yellow' | 'orange' | 'red';

type Props = {
  score: number;
  stabilityTrend: StabilityTrend;
  relapseRiskCategory: RiskCategory;
  relapseRiskLabel: string;
  relapseRiskTrendLabel: string;
  relapseRiskWhySentence?: string;
  relapseRiskFactors?: { label: string; value: number }[];
};

type StabilityZone = {
  id: StabilityZoneId;
  label: string;
  color: string;
};

function getStabilityZone(score: number): StabilityZone {
  if (score >= 70) {
    return { id: 'green', label: 'Steady', color: Colors.success };
  }
  if (score >= 50) {
    return { id: 'yellow', label: 'Guarded', color: Colors.warning };
  }
  if (score >= 30) {
    return { id: 'orange', label: 'Fragile', color: Colors.accentWarm };
  }
  return { id: 'red', label: 'High Risk', color: Colors.danger };
}

export function RecoveryStabilityPanel({
  score,
  stabilityTrend,
  relapseRiskCategory,
  relapseRiskLabel,
  relapseRiskTrendLabel,
  relapseRiskWhySentence,
  relapseRiskFactors,
}: Props) {
  const clampedScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const zone = getStabilityZone(clampedScore);
  const [showWhy, setShowWhy] = useState<boolean>(false);

  const TrendIcon =
    stabilityTrend === 'rising' ? TrendingUp : stabilityTrend === 'declining' ? TrendingDown : Minus;

  const trendText = stabilityTrend === 'rising' ? 'Rising' : stabilityTrend === 'declining' ? 'Falling' : 'Stable';

  const topFactors = useMemo(() => {
    const src = relapseRiskFactors ?? [];
    return src
      .filter((f) => f && typeof f.value === 'number' && Number.isFinite(f.value))
      .slice(0, 5);
  }, [relapseRiskFactors]);

  return (
    <View style={[styles.card, { borderColor: zone.color + '55' }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Comprehensive Stability</Text>
        <View style={[styles.zonePill, { backgroundColor: zone.color + '22' }]}>
          <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
          <Text style={styles.zoneLabel}>{zone.label}</Text>
        </View>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.scoreBlock}>
          <View style={[styles.scoreBadge, { borderColor: zone.color + '77' }]}>
            <Text style={styles.scoreValue}>{clampedScore}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
          </View>
          <View style={styles.trendRow}>
            <TrendIcon size={16} color={zone.color} />
            <Text style={[styles.trendText, { color: zone.color }]}>{trendText}</Text>
          </View>
        </View>

        <View style={styles.metaColumn}>
          <View style={styles.metaRow}>
            <Shield size={16} color={Colors.textSecondary} />
            <View style={styles.metaTextBlock}>
              <Text style={styles.metaLabel}>Relapse risk</Text>
              <View style={styles.riskRow}>
                <View
                  style={[
                    styles.riskPill,
                    {
                      backgroundColor:
                        relapseRiskCategory === 'high'
                          ? Colors.danger
                          : relapseRiskCategory === 'elevated'
                            ? Colors.accent + '25'
                            : relapseRiskCategory === 'guarded'
                              ? Colors.warning + '25'
                              : Colors.success + '25',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.riskText,
                      relapseRiskCategory === 'high' && { color: Colors.white },
                    ]}
                  >
                    {relapseRiskLabel}
                  </Text>
                </View>
              </View>

              {relapseRiskCategory === 'high' && (topFactors.length > 0 || relapseRiskWhySentence) ? (
                <View style={styles.whyWrap}>
                  <Pressable
                    onPress={() => setShowWhy((s) => !s)}
                    accessibilityRole="button"
                    accessibilityLabel={showWhy ? 'Hide why risk is high' : 'Show why risk is high'}
                    style={({ pressed }) => [styles.whyToggle, pressed && { opacity: 0.9 }]}
                    testID="todayhub-why-high-toggle"
                  >
                    <Text style={styles.whyToggleText}>{showWhy ? 'Hide why' : 'Why high?'}</Text>
                  </Pressable>
                  {showWhy ? (
                    <View style={styles.whyBody}>
                      {relapseRiskWhySentence ? (
                        <Text style={styles.whySentence}>{relapseRiskWhySentence}</Text>
                      ) : null}
                      {topFactors.map((f) => (
                        <Text key={f.label} style={styles.factorLine}>
                          {f.label} {Math.round(f.value)}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.metaRow}>
            <Activity size={16} color={Colors.textSecondary} />
            <View style={styles.metaTextBlock}>
              <Text style={styles.metaLabel}>Risk trend</Text>
              <Text style={styles.metaValue}>{relapseRiskTrendLabel}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 6,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  zoneLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    borderRadius: 999,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  scoreUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaColumn: {
    flex: 1,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaTextBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whyWrap: {
    marginTop: 8,
  },
  whyToggle: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  whyToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  whyBody: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  whySentence: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  factorLine: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  riskPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});

export type { StabilityZoneId, StabilityZone };

