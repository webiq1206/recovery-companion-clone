export interface AppMetaDomainState {
  stabilityScore: number;
}

export interface AppMetaDomainCommands {
  resetAllData: () => Promise<void>;
  clearDiagnosticsCaches: () => Promise<void>;
}

export type AppMetaDomain = AppMetaDomainState & AppMetaDomainCommands;

