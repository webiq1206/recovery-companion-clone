import { Redirect, Stack } from "expo-router";
import Colors from "@/constants/colors";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function TriggersLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/triggers");
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
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    />
  );
}
