import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RecoveryProvider } from "@/providers/RecoveryProvider";
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
import { RetentionProvider } from "@/providers/RetentionProvider";
import { EnterpriseProvider } from "@/providers/EnterpriseProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import LockScreen from "@/components/LockScreen";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

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
  return (
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
      <Stack.Screen name="checkin" options={{ title: 'Daily Check-In', animation: modalAnimation }} />
      <Stack.Screen name="emergency" options={{ headerShown: false, presentation: 'fullScreenModal', animation: fadeAnimation }} />
      <Stack.Screen name="companion-chat" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
      <Stack.Screen name="recovery-rooms" options={{ title: 'Recovery Rooms' }} />
      <Stack.Screen name="room-session" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
      <Stack.Screen name="premium-upgrade" options={{ headerShown: false, presentation: 'modal', animation: modalAnimation }} />
      <Stack.Screen name="how-to-use" options={{ title: 'How to Use', animation: modalAnimation }} />
      <Stack.Screen name="relapse-detection" options={{ title: 'Relapse Detection', animation: defaultAnimation }} />
      <Stack.Screen name="provider-portal" options={{ title: 'Provider Portal', animation: defaultAnimation }} />
      <Stack.Screen name="client-detail" options={{ title: 'Client Detail', animation: defaultAnimation }} />
      <Stack.Screen name="compliance-mode" options={{ title: 'Compliance Mode', animation: defaultAnimation }} />
      <Stack.Screen name="security-settings" options={{ title: 'Security & Privacy', animation: defaultAnimation }} />
      <Stack.Screen name="retention-insights" options={{ title: 'Recovery Insights', animation: defaultAnimation }} />
      <Stack.Screen name="enterprise-dashboard" options={{ headerShown: false, animation: defaultAnimation }} />
      <Stack.Screen name="enterprise-heatmaps" options={{ title: 'Analytics', animation: defaultAnimation }} />
      <Stack.Screen name="enterprise-reports" options={{ title: 'Reports', animation: defaultAnimation }} />
      <Stack.Screen name="enterprise-billing" options={{ title: 'Billing', animation: defaultAnimation }} />
      <Stack.Screen name="enterprise-whitelabel" options={{ title: 'White Label', animation: defaultAnimation }} />
      <Stack.Screen name="insights-explained" options={{ title: 'Insights Explained', animation: defaultAnimation }} />
      <Stack.Screen name="recovery-stages-explained" options={{ title: 'Recovery Stages', animation: defaultAnimation }} />
      <Stack.Screen name="early-warning-explained" options={{ title: 'Early Warning', animation: defaultAnimation }} />
      <Stack.Screen name="recovery-insights-explained" options={{ title: 'Recovery Insights', animation: defaultAnimation }} />
      <Stack.Screen name="protection-profile" options={{ title: 'Protection Profile', animation: defaultAnimation }} />
    </Stack>
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
      <RecoveryProvider>
        <StageDetectionProvider>
          <EngagementProvider>
            <RiskPredictionProvider>
              <ConnectionProvider>
                <RecoveryRoomsProvider>
                  <CommunityProvider>
                    <TherapistProvider>
                      <ComplianceProvider>
                        <RetentionProvider>
                          <EnterpriseProvider>
                            <NotificationProvider>
                              <RootLayoutNav />
                            </NotificationProvider>
                          </EnterpriseProvider>
                        </RetentionProvider>
                      </ComplianceProvider>
                    </TherapistProvider>
                  </CommunityProvider>
                </RecoveryRoomsProvider>
              </ConnectionProvider>
            </RiskPredictionProvider>
          </EngagementProvider>
        </StageDetectionProvider>
      </RecoveryProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
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
