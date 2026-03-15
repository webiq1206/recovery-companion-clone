import { DailyCheckIn } from '@/types';

export type RecoveryStage = 'early' | 'building' | 'strengthening' | 'thriving';
export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'crisis';
export type CompanionMessageType = 'reflection' | 'pattern' | 'identity' | 'reframe' | 'encouragement' | 'crisis' | 'greeting' | 'shame_response' | 'hopelessness_response' | 'rumination_response' | 'self_criticism_response' | 'avoidance_response';
export type CompanionTone = 'encouraging' | 'supportive' | 'urgent' | 'crisis';

export type EmotionalPattern = 'shame' | 'hopelessness' | 'rumination' | 'self_criticism' | 'avoidance' | 'none';

export interface CompanionMessage {
  id: string;
  content: string;
  type: CompanionMessageType;
  timestamp: string;
  isUser: boolean;
}

export function getRecoveryStage(daysSober: number): RecoveryStage {
  if (daysSober < 30) return 'early';
  if (daysSober < 90) return 'building';
  if (daysSober < 180) return 'strengthening';
  return 'thriving';
}

export function getRiskLevel(checkIns: DailyCheckIn[], daysSober: number): RiskLevel {
  if (daysSober < 3) return 'elevated';
  const recent = checkIns.slice(0, 3);
  if (recent.length === 0) return 'moderate';

  const avgStability = recent.reduce((s, c) => s + c.stabilityScore, 0) / recent.length;
  const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
  const avgMood = recent.reduce((s, c) => s + c.mood, 0) / recent.length;

  if (avgStability < 30 || avgCraving > 80) return 'high';
  if (avgStability < 45 || avgCraving > 60) return 'elevated';
  if (avgStability < 60 || avgMood < 3) return 'moderate';
  return 'low';
}

export function getStageLabel(stage: RecoveryStage): string {
  switch (stage) {
    case 'early': return 'Early Recovery';
    case 'building': return 'Building Foundation';
    case 'strengthening': return 'Strengthening';
    case 'thriving': return 'Thriving';
  }
}

const SHAME_KEYWORDS = [
  'disgusting', 'worthless', 'pathetic', 'hate myself', 'i\'m a failure',
  'i\'m broken', 'don\'t deserve', 'ashamed', 'embarrassed', 'damaged',
  'i\'m nothing', 'unlovable', 'i\'m weak', 'i\'m garbage', 'i\'m the worst',
  'i\'m dirty', 'i\'m a mess', 'i\'m disgusted',
];

const HOPELESSNESS_KEYWORDS = [
  'nothing works', 'i\'ll never change', 'what\'s the point', 'it\'s too late',
  'no hope', 'can\'t do this', 'give up', 'pointless', 'never get better',
  'always fail', 'no way out', 'stuck forever', 'can\'t escape',
  'doomed', 'hopeless', 'impossible',
];

const RUMINATION_KEYWORDS = [
  'keep thinking about', 'can\'t stop replaying', 'keep going back to',
  'obsessing over', 'stuck in my head', 'the last time i', 'remember when i',
  'thinking about my relapse', 'i keep remembering', 'haunts me',
  'can\'t get it out of my head', 'playing on repeat', 'over and over',
];

const SELF_CRITICISM_KEYWORDS = [
  'i\'m so stupid', 'should be better', 'everyone else can', 'i\'m behind',
  'not good enough', 'i should have', 'why can\'t i', 'what\'s wrong with me',
  'i\'m such an idiot', 'disappointed in myself', 'i always mess up',
  'i\'m the problem', 'it\'s my fault', 'i never do anything right',
];

const AVOIDANCE_KEYWORDS = [
  'don\'t want to think about', 'deal with it later', 'doesn\'t matter',
  'i\'m fine', 'whatever', 'don\'t care', 'not a big deal', 'i\'ll be okay',
  'rather not', 'skip it', 'not ready', 'can\'t face', 'too much',
  'leave me alone', 'don\'t want to talk',
];

const CRISIS_GUARDRAIL_KEYWORDS = [
  'suicide', 'kill myself', 'end it', 'want to die', 'self harm',
  'hurt myself', 'no reason to live', 'better off dead', 'overdose',
  'relapsed', 'using again', 'i used', 'i drank', 'i smoked',
];

