import { Stack } from "expo-router";
import React from "react";
import { defaultStackScreenOptions } from "../../../constants/theme";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        ...defaultStackScreenOptions,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="today-hub" options={{ headerShown: false }} />
    </Stack>
  );
}
