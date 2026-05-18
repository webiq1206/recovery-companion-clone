/**
 * Lets providers reset in-memory state after delete-account / remove-all-data.
 * Storage is cleared in useAppMetaStore.resetAllData; handlers fix React state that survives.
 */

type AccountDeletionResetHandler = () => void | Promise<void>;

const handlers = new Set<AccountDeletionResetHandler>();

export function registerAccountDeletionResetHandler(handler: AccountDeletionResetHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export async function runAccountDeletionProviderResets(): Promise<void> {
  await Promise.all([...handlers].map((handler) => Promise.resolve(handler())));
}
