export type ToolCategory = 'breathing' | 'grounding' | 'urge' | 'journal' | 'support' | 'reset';

export type ToolContext =
  | 'crisis'
  | 'craving'
  | 'relapse_risk'
  | 'morning_checkin'
  | 'evening_checkin'
  | 'daily_guidance'
  | 'any';

export type ToolId =
  | 'breathing'
  | 'grounding'
  | 'urge-timer'
  | 'reset'
  | 'connect'
  | 'journal-prompt';

export interface ToolRoute {
  /**
   * Expo Router path. When omitted, the tool is "embedded" (rendered in-place)
   * by a parent flow like Crisis Mode.
   */
  href?: string;
}

export interface ToolDefinition {
  id: ToolId;
  title: string;
  subtitle: string;
  category: ToolCategory;
  recommendedContexts: ToolContext[];
  route?: ToolRoute;
  icon: {
    key: 'wind' | 'eye' | 'timer' | 'heart' | 'phone' | 'book';
  };
}

export interface ToolUsageEvent {
  id: string;
  toolId: ToolId;
  context: ToolContext;
  action: 'opened' | 'completed' | 'abandoned';
  timestamp: string;
  meta?: Record<string, unknown>;
}

