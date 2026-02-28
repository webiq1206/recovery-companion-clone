import { Tabs } from "expo-router";
import { View } from "react-native";
import { Home, Compass, User, BookOpen, Users } from "lucide-react-native";
import React, { useCallback } from "react";
import Colors from "@/constants/colors";
import { CrisisStrip } from "@/components/CrisisStrip";

const TabIcon = React.memo(({ IconComponent, color, size }: { IconComponent: typeof Home; color: string; size: number }) => (
  <IconComponent color={color} size={size} />
));

export default function TabLayout() {
  const renderHomeIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <TabIcon IconComponent={Home} color={color} size={size} />
  ), []);

  const renderJourneyIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <TabIcon IconComponent={Compass} color={color} size={size} />
  ), []);

  const renderJournalIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <TabIcon IconComponent={BookOpen} color={color} size={size} />
  ), []);

  const renderCommunityIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <TabIcon IconComponent={Users} color={color} size={size} />
  ), []);

  const renderProfileIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <TabIcon IconComponent={User} color={color} size={size} />
  ), []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.tabBar,
            borderTopColor: Colors.border,
            borderTopWidth: 0.5,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600' as const,
          },
          lazy: true,
        }}
      >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Today",
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Timeline",
          tabBarIcon: renderJourneyIcon,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: renderCommunityIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: renderProfileIcon,
        }}
      />
      <Tabs.Screen
        name="pledges"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="triggers"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="milestones"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="accountability"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="rebuild"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="support"
        options={{ href: null }}
      />

    </Tabs>
      <CrisisStrip />
    </View>
  );
}
