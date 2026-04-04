import React from "react";
import { Redirect } from "expo-router";

export default function HomeAliasScreen() {
  return <Redirect href={"/(tabs)/(home)/today-hub" as any} />;
}

