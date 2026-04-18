import { Stack } from "expo-router";
import React from "react";
import { recoveryPathsStackScreenOptions } from "../../constants/theme";

export default function RecoveryPathsLayout() {
  return (
    <Stack
      screenOptions={{
        ...recoveryPathsStackScreenOptions,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="room-list"
        options={{
          title: "Rooms",
        }}
      />
      <Stack.Screen
        name="chat-room"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
