import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  Home,
  Activity,
  ShieldAlert,
  Hammer,
  Users,
  BookOpen,
  Compass,
  User,
} from "lucide-react-native";
import React, { useCallback } from "react";
import Colors from "@/constants/colors";
import { CrisisStrip } from "@/components/CrisisStrip";

type IconType = typeof Home;

const TabIcon = React.memo(
  ({
    IconComponent,
    color,
    size,
  }: {
    IconComponent: IconType;
    color: string;
    size: number;
  }) => <IconComponent color={color} size={size} />,
);

export default function TabLayout() {
  const renderHomeIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={Home} color={color} size={size} />
    ),
    [],
  );

  const renderCheckInsIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={Activity} color={color} size={size} />
    ),
    [],
  );

  const renderRelapseIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={ShieldAlert} color={color} size={size} />
    ),
    [],
  );

  const renderRebuildIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={Hammer} color={color} size={size} />
    ),
    [],
  );

  const renderConnectionIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={Users} color={color} size={size} />
    ),
    [],
  );

  const renderJournalIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={BookOpen} color={color} size={size} />
    ),
    [],
  );

  const renderProgressIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={Compass} color={color} size={size} />
    ),
    [],
  );

  const renderProfileIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon IconComponent={User} color={color} size={size} />
    ),
    [],
  );

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
            fontWeight: "600" as const,
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
          name="check-ins"
          options={{
            title: "Check-Ins",
            tabBarIcon: renderCheckInsIcon,
          }}
        />
        <Tabs.Screen
          name="relapse-prevention"
          options={{
            title: "Relapse Prevention",
            tabBarIcon: renderRelapseIcon,
          }}
        />
        <Tabs.Screen
          name="rebuild"
          options={{
            title: "Rebuild",
            tabBarIcon: renderRebuildIcon,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Connection",
            tabBarIcon: renderConnectionIcon,
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: "Journal",
            tabBarIcon: renderJournalIcon,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: renderProgressIcon,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: renderProfileIcon,
          }}
        />
      </Tabs>
      <CrisisStrip />
    </View>
  );
}
