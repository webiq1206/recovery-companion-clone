import type { ToolContext, ToolDefinition, ToolId } from './types';

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'breathing',
    title: 'Breathing reset',
    subtitle: 'Slow your nervous system down (4–4–6).',
    category: 'breathing',
    experienceCategory: 'calm',
    recommendedContexts: ['crisis', 'craving', 'relapse_risk', 'any'],
    icon: { key: 'wind' },
  },
  {
    id: 'grounding',
    title: 'Grounding (5-4-3-2-1)',
    subtitle: 'Re-anchor in your senses and the present moment.',
    category: 'grounding',
    experienceCategory: 'calm',
    recommendedContexts: ['crisis', 'craving', 'any'],
    icon: { key: 'eye' },
  },
  {
    id: 'urge-timer',
    title: 'Urge timer',
    subtitle: 'Ride the wave for a few minutes.',
    category: 'urge',
    experienceCategory: 'handle_urges',
    recommendedContexts: ['crisis', 'craving', 'relapse_risk', 'any'],
    icon: { key: 'timer' },
  },
  {
    id: 'reset',
    title: 'Reset prompts',
    subtitle: 'Short phrases to interrupt the spiral.',
    category: 'reset',
    experienceCategory: 'emotional_support',
    recommendedContexts: ['crisis', 'craving', 'any'],
    icon: { key: 'heart' },
  },
  {
    id: 'connect',
    title: 'Reach support',
    subtitle: 'Call or text a trusted person right now.',
    category: 'support',
    experienceCategory: 'emotional_support',
    recommendedContexts: ['crisis', 'relapse_risk', 'any'],
    icon: { key: 'phone' },
  },
  {
    id: 'journal-prompt',
    title: 'Quick journal',
    subtitle: 'Capture what you’re feeling in one short entry.',
    category: 'journal',
    experienceCategory: 'emotional_support',
    recommendedContexts: ['relapse_risk', 'daily_guidance', 'any'],
    icon: { key: 'book' },
    route: { href: '/tools/quick-journal' },
  },
];

export function getTool(toolId: ToolId): ToolDefinition {
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);
  return tool;
}

export function getToolsForContext(context: ToolContext): ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.recommendedContexts.includes(context) || t.recommendedContexts.includes('any'));
}

