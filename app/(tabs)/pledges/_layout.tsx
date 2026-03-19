import { Redirect, Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function PledgesLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/pledges");
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
      <Stack.Screen name="index" options={{ title: 'Daily Pledge' }} />
    </Stack>
  );
}
