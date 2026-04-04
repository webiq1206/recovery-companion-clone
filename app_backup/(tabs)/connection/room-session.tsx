import React from "react";
import { Redirect } from "expo-router";

import RoomSessionScreen from "../../room-session";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function ConnectionRoomSessionAlias() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/connection/room-session");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return <RoomSessionScreen />;
}

