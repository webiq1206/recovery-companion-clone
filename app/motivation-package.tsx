import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated, Pressable, Dimensions } from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { Heart, ChevronLeft, ChevronRight, Quote } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { MOTIVATIONAL_PACKAGES } from '@/constants/motivation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MotivationPackageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pkg = MOTIVATIONAL_PACKAGES.find(p => p.id === id);
  const [currentStatement, setCurrentStatement] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  if (!pkg) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Package Not Found' }} />
        <Text style={styles.errorText}>Package not found.</Text>
      </View>
    );
  }

  const animateTransition = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStatement(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = currentStatement < pkg.statements.length - 1 ? currentStatement + 1 : 0;
    animateTransition(next);
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = currentStatement > 0 ? currentStatement - 1 : pkg.statements.length - 1;
    animateTransition(prev);
  };

  return (
    <ScreenScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: pkg.title }} />

      <View style={[styles.headerBanner, { backgroundColor: pkg.color + '20' }]}>
        <View style={[styles.headerIcon, { backgroundColor: pkg.color + '30' }]}>
          <Heart size={28} color={pkg.color} />
        </View>
        <Text style={styles.headerTitle}>{pkg.title}</Text>
        <Text style={styles.headerDesc}>{pkg.description}</Text>
      </View>

      <View style={styles.statementCard}>
        <View style={styles.quoteIcon}>
          <Quote size={20} color={Colors.primary} />
        </View>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.statementText}>{pkg.statements[currentStatement]}</Text>
        </Animated.View>
        <View style={styles.statementNav}>
          <Pressable onPress={handlePrev} style={styles.navBtn} hitSlop={12}>
            <ChevronLeft size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.statementCounter}>
            {currentStatement + 1} / {pkg.statements.length}
          </Text>
          <Pressable onPress={handleNext} style={styles.navBtn} hitSlop={12}>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.galleryLabel}>INSPIRATION</Text>
      {pkg.imageUrls.map((url, index) => (
        <View key={index} style={styles.imageCard}>
          <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
        </View>
      ))}

      <View style={styles.allStatementsSection}>
        <Text style={styles.allStatementsTitle}>All Affirmations</Text>
        {pkg.statements.map((statement, index) => (
          <View key={index} style={styles.affirmationRow}>
            <View style={[styles.affirmationDot, { backgroundColor: pkg.color }]} />
            <Text style={styles.affirmationText}>{statement}</Text>
          </View>
        ))}
      </View>
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
    paddingBottom: 40,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  headerBanner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  headerDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statementCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  quoteIcon: {
    marginBottom: 12,
  },
  statementText: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: Colors.text,
    lineHeight: 28,
    fontStyle: 'italic',
    minHeight: 80,
  },
  statementNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementCounter: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  galleryLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  allStatementsSection: {
    marginTop: 12,
  },
  allStatementsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  affirmationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  affirmationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  affirmationText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
