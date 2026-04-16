/**
 * Care-partner / enterprise workspace surfaces are for internal or custom builds only.
 * Store consumer builds must set EXPO_PUBLIC_INCLUDE_PROVIDER_SUITE to anything other than "1"
 * (omit it, or set "0"). EAS production profile sets "0" explicitly.
 */
export function isProviderEnterpriseSuiteInBuild(): boolean {
  return process.env.EXPO_PUBLIC_INCLUDE_PROVIDER_SUITE === '1';
}
