import React from "react";
import { Redirect } from "expo-router";

import ConnectionHub from "../connection/ConnectionHub";
import { getStrictRedirectTarget } from "../../../utils/legacyRoutes";

export default function CommunityAliasScreen() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/community");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return <ConnectionHub />;
}

