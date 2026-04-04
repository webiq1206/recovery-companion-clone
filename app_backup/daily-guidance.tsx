import { Redirect } from 'expo-router';

export default function DailyGuidanceRedirect() {
  return <Redirect href="/(tabs)/(home)/today-hub" />;
}
