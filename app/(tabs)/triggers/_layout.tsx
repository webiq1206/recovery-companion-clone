import { Redirect, Stack } from "expo-router";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function TriggersLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/triggers");
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
