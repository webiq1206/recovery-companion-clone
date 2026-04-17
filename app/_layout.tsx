import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConnectionProvider } from "../providers/ConnectionProvider";
import { RecoveryRoomsProvider } from "../providers/RecoveryRoomsProvider";
import { SubscriptionProvider } from "../providers/SubscriptionProvider";
import { EngagementProvider } from "../providers/EngagementProvider";
import { RiskPredictionProvider } from "../providers/RiskPredictionProvider";
import { CommunityProvider } from "../providers/CommunityProvider";
import { TherapistProvider } from "../providers/TherapistProvider";
import { SecurityProvider, useSecurity } from "../providers/SecurityProvider";
import { StageDetectionProvider } from "../providers/StageDetectionProvider";
import { ProviderModeProvider } from "../providers/ProviderModeProvider";
import { RetentionProvider } from "../providers/RetentionProvider";
import { NotificationProvider } from "../providers/NotificationProvider";
import { EnterpriseProvider } from "../providers/EnterpriseProvider";
import ErrorBoundary from "../components/ErrorBoundary";
import { CheckInReminderSync } from "../components/CheckInReminderSync";
import LockScreen from "../components/LockScreen";
import Colors from "../constants/colors";
import {
  defaultStackScreenOptions,
  fadeAnimation,
  fadeAnimationDuration,
  modalAnimation,
  modalAnimationDuration,
} from "../constants/theme";
import { useShakeToCrisis } from "../hooks/useShakeToCrisis";
import { shouldEnableStrictIARedirects } from "../utils/legacyRoutes";
import { logger } from "../utils/logger";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  useShakeToCrisis();
  return (
    <>
      <CheckInReminderSync />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          ...defaultStackScreenOptions,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="new-journal" options={{ title: 'New Entry', presentation: 'modal', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="journal-detail" options={{ title: 'Journal Entry' }} />
        <Stack.Screen name="motivation-package" options={{ title: 'Motivation' }} />
        <Stack.Screen name="workbook-section" options={{ title: 'Exercises' }} />
        <Stack.Screen name="crisis-mode" options={{ headerShown: false, presentation: 'fullScreenModal', animation: fadeAnimation, animationDuration: fadeAnimationDuration }} />
        <Stack.Screen name="check-in-now" options={{ title: 'Check-in Now' }} />
        <Stack.Screen name="daily-checkin" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="rebuild" options={{ presentation: 'modal', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="checkin" options={{ title: 'Daily Check-In', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="emergency" options={{ headerShown: false, presentation: 'fullScreenModal', animation: fadeAnimation, animationDuration: fadeAnimationDuration }} />
        <Stack.Screen name="recovery-rooms" options={{ title: 'Recovery Rooms' }} />
        <Stack.Screen name="room-session" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="premium-upgrade" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen
          name="subscription-plans"
          options={{
            title: 'Plans & benefits',
            presentation: 'modal',
            animation: modalAnimation,
            animationDuration: modalAnimationDuration,
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
          }}
        />
        <Stack.Screen name="how-to-use" options={{ title: 'How to Use Recovery Companion', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="why-stability-important" options={{ title: 'Why is Stability Important?', animation: modalAnimation, animationDuration: modalAnimationDuration }} />
        <Stack.Screen name="relapse-plan" options={{ title: 'Relapse Plan' }} />
        <Stack.Screen name="relapse-recovery" options={{ title: 'Log a Setback' }} />
        <Stack.Screen name="relapse-detection" options={{ title: 'Wellness signals' }} />
        <Stack.Screen name="provider-portal" options={{ title: 'Care partner workspace' }} />
        <Stack.Screen name="client-detail" options={{ title: 'Client Detail' }} />
        <Stack.Screen name="security-settings" options={{ title: 'Security & Privacy' }} />
        <Stack.Screen name="retention-insights" options={{ title: 'Your Recovery Journey' }} />
        <Stack.Screen name="advanced-analytics" options={{ title: 'Advanced Analytics' }} />
        <Stack.Screen name="insights" options={{ title: 'Growth Insights' }} />
        <Stack.Screen name="enterprise-layout" options={{ headerShown: false }} />
        <Stack.Screen name="insights-explained" options={{ title: 'Growth Insights Explained' }} />
        <Stack.Screen name="recovery-stages-explained" options={{ title: 'Recovery Stages Explained' }} />
        <Stack.Screen name="early-warning-explained" options={{ title: 'Wellness signals explained' }} />
        <Stack.Screen name="recovery-insights-explained" options={{ title: 'Your Recovery Journey Explained' }} />
        <Stack.Screen name="protection-profile" options={{ title: 'Wellness snapshot' }} />
        <Stack.Screen name="first-day" options={{ title: 'Your First Day', headerShown: false }} />
        <Stack.Screen name="daily-guidance" options={{ title: 'Your Day' }} />
        <Stack.Screen name="wizard" options={{ title: 'Guided Wizard' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="tools" options={{ title: 'Quick Coping Tools' }} />
        <Stack.Screen name="community-guidelines" options={{ title: 'Connect safety' }} />
        <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="terms-of-service" options={{ title: 'Terms of Service' }} />
        <Stack.Screen name="data-and-sharing" options={{ title: 'Your data & sharing' }} />
      </Stack>
    </>
  );
}

function SecuredApp() {
  const { isLocked, isAuthenticated, settings, isSecuritySettingsReady } = useSecurity();

  const handleUnlock = useCallback(() => {
    console.log('[Security] App unlocked');
  }, []);

  if (!isSecuritySettingsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (settings.isAuthEnabled && isLocked && !isAuthenticated) {
    return <LockScreen onUnlock={handleUnlock} mode="unlock" />;
  }

  return (
    <SubscriptionProvider>
      <ProviderModeProvider>
        <StageDetectionProvider>
          <EngagementProvider>
            <RiskPredictionProvider>
              <ConnectionProvider>
                <RecoveryRoomsProvider>
                  <CommunityProvider>
                    <TherapistProvider>
                      <RetentionProvider>
                        <NotificationProvider>
                          <EnterpriseProvider>
                            <RootLayoutNav />
                          </EnterpriseProvider>
                        </NotificationProvider>
                      </RetentionProvider>
                    </TherapistProvider>
                  </CommunityProvider>
                </RecoveryRoomsProvider>
              </ConnectionProvider>
            </RiskPredictionProvider>
          </EngagementProvider>
        </StageDetectionProvider>
      </ProviderModeProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    if (__DEV__) {
      logger.info("IA strict redirects mode", {
        enabled: shouldEnableStrictIARedirects(),
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary fallbackMessage="Something unexpected happened. Your recovery data is safe.">
          <SecurityProvider>
            <SecuredApp />
          </SecurityProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
