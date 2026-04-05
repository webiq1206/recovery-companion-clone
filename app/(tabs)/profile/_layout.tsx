import { Redirect, Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";
import { TabHeaderActions } from "@/components/TabHeaderActions";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function ProfileLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/profile");
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
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
          headerRight: () => <TabHeaderActions />,
        }}
      />
    </Stack>
  );
}
