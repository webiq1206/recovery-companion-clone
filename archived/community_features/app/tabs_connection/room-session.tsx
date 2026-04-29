import React from "react";
import { Redirect } from "expo-router";

import RoomSessionScreen from "../../room-session";
import { arePeerPracticeFeaturesEnabled } from "../../../core/socialLiveConfig";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function ConnectionRoomSessionAlias() {
  if (!arePeerPracticeFeaturesEnabled()) {
    return <Redirect href="/(tabs)/connection" />;
  }
  const strictTarget = getStrictRedirectTarget("/(tabs)/connection/room-session");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return <RoomSessionScreen />;
}

