import { useMemo } from 'react';

import { useAppMetaStore, useStabilityScore } from '../../features/appMeta/state/useAppMetaStore';
import type { AppMetaDomain } from '../contracts/appMeta';

export function useAppMeta(): AppMetaDomain {
  const stabilityScore = useStabilityScore();
  const resetAllData = useAppMetaStore.use.resetAllData();
  const clearDiagnosticsCaches = useAppMetaStore.use.clearDiagnosticsCaches();

  return useMemo(
    () => ({
      stabilityScore,
      resetAllData,
      clearDiagnosticsCaches,
    }),
    [stabilityScore, resetAllData, clearDiagnosticsCaches]
  );
}

