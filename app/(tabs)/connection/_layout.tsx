import { Redirect, Stack } from "expo-router";
import React from "react";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { TabHeaderActions } from "../../../components/TabHeaderActions";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function ConnectionLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/connection");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        ...defaultStackScreenOptions,
        headerRight: () => <TabHeaderActions />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Connection",
        }}
      />
      <Stack.Screen
        name="chat-paths"
        options={{
          title: "Chat",
        }}
      />
      <Stack.Screen
        name="recovery-rooms"
        options={{
          title: "Recovery Rooms",
        }}
      />
      <Stack.Screen
        name="peer-chat/[chatId]"
        options={{
          title: "Peer chat",
        }}
      />
      <Stack.Screen
        name="room-session"
        options={{
          // The existing `/room-session` route hides the header.
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

