import { Redirect, Stack } from "expo-router";
import React from "react";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function MilestonesLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/milestones");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        ...defaultStackScreenOptions,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Milestones' }} />
    </Stack>
  );
}
