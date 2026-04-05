import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  Home,
  TrendingUp,
  Hammer,
  Users,
  BookOpen,
  Handshake,
} from "lucide-react-native";
import React, { useCallback } from "react";
import Colors from "../../constants/colors";
import { useAppMeta } from "../../core/domains/useAppMeta";

type IconType = typeof Home;

const STABILITY_DOT_COLORS: Record<string, string> = {
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  red: '#EF4444',
};

function getStabilityDotColor(score: number): string {
  if (score >= 70) return STABILITY_DOT_COLORS.green;
  if (score >= 50) return STABILITY_DOT_COLORS.yellow;
  if (score >= 30) return STABILITY_DOT_COLORS.orange;
  return STABILITY_DOT_COLORS.red;
}

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

const HomeTabIcon = React.memo(
  ({ color, size, dotColor }: { color: string; size: number; dotColor: string }) => (
    <View style={{ width: size + 6, height: size + 2, alignItems: 'center', justifyContent: 'center' }}>
      <Home color={color} size={size} />
      <View
        style={{
          position: 'absolute',
          top: -1,
          right: 0,
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: dotColor,
          borderWidth: 1,
          borderColor: Colors.tabBar,
        }}
      />
    </View>
  ),
);

export default function TabLayout() {
  const { stabilityScore } = useAppMeta();
  const dotColor = getStabilityDotColor(stabilityScore);

  const ICON_SIZE = 20;

  const renderHomeIcon = useCallback(
    ({ color }: { color: string }) => (
      <HomeTabIcon color={color} size={ICON_SIZE} dotColor={dotColor} />
    ),
    [dotColor],
  );

  const renderProgressIcon = useCallback(
    ({ color }: { color: string }) => (
      <TabIcon IconComponent={TrendingUp} color={color} size={ICON_SIZE} />
    ),
    [],
  );

  const renderRebuildIcon = useCallback(
    ({ color }: { color: string }) => (
      <TabIcon IconComponent={Hammer} color={color} size={ICON_SIZE} />
    ),
    [],
  );

  const renderConnectionIcon = useCallback(
    ({ color }: { color: string }) => (
      <TabIcon IconComponent={Users} color={color} size={ICON_SIZE} />
    ),
    [],
  );

  const renderAccountabilityIcon = useCallback(
    ({ color }: { color: string }) => (
      <TabIcon IconComponent={Handshake} color={color} size={ICON_SIZE} />
    ),
    [],
  );

  const renderJournalIcon = useCallback(
    ({ color }: { color: string }) => (
      <TabIcon IconComponent={BookOpen} color={color} size={ICON_SIZE} />
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
          tabBarShowLabel: true,
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
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: renderProgressIcon,
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
          name="rebuild"
          options={{
            title: "Rebuild",
            tabBarIcon: renderRebuildIcon,
          }}
        />
        <Tabs.Screen
          name="connection"
          options={{
            title: "Connect",
            tabBarIcon: renderConnectionIcon,
          }}
        />
        <Tabs.Screen
          name="accountability"
          options={{
            title: "Accountability",
            tabBarIcon: renderAccountabilityIcon,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="check-ins/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="relapse-prevention/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="support"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="milestones"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="pledges"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="triggers"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
