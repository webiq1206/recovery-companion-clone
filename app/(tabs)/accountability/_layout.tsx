import { Redirect, Stack } from "expo-router";
import React from "react";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { TabHeaderActions } from "../../../components/TabHeaderActions";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function AccountabilityLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/accountability");
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
          title: 'Accountability',
          headerRight: () => <TabHeaderActions />,
        }}
      />
    </Stack>
  );
}
