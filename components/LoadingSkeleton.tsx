import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '../constants/colors';
import { radius, spacing } from '../constants/theme';

const SkeletonPulse = React.memo(({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.cardBackgroundLight,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
});

export function HomeLoadingSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <SkeletonPulse width={160} height={24} borderRadius={radius.sm} />
          <SkeletonPulse width={100} height={14} borderRadius={radius.sm} style={{ marginTop: spacing.xxs + 2 }} />
        </View>
        <SkeletonPulse width={80} height={36} borderRadius={18} />
      </View>

      <SkeletonPulse width="100%" height={44} borderRadius={radius.md} style={{ marginTop: spacing.sm - 2 }} />

      <View style={styles.heroSkeleton}>
        <View style={styles.heroLeft}>
          <SkeletonPulse width={120} height={120} borderRadius={60} />
        </View>
        <View style={styles.heroRight}>
          <SkeletonPulse width={80} height={20} borderRadius={6} />
          <SkeletonPulse width={60} height={20} borderRadius={6} style={{ marginTop: 12 }} />
          <SkeletonPulse width={70} height={20} borderRadius={6} style={{ marginTop: 12 }} />
        </View>
      </View>

      <SkeletonPulse width="100%" height={120} borderRadius={radius.xl} style={{ marginTop: spacing.sm }} />

      <SkeletonPulse width="100%" height={50} borderRadius={radius.md} style={{ marginTop: spacing.sm - 2 }} />

      <SkeletonPulse width="100%" height={70} borderRadius={radius.lg} style={{ marginTop: spacing.sm - 2 }} />

      <SkeletonPulse width="100%" height={70} borderRadius={radius.lg} style={{ marginTop: spacing.sm - 4 }} />

      <SkeletonPulse width="100%" height={60} borderRadius={radius.lg} style={{ marginTop: spacing.sm - 4 }} />
    </View>
  );
}

export function GenericLoadingSkeleton({ lines = 5 }: { lines?: number }) {
  return (
    <View style={styles.genericContainer}>
      <SkeletonPulse width="70%" height={22} borderRadius={radius.sm} />
      <SkeletonPulse width="45%" height={14} borderRadius={radius.sm} style={{ marginTop: spacing.xs }} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonPulse
          key={i}
          width="100%"
          height={60 + (i % 2) * 20}
          borderRadius={radius.md}
          style={{ marginTop: spacing.sm - 2 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xxl + spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: radius.xxl,
    padding: spacing.md,
    marginTop: spacing.sm + 4,
    gap: spacing.md,
  },
  heroLeft: {},
  heroRight: {
    flex: 1,
  },
  genericContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm + 4,
  },
});

export default SkeletonPulse;
