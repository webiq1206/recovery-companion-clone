import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { RecoveryRoomsProvider } from "@/providers/RecoveryRoomsProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { EngagementProvider } from "@/providers/EngagementProvider";
import { RiskPredictionProvider } from "@/providers/RiskPredictionProvider";
import { CommunityProvider } from "@/providers/CommunityProvider";
import { TherapistProvider } from "@/providers/TherapistProvider";
import { ComplianceProvider } from "@/providers/ComplianceProvider";
import { SecurityProvider, useSecurity } from "@/providers/SecurityProvider";
import { StageDetectionProvider } from "@/providers/StageDetectionProvider";
import { ProviderModeProvider } from "@/providers/ProviderModeProvider";
import { RetentionProvider } from "@/providers/RetentionProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { EnterpriseProvider } from "@/providers/EnterpriseProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import LockScreen from "@/components/LockScreen";
import Colors from "@/constants/colors";
import { useShakeToCrisis } from "@/hooks/useShakeToCrisis";
import { trpc, trpcClient } from "@/lib/trpc";
import { shouldEnableStrictIARedirects } from "@/utils/legacyRoutes";
import { logger } from "@/utils/logger";

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

const isWeb = Platform.OS === 'web';
const defaultAnimation = isWeb ? 'none' as const : 'fade_from_bottom' as const;
const modalAnimation = isWeb ? 'none' as const : 'slide_from_bottom' as const;
const fadeAnimation = isWeb ? 'none' as const : 'fade' as const;

function RootLayoutNav() {
  useShakeToCrisis();
  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          contentStyle: { backgroundColor: Colors.background },
          animation: defaultAnimation,
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="new-journal" options={{ title: 'New Entry', presentation: 'modal', animation: modalAnimation }} />
        <Stack.Screen name="journal-detail" options={{ title: 'Journal Entry' }} />
        <Stack.Screen name="motivation-package" options={{ title: 'Motivation' }} />
        <Stack.Screen name="workbook-section" options={{ title: 'Exercises' }} />
        <Stack.Screen name="crisis-mode" options={{ headerShown: false, presentation: 'fullScreenModal', animation: fadeAnimation }} />
        <Stack.Screen name="daily-checkin" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
        <Stack.Screen name="rebuild" options={{ presentation: 'modal', animation: modalAnimation }} />
        <Stack.Screen name="checkin" options={{ title: 'Daily Check-In', animation: modalAnimation }} />
        <Stack.Screen name="emergency" options={{ headerShown: false, presentation: 'fullScreenModal', animation: fadeAnimation }} />
        <Stack.Screen name="companion-chat" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
        <Stack.Screen name="recovery-rooms" options={{ title: 'Recovery Rooms' }} />
        <Stack.Screen name="room-session" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
        <Stack.Screen name="premium-upgrade" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
        <Stack.Screen
          name="subscription-plans"
          options={{
            title: 'Plans & benefits',
            presentation: 'modal',
            animation: modalAnimation,
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
          }}
        />
        <Stack.Screen name="how-to-use" options={{ title: 'How to Use', animation: modalAnimation }} />
        <Stack.Screen name="relapse-recovery" options={{ title: 'Log a Setback', animation: defaultAnimation }} />
        <Stack.Screen name="relapse-detection" options={{ title: 'Risk Warning', animation: defaultAnimation }} />
        <Stack.Screen name="provider-portal" options={{ title: 'Provider Portal', animation: defaultAnimation }} />
        <Stack.Screen name="client-detail" options={{ title: 'Client Detail', animation: defaultAnimation }} />
        <Stack.Screen name="compliance-mode" options={{ title: 'Compliance Mode', animation: defaultAnimation }} />
        <Stack.Screen name="security-settings" options={{ title: 'Security & Privacy', animation: defaultAnimation }} />
        <Stack.Screen name="retention-insights" options={{ title: 'Recovery Insights', animation: defaultAnimation }} />
        <Stack.Screen name="insights" options={{ title: 'Insights Hub', animation: defaultAnimation }} />
        <Stack.Screen name="enterprise-layout" options={{ headerShown: false, animation: defaultAnimation }} />
        <Stack.Screen name="insights-explained" options={{ title: 'Growth Insights Explained', animation: defaultAnimation }} />
        <Stack.Screen name="recovery-stages-explained" options={{ title: 'Recovery Stages Explained', animation: defaultAnimation }} />
        <Stack.Screen name="early-warning-explained" options={{ title: 'Risk Warning Explained', animation: defaultAnimation }} />
        <Stack.Screen name="recovery-insights-explained" options={{ title: 'Recovery Insights', animation: defaultAnimation }} />
        <Stack.Screen name="protection-profile" options={{ title: 'Protection Profile', animation: defaultAnimation }} />
        <Stack.Screen name="first-day" options={{ title: 'Your First Day', headerShown: false, animation: defaultAnimation }} />
        <Stack.Screen name="daily-guidance" options={{ title: 'Your Day', animation: defaultAnimation }} />
        <Stack.Screen name="wizard" options={{ title: 'Guided Wizard', animation: defaultAnimation }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', animation: defaultAnimation }} />
      </Stack>
    </>
  );
}

function SecuredApp() {
  const { isLocked, isAuthenticated, settings } = useSecurity();

  const handleUnlock = useCallback(() => {
    console.log('[Security] App unlocked');
  }, []);

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
                      <ComplianceProvider>
                        <RetentionProvider>
                          <NotificationProvider>
                            <EnterpriseProvider>
                              <RootLayoutNav />
                            </EnterpriseProvider>
                          </NotificationProvider>
                        </RetentionProvider>
                      </ComplianceProvider>
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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <ErrorBoundary fallbackMessage="Something unexpected happened. Your recovery data is safe.">
            <SecurityProvider>
              <SecuredApp />
            </SecurityProvider>
          </ErrorBoundary>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
