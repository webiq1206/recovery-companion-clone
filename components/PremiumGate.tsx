import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Crown, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useSubscription } from '../providers/SubscriptionProvider';
import { useOpenPremiumPaywall } from '../hooks/useOpenPremiumPaywall';
import { PremiumFeature } from '../types';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  style?: object;
}

const PremiumBanner = React.memo(({ feature }: { feature: PremiumFeature }) => {
  const { getFeatureInfo } = useSubscription();
  const { openPremiumPaywall } = useOpenPremiumPaywall();
  const info = getFeatureInfo(feature);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const iconOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void openPremiumPaywall();
  };

  return (
    <View style={bannerStyles.container}>
      <Animated.View style={[bannerStyles.iconWrap, { opacity: iconOpacity }]}>
        <Crown size={24} color="#D4A574" />
      </Animated.View>
      <View style={bannerStyles.textWrap}>
        <Text style={bannerStyles.title}>{info.title}</Text>
        <Text style={bannerStyles.desc} numberOfLines={2}>{info.description}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [bannerStyles.upgradeBtn, pressed && bannerStyles.pressed]}
        onPress={handlePress}
        testID={`premium-gate-${feature}`}
      >
        <Text style={bannerStyles.upgradeBtnText}>Unlock</Text>
        <ChevronRight size={14} color="#D4A574" />
      </Pressable>
    </View>
  );
});

export default function PremiumGate({ feature, children, fallback, style }: PremiumGateProps) {
  const { hasFeature } = useSubscription();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return (
    <View style={style}>
      {fallback ?? <PremiumBanner feature={feature} />}
    </View>
  );
}

export function PremiumInlineGate({ feature, children }: { feature: PremiumFeature; children: React.ReactNode }) {
  const { hasFeature } = useSubscription();
  const { openPremiumPaywall } = useOpenPremiumPaywall();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void openPremiumPaywall();
  };

  return (
    <Pressable
      style={({ pressed }) => [inlineStyles.wrapper, pressed && inlineStyles.pressed]}
      onPress={handlePress}
    >
      <View style={inlineStyles.badge}>
        <Crown size={10} color="#D4A574" />
        <Text style={inlineStyles.badgeText}>PRO</Text>
      </View>
      <View style={inlineStyles.childrenWrap} pointerEvents="none">
        {children}
      </View>
      <View style={inlineStyles.overlay} />
    </Pressable>
  );
}

export function PremiumSectionOverlay({ feature, title, description }: { feature: PremiumFeature; title?: string; description?: string }) {
  const { hasFeature, getFeatureInfo } = useSubscription();
  const { openPremiumPaywall } = useOpenPremiumPaywall();

  if (hasFeature(feature)) return null;

  const info = getFeatureInfo(feature);

  return (
    <View style={overlayStyles.container}>
      <View style={overlayStyles.iconCircle}>
        <Crown size={28} color="#D4A574" />
      </View>
      <Text style={overlayStyles.title}>{title ?? info.title}</Text>
      <Text style={overlayStyles.desc}>{description ?? info.description}</Text>
      <Pressable
        style={({ pressed }) => [overlayStyles.btn, pressed && overlayStyles.btnPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void openPremiumPaywall();
        }}
      >
        <Text style={overlayStyles.btnText}>Learn More</Text>
      </Pressable>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(212,165,116,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#D4A574',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#D4A574',
  },
  pressed: {
    opacity: 0.8,
  },
});

const inlineStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#D4A574',
    letterSpacing: 0.5,
  },
  childrenWrap: {
    opacity: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});

const overlayStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212,165,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: 'rgba(212,165,116,0.15)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.3)',
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#D4A574',
  },
});
