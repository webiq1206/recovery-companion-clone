import React from "react";
import { Redirect } from "expo-router";

import RecoveryRoomsScreen from "../../recovery-rooms";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function ConnectionRecoveryRoomsAlias() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/connection/recovery-rooms");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return <RecoveryRoomsScreen />;
}

