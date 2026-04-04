import React from "react";
import { Redirect } from "expo-router";

import ConnectionHub from "./ConnectionHub";
import { getStrictRedirectTarget } from "@/utils/legacyRoutes";

export default function ConnectionIndexScreen() {
  const strictTarget = getStrictRedirectTarget("/(tabs)/connection");
  if (strictTarget) {
    return <Redirect href={strictTarget as any} />;
  }

  return <ConnectionHub />;
}

