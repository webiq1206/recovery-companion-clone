import { Redirect, Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function AccountabilityLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/accountability");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Accountability' }} />
    </Stack>
  );
}
