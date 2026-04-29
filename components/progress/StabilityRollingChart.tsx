import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';
import { computeTrailingAverage3 } from '../../utils/progressStabilitySeries';

const PADDING_L = 10;
const PADDING_R = 10;
const PADDING_T = 6;
const PADDING_B = 22;

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  const [first, ...rest] = pts;
  return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join('');
}

function isPlotValue(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function buildLineSegments(
  values: (number | null)[],
  xAt: (i: number) => number,
  yAt: (v: number) => number
): string[] {
  const segments: string[] = [];
  let current: { x: number; y: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isPlotValue(v)) {
      if (current.length >= 2) segments.push(pointsToPath(current));
      current = [];
    } else {
      const x = xAt(i);
      const y = yAt(v);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        current.push({ x, y });
      } else {
        if (current.length >= 2) segments.push(pointsToPath(current));
        current = [];
      }
    }
  }
  if (current.length >= 2) segments.push(pointsToPath(current));
  return segments;
}

function collectYExtents(
  scores: (number | null)[],
  smoothed: (number | null)[]
): { min: number; max: number } {
  const nums: number[] = [];
  for (const s of scores) if (isPlotValue(s)) nums.push(s);
  for (const s of smoothed) if (isPlotValue(s)) nums.push(s);
  if (nums.length === 0) return { min: 0, max: 100 };
  const rawMin = Math.min(...nums);
  const rawMax = Math.max(...nums);
  const pad = 8;
  const min = Math.max(0, rawMin - pad);
  const max = Math.min(100, Math.max(rawMax + pad, rawMin + 1));
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 100 };
  return { min, max };
}

export type StabilityRollingChartProps = {
  dates: string[];
  scores: (number | null)[];
  width: number;
  height: number;
  color: string;
  /** 3-day trailing average line */
  trendLineColor?: string;
  planCompletedSet: Set<string>;
  windowDays: number;
};

export function StabilityRollingChart({
  dates,
  scores,
  width,
  height,
  color,
  trendLineColor = 'rgba(46, 196, 182, 0.55)',
  planCompletedSet,
  windowDays,
}: StabilityRollingChartProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const n = dates.length;

  const smoothed = useMemo(() => computeTrailingAverage3(scores), [scores]);

  const { innerH, xAt, yAt, mainSegments, trendSegments, validCount } = useMemo(() => {
    const innerW = width - PADDING_L - PADDING_R;
    const innerH = height - PADDING_T - PADDING_B;
    const { min, max } = collectYExtents(scores, smoothed);
    const range = max - min || 1;

    const xAt = (i: number) =>
      PADDING_L + (n <= 1 ? innerW / 2 : (i / Math.max(n - 1, 1)) * innerW);

    const yAt = (v: number) => {
      const vv = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50;
      const y = PADDING_T + innerH - ((vv - min) / range) * (innerH - 4) - 2;
      return Number.isFinite(y) ? y : PADDING_T + innerH / 2;
    };

    const mainSegments = buildLineSegments(scores, xAt, yAt);
    const trendSegments = buildLineSegments(smoothed, xAt, yAt);

    const validCount = scores.filter(isPlotValue).length;

    return { innerH, xAt, yAt, mainSegments, trendSegments, validCount };
  }, [scores, smoothed, width, height, n]);

  useEffect(() => {
    fadeAnim.setValue(0);
    // useNativeDriver + SVG children has caused native crashes in some Expo Go / RN setups
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [windowDays, dates, scores, fadeAnim]);

  useEffect(() => {
    setSelectedPointIndex(null);
  }, [windowDays, dates, scores]);

  const onPointPress = useCallback((index: number) => {
    void Haptics.selectionAsync();
    setSelectedPointIndex((prev) => (prev === index ? null : index));
  }, []);

  if (n < 2 || validCount < 2) {
    return (
      <View style={[styles.emptyWrap, { height: height + 24 }]}>
        <Text style={styles.emptyText}>Need at least 2 days with check-ins</Text>
      </View>
    );
  }

  const planMarkerY = height - 8;

  return (
    <View
      style={styles.wrap}
      testID="stability-rolling-chart"
      accessible
      accessibilityLabel="Stability over time chart"
      accessibilityRole="image"
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <Svg width={width} height={height}>
          {mainSegments.map((d, idx) => (
            <Path
              key={`main-${idx}`}
              d={d}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.9}
            />
          ))}
          {trendSegments.map((d, idx) => (
            <Path
              key={`trend-${idx}`}
              d={d}
              stroke={trendLineColor}
              strokeWidth={1.75}
              strokeDasharray={[6, 5]}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {scores.map((v, i) => {
            if (!isPlotValue(v)) return null;
            const cx = xAt(i);
            const cy = yAt(v);
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
            const isToday = i === n - 1;
            const displayVal = String(Math.round(v));
            const selected = selectedPointIndex === i;
            return (
              <G
                key={`dot-${dates[i]}-${i}`}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Stability data point ${displayVal}. Tap again to hide value.`}
              >
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isToday ? 5 : 4}
                  fill={isToday ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={selected ? 2.5 : 2}
                />
                {selected ? (
                  <SvgText
                    x={cx}
                    y={cy - 14}
                    fill={Colors.text}
                    fontSize={11}
                    fontWeight="600"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {displayVal}
                  </SvgText>
                ) : null}
                {/* Hit target last so it stays above the label; SvgText otherwise steals touches */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={16}
                  fill="transparent"
                  onPress={() => onPointPress(i)}
                />
              </G>
            );
          })}
          {dates.map((dateStr, i) =>
            planCompletedSet.has(dateStr) ? (
              <Circle key={`plan-${dateStr}`} cx={xAt(i)} cy={planMarkerY} r={4} fill="#4CAF50" />
            ) : null
          )}
        </Svg>
      </Animated.View>
      <View style={styles.labelsRow}>
        <Text style={styles.label}>{windowDays}d ago</Text>
        <Text style={[styles.label, styles.labelCenter]}>Stability Score</Text>
        <Text style={[styles.label, { textAlign: 'right' }]}>Today</Text>
      </View>
      <Text style={styles.legend}>Solid: daily · Dashed: 3-day average</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  legend: {
    fontSize: 8,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 9,
    color: Colors.textMuted,
    flex: 1,
  },
  labelCenter: {
    textAlign: 'center',
  },
});
