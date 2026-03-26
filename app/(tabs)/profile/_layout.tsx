import { Redirect, Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { Settings } from "lucide-react-native";
import Colors from "@/constants/colors";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function ProfileLayout() {
  const router = useRouter();
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
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings' as any)} hitSlop={10}>
              <Settings size={18} color={Colors.text} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
