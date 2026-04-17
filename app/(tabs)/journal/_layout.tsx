import { Redirect, Stack } from "expo-router";
import React from "react";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { TabHeaderActions } from "../../../components/TabHeaderActions";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function JournalLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/journal");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        ...defaultStackScreenOptions,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Journal & Exercises',
          headerRight: () => <TabHeaderActions />,
        }}
      />
    </Stack>
  );
}
