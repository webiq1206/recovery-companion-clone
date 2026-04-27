import { Redirect, Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { TabHeaderActions } from "../../../components/TabHeaderActions";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";
import Colors from "../../../constants/colors";

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
          headerLeft: () => <JournalTabBackButton />,
          headerRight: () => <TabHeaderActions />,
        }}
      />
    </Stack>
  );
}

function JournalTabBackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/(home)/today-hub" as any);
        }
      }}
      hitSlop={12}
      accessibilityLabel="Go back"
      testID="journal-header-back"
    >
      <ChevronLeft size={24} color={Colors.text} />
    </Pressable>
  );
}
