import { Redirect, Stack } from "expo-router";
import Colors from "@/constants/colors";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function RebuildLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/rebuild");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '700' as const,
        },
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    />
  );
}
