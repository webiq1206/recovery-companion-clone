import { Redirect, Stack } from "expo-router";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function SupportLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/support");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        ...defaultStackScreenOptions,
      }}
    />
  );
}
