import { Redirect, Stack } from "expo-router";
import { defaultStackScreenOptions } from "../../../constants/theme";
import { TabHeaderActions } from "../../../components/TabHeaderActions";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function ProgressLayout() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/progress");
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
          title: "Progress",
          headerRight: () => <TabHeaderActions />,
        }}
      />
    </Stack>
  );
}