const CRISIS_ESCALATION_RESPONSE: CompanionMessage = {
  id: '',
  content: "I hear you, and I'm glad you're reaching out. What you're feeling is real and it matters. Please talk to someone who can help right now.\n\nCall 988 (Suicide & Crisis Lifeline) or tap the Crisis button above. You don't have to face this alone.",
  type: 'crisis',
  timestamp: '',
  isUser: false,
};

export function detectCrisisKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_GUARDRAIL_KEYWORDS.some(kw => lower.includes(kw));
}

export function detectEmotionalPattern(text: string): EmotionalPattern {
  const lower = text.toLowerCase();
  if (SHAME_KEYWORDS.some(kw => lower.includes(kw))) return 'shame';
  if (HOPELESSNESS_KEYWORDS.some(kw => lower.includes(kw))) return 'hopelessness';
  if (RUMINATION_KEYWORDS.some(kw => lower.includes(kw))) return 'rumination';
  if (SELF_CRITICISM_KEYWORDS.some(kw => lower.includes(kw))) return 'self_criticism';
  if (AVOIDANCE_KEYWORDS.some(kw => lower.includes(kw))) return 'avoidance';
  return 'none';
}

export function generateCrisisResponse(): CompanionMessage {
  return {
    ...CRISIS_ESCALATION_RESPONSE,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
}

const GREETINGS: Record<RecoveryStage, string[]> = {
  early: [
    "Hey. Just being here takes courage. How are you feeling right now?",
    "Welcome back. Every time you show up, you're choosing yourself.",
    "I'm here. No judgment, no pressure. What's on your mind?",
  ],
  building: [
    "You're building something real. How's today going?",
    "Good to see you. You've come a long way already. What's present for you?",
    "Hey there. Your consistency is powerful. How are you today?",
  ],
  strengthening: [
    "You're getting stronger every day. What would feel good to talk about?",
    "Look at you showing up. Your dedication inspires me. How's today?",
    "Hey. You've been doing incredible work. What's on your heart today?",
  ],
  thriving: [
    "You're proof that change is possible. What would you like to explore?",
    "It's great to see you. Your journey is remarkable. How are things?",
    "Hey. You've built something beautiful. What's on your mind?",
  ],
};

const REFLECTIONS: Record<RecoveryStage, string[]> = {
  early: [
    "The first days are the hardest. What you're doing right now? It matters more than you know.",
    "You don't have to have it all figured out. Just this moment is enough.",
    "Your body and mind are healing right now, even when it doesn't feel like it.",
    "It's okay to feel uncomfortable. That discomfort is growth happening.",
    "You chose this path for a reason. That reason is still valid, even on hard days.",
  ],
  building: [
    "You're starting to see your own strength. Can you feel it?",
    "The patterns you're building now are becoming who you are.",
    "Some days are harder than others. That doesn't erase your progress.",
    "Notice how far you've come from day one. That distance is real.",
    "You're learning to sit with feelings instead of running from them. That's huge.",
  ],
  strengthening: [
    "Your recovery is becoming part of your identity now. That's powerful.",
    "You've proven you can handle difficult moments. Remember that.",
    "The clarity you're feeling? You earned every bit of it.",
    "You're not just surviving anymore. You're building a life you actually want.",
    "Your emotional resilience has grown so much. Can you see it?",
  ],
  thriving: [
    "You've transformed struggle into strength. That's extraordinary.",
    "Your experience can light the way for someone else someday.",
    "Freedom looks different than you imagined, doesn't it? And it's better.",
    "You've proven that the hardest thing you ever did was worth it.",
    "The person you are today would make your day-one self proud.",
  ],
};

const IDENTITY_REINFORCEMENTS: Record<RecoveryStage, string[]> = {
  early: [
    "You are not your addiction. You are the person who decided to fight it.",
    "Choosing recovery shows incredible inner strength.",
    "You're already someone who shows up for themselves.",
    "The fact that you're here says everything about who you really are.",
  ],
  building: [
    "You're becoming someone who faces things head-on. That's your new identity.",
    "Every sober day is proof that you're stronger than what tried to break you.",
    "You're rewriting your story, one day at a time.",
    "The discipline you're building? That's the real you emerging.",
  ],
  strengthening: [
    "You are a person of deep resilience. Your journey proves it.",
    "Recovery isn't something you do. It's who you're becoming.",
    "You've earned the right to trust yourself again.",
    "The person staring back in the mirror has been through fire and came out stronger.",
  ],
  thriving: [
    "You are living proof that people can change. Deeply, truly change.",
    "Your identity is no longer defined by your past. You defined it yourself.",
    "You are someone others can look up to. That matters.",
    "The strength inside you was always there. Recovery just revealed it.",
  ],
};

const REFRAMES: Record<RiskLevel, string[]> = {
  low: [
    "Even on good days, it's healthy to check in with yourself. You're doing that right now.",
    "Stability isn't the absence of challenges. It's knowing you can handle them.",
    "This calm you feel? You built it. It's not luck.",
  ],
  moderate: [
    "A tough moment doesn't undo your progress. It's just a moment.",
    "What feels overwhelming right now will look different tomorrow.",
    "Your feelings are visitors. Notice them, but you don't have to invite them to stay.",
    "The urge to escape is natural. But you've learned you don't need to act on it.",
  ],
  elevated: [
    "Right now feels hard. And that's valid. But you've survived every hard moment before this one.",
    "This feeling will pass. It always does. You just need to ride it out.",
    "You're not failing. You're being tested. And you're still here.",
    "One breath at a time. That's all you need to do right now.",
  ],
  high: [
    "I can see things are really tough right now. That takes strength to admit.",
    "You reached out. That's the opposite of giving up.",
    "You don't have to figure everything out right now. Just stay safe this moment.",
    "Please be gentle with yourself. You deserve that kindness.",
  ],
  crisis: [
    "You're in pain right now, and that's okay to say out loud.",
    "Please reach out to someone you trust, or call 988. You matter.",
    "This moment is not forever. Help is available right now.",
  ],
};

const SHAME_RESPONSES: Record<RecoveryStage, string[]> = {
  early: [
    "Shame wants you to hide. But you showed up here. That's the opposite of what shame wants.",
    "What you're feeling isn't the truth about who you are. It's the echo of something painful.",
    "You are not what happened to you. You are what you choose to become, starting right now.",
    "Shame thrives in silence. The fact that you're talking about it is already weakening it.",
  ],
  building: [
    "That voice telling you you're not enough? It's lying. Your progress says otherwise.",
    "Shame is a feeling, not a fact. You've already proven you're capable of change.",
    "The person who did those things and the person sitting here now are not the same. You've grown.",
  ],
  strengthening: [
    "You've come too far to let shame rewrite your story. You know who you are now.",
    "Shame loses its power every time you face it. And you've been facing it beautifully.",
    "Your past doesn't disqualify you from a good future. Your present proves that.",
  ],
  thriving: [
    "Even after everything, shame still visits sometimes. But it doesn't live here anymore.",
    "You've transformed the very thing shame tried to define you by. That's extraordinary.",
    "Shame is a chapter in your story — not the title. You wrote something better.",
  ],
};

const HOPELESSNESS_RESPONSES: Record<RecoveryStage, string[]> = {
  early: [
    "I hear you. It feels endless right now. But you're only seeing this moment — not what's ahead.",
    "The first days feel like the hardest because they are. That doesn't mean it stays this way.",
    "You don't need to believe it will get better right now. Just stay one more hour. Then one more.",
    "Hopelessness is a symptom of pain, not a prediction of your future.",
  ],
  building: [
    "Look at the days behind you. Each one felt impossible once, and you did it anyway.",
    "This moment of doubt doesn't erase what you've built. It's just fog — it lifts.",
    "You've already proven hopelessness wrong. You're still here.",
  ],
  strengthening: [
    "Sometimes progress makes the remaining distance feel longer. But you're closer than you think.",
    "You've survived seasons of doubt before. This one will pass too.",
    "Your track record of surviving bad days is 100%. Trust that.",
  ],
  thriving: [
    "Even in thriving, doubt visits. It doesn't stay. You know this by now.",
    "You've rebuilt from nothing. A moment of hopelessness can't undo that architecture.",
  ],
};

const RUMINATION_RESPONSES: Record<RecoveryStage, string[]> = {
  early: [
    "Your mind is replaying old tapes. That's normal — your brain is still processing. Let's redirect gently.",
    "Replaying the past keeps you there. Right now, you're here. This moment is new.",
    "What happened before doesn't have to happen again. You're different now — even if just by a day.",
    "Try naming what you're feeling instead of replaying what happened. It shifts the loop.",
  ],
  building: [
    "Your mind is trying to solve something from the past. But the answer is in today, not yesterday.",
    "Rumination feels productive but it's not. What would help you feel grounded right now?",
    "Notice the loop. Name it: 'I'm ruminating.' That alone gives you some distance from it.",
  ],
  strengthening: [
    "You've learned to catch these spirals earlier and earlier. That's growth.",
    "The past is a place of reference, not residence. You don't live there anymore.",
  ],
  thriving: [
    "Occasional replays are normal. They don't have the power they used to. Notice, acknowledge, release.",
    "You've already rewritten that chapter. Let the old draft go.",
  ],
};

const SELF_CRITICISM_RESPONSES: Record<RecoveryStage, string[]> = {
  early: [
    "Would you say that to a friend who was trying their hardest? Be that friend to yourself.",
    "Recovery isn't about being perfect. It's about showing up imperfectly and trying anyway.",
    "That inner critic is loud right now. But it doesn't know the whole story — you do.",
    "The standard you're holding yourself to? It's not fair. Give yourself the grace you'd give someone else.",
  ],
  building: [
    "You're comparing yourself to an impossible standard. Compare yourself to where you started instead.",
    "Self-criticism feels like motivation, but it's actually sabotage. Try curiosity instead of judgment.",
    "You're doing something most people never attempt. That deserves respect, not criticism.",
  ],
  strengthening: [
    "You've built the skill to notice this pattern. Now practice replacing it with self-compassion.",
    "Your inner critic is an old survival mechanism. You've outgrown it. Time for a gentler voice.",
  ],
  thriving: [
    "That critical voice is familiar, but it's not yours anymore. You've chosen a different narrative.",
    "Catching self-criticism is a sign of awareness. Releasing it is a sign of wisdom. You have both.",
  ],
};

const AVOIDANCE_RESPONSES: Record<RecoveryStage, string[]> = {
  early: [
    "It's okay to not be ready. But I want you to know — this space is safe whenever you are.",
    "Avoidance protects you short-term. When you're ready, facing things heals you long-term.",
    "You don't have to go deep right now. Even acknowledging 'this is hard' is enough.",
    "I notice you might be pulling back. That's a natural instinct. I'll be here when you're ready.",
  ],
  building: [
    "Sometimes 'I'm fine' is the hardest thing to say honestly. Check in with what's underneath.",
    "Avoidance is your old coping. You're building new ones. Take it at your pace.",
    "What would happen if you let yourself feel this, just for 30 seconds? You can always step back.",
  ],
  strengthening: [
    "You know by now that avoiding doesn't make things go away. What are you protecting yourself from?",
    "You've faced harder things than this. Trust your capacity to sit with discomfort.",
  ],
  thriving: [
    "Even experienced recoverers avoid sometimes. Noticing it is the first step. You're already there.",
    "You have the tools now. When you're ready, you'll know what to do.",
  ],
};

const PATTERN_OBSERVATIONS: string[] = [
  "I notice you tend to feel stronger in the mornings. How can we protect that energy?",
  "Your check-ins show you're more resilient than you think.",
  "You've been consistent lately. That consistency is building something solid.",
  "I see some ups and downs in your recent days. That's completely normal in recovery.",
  "Your craving levels have been shifting. Let's talk about what helps you most.",
  "You've been showing up regularly. That pattern of commitment says a lot about you.",
  "I notice the days you journal tend to be your stronger days. Have you noticed that too?",
  "Your stability has been growing over time. The data confirms what you probably feel inside.",
];

const ENCOURAGEMENTS_BY_RISK: Record<RiskLevel, string[]> = {
  low: [
    "You're in a good place. Enjoy it. You earned it.",
    "Keep doing what you're doing. It's clearly working.",
    "Your consistency is your superpower right now.",
  ],
  moderate: [
    "You've got this. One step, one moment at a time.",
    "Remember: you've handled harder days than this.",
    "Lean into your routines today. They'll carry you.",
  ],
  elevated: [
    "Today might be hard, but you are harder to break.",
    "Reach out to someone today. Connection is medicine.",
    "Use your tools. Breathe. Ground. You know how to do this.",
  ],
  high: [
    "Please don't carry this alone. Talk to someone today.",
    "You are worth fighting for. Even when it doesn't feel like it.",
    "One minute at a time. Just get through this minute.",
  ],
  crisis: [
    "Please tap the Crisis button or call 988 right now.",
    "You don't have to face this alone. Help is one call away.",
    "Your life matters. Please reach out to someone immediately.",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateGreeting(stage: RecoveryStage): CompanionMessage {
  return {
    id: Date.now().toString(),
    content: pickRandom(GREETINGS[stage]),
    type: 'greeting',
    timestamp: new Date().toISOString(),
    isUser: false,
  };
}

export function generateContextualResponse(
  userMessage: string,
  stage: RecoveryStage,
  risk: RiskLevel,
  daysSober: number,
  recentCheckIns: DailyCheckIn[],
): CompanionMessage {
  if (detectCrisisKeywords(userMessage)) {
    return generateCrisisResponse();
  }

  const emotionalPattern = detectEmotionalPattern(userMessage);
  console.log('[Companion] Detected emotional pattern:', emotionalPattern, 'Stage:', stage, 'Risk:', risk);

  if (emotionalPattern === 'shame') {
    return makeResponse(pickRandom(SHAME_RESPONSES[stage]), 'shame_response');
  }
  if (emotionalPattern === 'hopelessness') {
    return makeResponse(pickRandom(HOPELESSNESS_RESPONSES[stage]), 'hopelessness_response');
  }
  if (emotionalPattern === 'rumination') {
    return makeResponse(pickRandom(RUMINATION_RESPONSES[stage]), 'rumination_response');
  }
  if (emotionalPattern === 'self_criticism') {
    return makeResponse(pickRandom(SELF_CRITICISM_RESPONSES[stage]), 'self_criticism_response');
  }
  if (emotionalPattern === 'avoidance') {
    return makeResponse(pickRandom(AVOIDANCE_RESPONSES[stage]), 'avoidance_response');
  }

  const lower = userMessage.toLowerCase();

  if (lower.includes('craving') || lower.includes('urge') || lower.includes('tempt')) {
    const responses = [
      "Cravings are like waves. They build, they peak, and they always pass. You just need to ride this one out.",
      "What you're feeling right now is your brain's old wiring. It doesn't represent who you are anymore.",
      "Try the 5-4-3-2-1 grounding technique. Focus on what you can see, touch, hear, smell, taste.",
      `You've made it ${daysSober} days. This craving doesn't get to take that from you.`,
      "Can you change your environment right now? Even a short walk can shift the moment.",
    ];
    return makeResponse(pickRandom(responses), 'reframe');
  }

  if (lower.includes('lonely') || lower.includes('alone') || lower.includes('isolat')) {
    const responses = [
      "Loneliness is one of recovery's toughest challenges. You're not alone in feeling alone.",
      "Have you reached out to anyone today? Even a short text can break the isolation.",
      "Connection is part of healing. Consider checking your trusted circle.",
      "I'm here with you. And there are people in your life who care, even when it's hard to feel it.",
    ];
    return makeResponse(pickRandom(responses), 'reframe');
  }

  if (lower.includes('angry') || lower.includes('frustrated') || lower.includes('mad')) {
    const responses = [
      "Anger often protects something softer underneath. What might that be for you?",
      "It's okay to feel angry. The key is what you do with it. What would help right now?",
      "Your anger makes sense. Recovery stirs up a lot. Give yourself permission to feel it.",
      "Try putting your hands in cold water for 30 seconds. It can reset your nervous system.",
    ];
    return makeResponse(pickRandom(responses), 'reframe');
  }

  if (lower.includes('scared') || lower.includes('anxious') || lower.includes('worry') || lower.includes('fear')) {
    const responses = [
      "Fear means you care about something. What is it that matters to you right now?",
      "Anxiety shrinks when you name it. What specifically feels scary?",
      "Take three slow breaths. In for 4, hold for 4, out for 6. I'll wait.",
      "You've survived 100% of your worst days. This feeling will pass too.",
    ];
    return makeResponse(pickRandom(responses), 'reframe');
  }

  if (lower.includes('proud') || lower.includes('good') || lower.includes('happy') || lower.includes('great')) {
    const responses = [
      `That's beautiful to hear. You've earned this feeling. ${daysSober} days of choosing yourself.`,
      "Hold onto this moment. Remember it on harder days. This is who you really are.",
      "Joy in recovery is sacred. Let yourself feel all of it.",
      "Your hard work is paying off. I'm genuinely happy for you.",
    ];
    return makeResponse(pickRandom(responses), 'encouragement');
  }

  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('drained')) {
    const responses = [
      "Recovery is real work. It's okay to be tired. Rest is part of healing.",
      "Your brain is literally rewiring itself. That takes enormous energy. Be patient with yourself.",
      "What's one small thing you can do to care for yourself right now?",
      "Sometimes the bravest thing is to rest. You don't always have to push.",
    ];
    return makeResponse(pickRandom(responses), 'reflection');
  }

  if (lower.includes('who am i') || lower.includes('identity') || lower.includes('lost') || lower.includes('don\'t know')) {
    return makeResponse(pickRandom(IDENTITY_REINFORCEMENTS[stage]), 'identity');
  }

  if (lower.includes('pattern') || lower.includes('notice') || lower.includes('trend')) {
    return makeResponse(pickRandom(PATTERN_OBSERVATIONS), 'pattern');
  }

  const typeRoll = Math.random();
  if (typeRoll < 0.25) {
    return makeResponse(pickRandom(REFLECTIONS[stage]), 'reflection');
  } else if (typeRoll < 0.45) {
    return makeResponse(pickRandom(IDENTITY_REINFORCEMENTS[stage]), 'identity');
  } else if (typeRoll < 0.65) {
    return makeResponse(pickRandom(REFRAMES[risk]), 'reframe');
  } else if (typeRoll < 0.85) {
    return makeResponse(pickRandom(ENCOURAGEMENTS_BY_RISK[risk]), 'encouragement');
  } else {
    return makeResponse(pickRandom(PATTERN_OBSERVATIONS), 'pattern');
  }
}

function makeResponse(content: string, type: CompanionMessageType): CompanionMessage {
  return {
    id: Date.now().toString(),
    content,
    type,
    timestamp: new Date().toISOString(),
    isUser: false,
  };
}

export function generateCrisisSupportMessage(step: string, breathCount?: number): string {
  switch (step) {
    case 'landing':
      return "You made the right choice coming here. Let's take this one step at a time.";
    case 'breathing':
      if (breathCount && breathCount > 2) {
        return "Beautiful. Your nervous system is calming down. You're doing so well.";
      }
      return "Focus on the breath. Nothing else matters right now. Just breathe.";
    case 'grounding':
      return "Reconnecting with your senses pulls you back to the present. Stay here with me.";
    case 'urge-timer':
      return "Every second that passes, the wave gets smaller. You're outlasting it.";
    case 'reset':
      return "Let these words replace the noise. You are more than this moment.";
    case 'connect':
      return "Reaching out is strength, not weakness. You deserve support.";
    default:
      return "I'm right here with you. You're not alone.";
  }
}

export const COMPANION_QUICK_PROMPTS = [
  "I'm feeling triggered",
  "I need encouragement",
  "Who am I becoming?",
  "I feel lonely today",
  "Help me reframe this",
  "I'm proud of myself",
  "I feel ashamed",
  "Nothing works",
];

export function getEmotionalInsight(
  checkIns: DailyCheckIn[],
  stage: RecoveryStage,
  risk: RiskLevel,
): { insight: string; supportType: CompanionMessageType } {
  const recent = checkIns.slice(0, 5);
  if (recent.length < 2) {
    return { insight: pickRandom(REFLECTIONS[stage]), supportType: 'reflection' };
  }

  const avgMood = recent.reduce((s, c) => s + c.mood, 0) / recent.length;
  const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
  const avgEmotional = recent.reduce((s, c) => s + c.emotionalState, 0) / recent.length;
  const moodTrend = recent[0].mood - recent[recent.length - 1].mood;

  if (avgMood < 30 && avgEmotional < 30) {
    return {
      insight: pickRandom(HOPELESSNESS_RESPONSES[stage]),
      supportType: 'hopelessness_response',
    };
  }

  // Look for emotional tag patterns across a slightly wider window
  const tagWindow = checkIns.slice(0, 20);
  let highCravingDays = 0;
  let anxiousOnHighCravingDays = 0;
  let lonelyDays = 0;
  let lonelyHighCravingDays = 0;
  let lowMoodDays = 0;
  let numbOnLowMoodDays = 0;

  for (const entry of tagWindow) {
    const tags = entry.emotionalTags ?? [];
    const hasAnxious = tags.includes('anxious');
    const hasLonely = tags.includes('lonely');
    const hasNumb = tags.includes('numb');
    const highCraving = entry.cravingLevel >= 70;
    const lowMood = entry.mood <= 30;

    if (highCraving) {
      highCravingDays += 1;
      if (hasAnxious) {
        anxiousOnHighCravingDays += 1;
      }
      if (hasLonely) {
        lonelyHighCravingDays += 1;
      }
    }

    if (hasLonely) {
      lonelyDays += 1;
    }

    if (lowMood) {
      lowMoodDays += 1;
      if (hasNumb) {
        numbOnLowMoodDays += 1;
      }
    }
  }

  if (highCravingDays >= 3 && anxiousOnHighCravingDays / highCravingDays >= 0.6) {
    return {
      insight: "You often tag feeling anxious on days when your cravings spike. Planning grounding or connection time on anxious days might help soften those waves.",
      supportType: 'pattern',
    };
  }

  if (lonelyDays >= 3 && lonelyHighCravingDays >= 2 && lonelyHighCravingDays / lonelyDays >= 0.5) {
    return {
      insight: "There’s a pattern where loneliness and stronger cravings tend to show up together for you. Building in small moments of connection on lonely days could protect your recovery.",
      supportType: 'pattern',
    };
  }

  if (lowMoodDays >= 3 && numbOnLowMoodDays >= 2 && numbOnLowMoodDays / lowMoodDays >= 0.5) {
    return {
      insight: "On lower-mood days you often tag feeling numb or shut down. Gentle, low-effort activities that reconnect you with your body or people you trust might help you feel less stuck.",
      supportType: 'pattern',
    };
  }

  if (avgCraving > 70 && moodTrend < -15) {
    return {
      insight: pickRandom([
        "Your cravings have been intense lately while your mood dips. This is a critical moment — reach out to someone.",
        "I see a pattern: rising cravings with falling mood. Let's use your tools right now.",
        "This combination of high cravings and low mood is your signal. Use your crisis plan.",
      ]),
      supportType: 'reframe',
    };
  }

  if (moodTrend > 10) {
    return {
      insight: pickRandom([
        "Your mood has been climbing. Whatever you're doing, keep doing it.",
        "I see positive momentum in your recent check-ins. You're moving in the right direction.",
      ]),
      supportType: 'encouragement',
    };
  }

  if (risk === 'high' || risk === 'crisis') {
    return {
      insight: pickRandom(REFRAMES[risk]),
      supportType: 'reframe',
    };
  }

  return {
    insight: pickRandom(ENCOURAGEMENTS_BY_RISK[risk]),
    supportType: 'encouragement',
  };
}

export function generateRebuildEncouragement(
  stage: RecoveryStage,
  risk: RiskLevel,
  context: 'habit_complete' | 'routine_done' | 'goal_progress' | 'exercise_done' | 'milestone',
): string {
  const encouragements: Record<typeof context, string[]> = {
    habit_complete: [
      "Every time you choose the replacement, you rewire a little more. That's real.",
      "You just chose who you want to be over who you used to be. Powerful.",
      "That habit replacement? It's building neural pathways. Science-backed progress.",
    ],
    routine_done: [
      "Structure is your armor. You just put another piece in place.",
      "Routine completed. Your future self thanks you.",
      "Consistency is the quiet superpower of recovery. You just used it.",
    ],
    goal_progress: [
      "One step closer. Recovery gave you the clarity to want this. Now you're getting it.",
      "Every goal step is proof that your life has direction now.",
      "Progress on your goals means recovery is giving you your life back.",
    ],
    exercise_done: [
      "That reflection just deepened your self-understanding. This is how identity rebuilds.",
      "The person writing those words is someone worth knowing. Keep going.",
      "Self-discovery is the foundation of lasting change. You're laying it down.",
    ],
    milestone: [
      "You just recorded a win. On hard days, come back and read these.",
      "Confidence isn't born — it's built from moments exactly like this one.",
      "This milestone is evidence. You are changing.",
    ],
  };

  const base = pickRandom(encouragements[context]);

  if (risk === 'high' || risk === 'elevated') {
    return base + " Even on tough days, you're moving forward. That takes real courage.";
  }

  return base;
}
