import type { UseBoundStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';

/**
 * Attaches a `.use` selector namespace to a zustand hook.
 *
 * Example:
 *   const useStore = create(...);
 *   export const useMyStore = createSelectors(useStore);
 *   const foo = useMyStore.use.foo();
 */
export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(store: S) {
  const s = store as S & { use: Record<string, () => unknown> };
  s.use = {};

  for (const key of Object.keys(store.getState())) {
    (s.use as Record<string, unknown>)[key] = () => store((state) => (state as any)[key]);
  }

  return s as S & { use: { [K in keyof ReturnType<S['getState']>]: () => ReturnType<S['getState']>[K] } };
}

