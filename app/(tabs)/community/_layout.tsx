import { defaultStackScreenOptions } from "../../../constants/theme";
import { Redirect, Stack } from "expo-router";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function CommunityLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/community");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        ...defaultStackScreenOptions,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Connection" }} />
    </Stack>
  );
}
