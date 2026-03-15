import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Activity, CheckCircle, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useRecovery } from '@/providers/RecoveryProvider';

export default function CheckInsTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayCheckIns, checkIns } = useRecovery();

  const todayCount = todayCheckIns.length;
  const totalCount = checkIns.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Check-Ins</Text>
        <Text style={styles.subtitle}>
          Daily snapshots of how you&apos;re really doing.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Activity size={18} color={Colors.primary} />
          </View>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryValue}>{todayCount}</Text>
          <Text style={styles.summaryHint}>check-ins logged</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Clock size={18} color={Colors.accentWarm} />
          </View>
          <Text style={styles.summaryLabel}>All Time</Text>
          <Text style={styles.summaryValue}>{totalCount}</Text>
          <Text style={styles.summaryHint}>entries in your record</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Today&apos;s Check-Ins</Text>
        <Text style={styles.bodyText}>
          Complete up to three check-ins each day — morning, afternoon, and evening — to keep
          your Stability and Early Warning systems accurate.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push('/daily-checkin' as any)}
          testID="open-daily-checkin"
        >
          <Activity size={20} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Open Today&apos;s Check-Ins</Text>
        </Pressable>

        <View style={styles.helperCard}>
          <CheckCircle size={16} color={Colors.primary} />
          <Text style={styles.helperText}>
            The more consistently you check in, the smarter your Today Hub, Progress, and
            Insights become.
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  summaryHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

