import React from "react";
import { Redirect } from "expo-router";

import ConnectionHub from "../connection/ConnectionHub";
import { shouldEnableStrictIARedirects } from "@/utils/legacyRoutes";

export default function CommunityAliasScreen() {
  if (shouldEnableStrictIARedirects()) {
    return <Redirect href={"/connection" as any} />;
  }

  return <ConnectionHub />;
}

