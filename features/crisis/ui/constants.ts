/** Full breathing cycles in crisis Breathe step before auto-stop and Continue highlight. */
export const CRISIS_BREATH_MAX_CYCLES = 8;

export const GROUNDING_STEPS = [
  { count: 5, sense: 'SEE', icon: 'eye', prompt: 'Name 5 things you can see', color: '#4FC3F7' },
  { count: 4, sense: 'TOUCH', icon: 'hand', prompt: 'Name 4 things you can touch', color: '#81C784' },
  { count: 3, sense: 'HEAR', icon: 'ear', prompt: 'Name 3 things you can hear', color: '#FFB74D' },
  { count: 2, sense: 'SMELL', icon: 'flower', prompt: 'Name 2 things you can smell', color: '#CE93D8' },
  { count: 1, sense: 'TASTE', icon: 'taste', prompt: 'Name 1 thing you can taste', color: '#EF9A9A' },
] as const;

export const RESET_PROMPTS = [
  'This craving is temporary.\nIt will pass.',
  'You have survived every\ndifficult moment so far.',
  'One minute at a time.\nJust this minute.',
  'Your future self\nwill thank you.',
  'You are stronger\nthan this urge.',
  'Think of one person\nwho believes in you.',
  'Remember why you\nstarted this journey.',
] as const;

