import { Redirect, Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Settings } from "lucide-react-native";
import Colors from "@/constants/colors";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function ProgressLayout() {
  const router = useRouter();
  const strictTarget = getStrictRedirectTarget("/(tabs)/progress");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: "600" as const },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Progress",
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
