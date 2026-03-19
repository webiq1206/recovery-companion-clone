import Colors from "@/constants/colors";
import { Redirect, Stack } from "expo-router";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function CommunityLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/community");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Connection" }} />
    </Stack>
  );
}
