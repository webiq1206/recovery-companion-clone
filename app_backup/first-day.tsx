import { Redirect } from 'expo-router';

export default function FirstDayRedirect() {
  return <Redirect href="/(tabs)/(home)/today-hub" />;
}
