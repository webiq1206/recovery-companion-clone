import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Stack, useRouter as useRebuildRouter, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import {
  Hammer,
  Plus,
  Check,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Target,
  Award,
  Zap,
  ArrowRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  Flame,
  Sparkles,
  RefreshCw,
  X,
  Star,
  Heart,
  Brain,
  Users,
  Palette,
  Leaf,
  Briefcase,
  BookOpen,
  User,
  Compass,
  Shield,
  Feather,
  ChevronRight,
  Lock,
  PenLine,
  Eye,
  Play,
  Settings,
} from 'lucide-react-native';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { useRebuild } from '@/core/domains/useRebuild';
import { useSubscription } from '@/providers/SubscriptionProvider';
import Colors from '@/constants/colors';
import {
  getRecoveryStage,
  getRiskLevel,
  generateRebuildEncouragement,
} from '@/constants/companion';
import {
  ReplacementHabit,
  RoutineBlock,
  PurposeGoal,
  GoalStep,
  ConfidenceMilestone,
  IdentityModule,
  IdentityExercise,
  IdentityExerciseResponse,
  IdentityValue,
} from '@/types';
import { IDENTITY_MODULES, CATEGORY_INFO } from '@/constants/identityModules';
import * as Haptics from 'expo-haptics';
import { RebuildExerciseModal } from '@/features/rebuild/ui/RebuildExerciseModal';
import { RebuildValueModal } from '@/features/rebuild/ui/RebuildValueModal';
import { RebuildAddHabitModal } from '@/features/rebuild/ui/RebuildAddHabitModal';
import { RebuildAddRoutineModal } from '@/features/rebuild/ui/RebuildAddRoutineModal';
import { RebuildAddGoalModal } from '@/features/rebuild/ui/RebuildAddGoalModal';
import { RebuildAddMilestoneModal } from '@/features/rebuild/ui/RebuildAddMilestoneModal';
import { RebuildHeroCard } from '@/features/rebuild/ui/RebuildHeroCard';
import { RebuildSectionTabs } from '@/features/rebuild/ui/RebuildSectionTabs';
import { RebuildEncouragementToast } from '@/features/rebuild/ui/RebuildEncouragementToast';
import { RebuildHabitsSection } from '@/features/rebuild/ui/sections/RebuildHabitsSection';
import { RebuildRoutineSection } from '@/features/rebuild/ui/sections/RebuildRoutineSection';
import { RebuildGoalsSection } from '@/features/rebuild/ui/sections/RebuildGoalsSection';
import { RebuildConfidenceSection } from '@/features/rebuild/ui/sections/RebuildConfidenceSection';
import { RebuildProgramWelcome } from '@/features/rebuild/ui/sections/RebuildProgramWelcome';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ActiveSection = 'program' | 'habits' | 'routine' | 'goals' | 'confidence';
type HabitCategory = ReplacementHabit['category'];
type TimeOfDay = RoutineBlock['time'];
type GoalCategory = PurposeGoal['category'];

const HABIT_CATEGORIES: { key: HabitCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'physical', label: 'Physical', icon: <Zap size={16} color={Colors.primary} /> },
  { key: 'mental', label: 'Mental', icon: <Brain size={16} color="#7C9AF2" /> },
  { key: 'social', label: 'Social', icon: <Users size={16} color="#F2A07C" /> },
  { key: 'creative', label: 'Creative', icon: <Palette size={16} color="#D47CF2" /> },
  { key: 'spiritual', label: 'Spiritual', icon: <Leaf size={16} color="#7CF2B5" /> },
];

const GOAL_CATEGORIES: { key: GoalCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'career', label: 'Career', icon: <Briefcase size={16} color={Colors.accentWarm} /> },
  { key: 'health', label: 'Health', icon: <Heart size={16} color={Colors.danger} /> },
  { key: 'relationships', label: 'Relationships', icon: <Users size={16} color="#F2A07C" /> },
  { key: 'learning', label: 'Learning', icon: <BookOpen size={16} color="#7C9AF2" /> },
  { key: 'personal', label: 'Personal', icon: <User size={16} color={Colors.primary} /> },
];

const TIME_OPTIONS: { key: TimeOfDay; label: string; icon: React.ReactNode }[] = [
  { key: 'morning', label: 'Morning', icon: <Sunrise size={16} color="#FFD97D" /> },
  { key: 'afternoon', label: 'Afternoon', icon: <Sun size={16} color="#FFA94D" /> },
  { key: 'evening', label: 'Evening', icon: <Sunset size={16} color="#C084FC" /> },
  { key: 'night', label: 'Night', icon: <Moon size={16} color="#7C9AF2" /> },
];

const EXERCISE_TYPE_ICONS: Record<string, React.ReactNode> = {
  reflection: <Eye size={14} color="#82B1FF" />,
  writing: <PenLine size={14} color="#B9F6CA" />,
  action: <Play size={14} color="#FFD180" />,
  visualization: <Compass size={14} color="#EA80FC" />,
};

const IDENTITY_AFFIRMATIONS = [
  "You're building someone new - stronger, freer.",
  "Every small choice rewires who you are.",
  "Structure isn't restriction - it's freedom.",
  "The person you're becoming already exists inside you.",
  "Replacement isn't avoidance - it's evolution.",
  "You don't need to be perfect, just intentional.",
  "Each routine is a vote for your new identity.",
  "Progress is built one honest moment at a time.",
];

function getAffirmation(seed: number): string {
  return IDENTITY_AFFIRMATIONS[seed % IDENTITY_AFFIRMATIONS.length];
}

export default function RebuildScreen() {
  const {
    rebuildData,
    addReplacementHabit,
    updateReplacementHabit,
    deleteReplacementHabit,
    addRoutineBlock,
    updateRoutineBlock,
    deleteRoutineBlock,
    addPurposeGoal,
    updatePurposeGoal,
    deletePurposeGoal,
    addConfidenceMilestone,
    startIdentityProgram,
    saveExerciseResponse,
    completeModule,
    advanceIdentityWeek,
    addIdentityValue,
    removeIdentityValue,
  } = useRebuild();
  const rebuildRouter = useRebuildRouter();
  const rawFromSetback = useLocalSearchParams<{ fromSetback?: string | string[] }>().fromSetback;
  const fromSetbackParam = Array.isArray(rawFromSetback) ? rawFromSetback[0] : rawFromSetback;
  const showSetbackClose = fromSetbackParam === '1' || fromSetbackParam === 'true';

  /**
   * From Log a Setback: haptics + back (X), then a second back after navigation settles (matches Accountability).
   * Otherwise: haptics + replace to Today home.
   */
  const handleRebuildHeaderClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showSetbackClose) {
      rebuildRouter.back();
      InteractionManager.runAfterInteractions(() => {
        rebuildRouter.back();
      });
      return;
    }
    rebuildRouter.replace('/(tabs)/(home)/today-hub' as never);
  }, [rebuildRouter, showSetbackClose]);

  /** Same control as daily check-in close: 36 circle, card bg, muted X. Centered title. */
  const rebuildHeaderScreenOptions = useMemo(
    () => ({
      headerTitleAlign: 'center' as const,
      headerBackVisible: false,
      headerLeftContainerStyle: { paddingLeft: 8 },
      headerLeft: () => (
        <Pressable
          onPress={handleRebuildHeaderClose}
          hitSlop={12}
          testID={showSetbackClose ? 'rebuild-close-from-setback' : 'rebuild-close-home'}
          style={({ pressed }) => [styles.headerCloseBtn, pressed && { opacity: 0.85 }]}
        >
          <X size={22} color={Colors.textSecondary} />
        </Pressable>
      ),
    }),
    [handleRebuildHeaderClose, showSetbackClose],
  );

  const { daysSober } = useUser();
  const { checkIns } = useCheckin();

  const [activeSection, setActiveSection] = useState<ActiveSection>('program');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  const [newHabitTrigger, setNewHabitTrigger] = useState('');
  const [newHabitReplacement, setNewHabitReplacement] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState<HabitCategory>('physical');

  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState<TimeOfDay>('morning');

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>('personal');
  const [newGoalSteps, setNewGoalSteps] = useState<string[]>(['']);

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');

  const [encouragementMessage, setEncouragementMessage] = useState<string>('');
  const encouragementFade = useRef(new Animated.Value(0)).current;
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<{ module: IdentityModule; exercise: IdentityExercise } | null>(null);
  const [exerciseInput, setExerciseInput] = useState('');
  const [showValueModal, setShowValueModal] = useState(false);
  const [newValueLabel, setNewValueLabel] = useState('');
  const [newValueImportance, setNewValueImportance] = useState(3);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const affirmationIndex = useMemo(() => daysSober, [daysSober]);

  const stage = useMemo(() => getRecoveryStage(daysSober), [daysSober]);
  const riskLevel = useMemo(() => getRiskLevel(checkIns, daysSober), [checkIns, daysSober]);

  const dismissEncouragement = useCallback(() => {
    Animated.timing(encouragementFade, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setEncouragementMessage('');
    });
  }, [encouragementFade]);

  const showEncouragement = useCallback(
    (context: 'habit_complete' | 'routine_done' | 'goal_progress' | 'exercise_done' | 'milestone') => {
      const msg = generateRebuildEncouragement(stage, riskLevel, context);
      encouragementFade.stopAnimation();
      setEncouragementMessage(msg);
      encouragementFade.setValue(0);
      Animated.timing(encouragementFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    },
    [stage, riskLevel, encouragementFade],
  );

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const identityProgram = useMemo(() => {
    return rebuildData.identityProgram ?? {
      currentWeek: 1,
      startedAt: '',
      exerciseResponses: [],
      values: [],
      completedModuleIds: [],
    };
  }, [rebuildData.identityProgram]);

  const programStarted = identityProgram.startedAt !== '';

  const stats = useMemo(() => {
    const activeHabits = rebuildData.habits.filter(h => h.isActive).length;
    const totalStreakDays = rebuildData.habits.reduce((s, h) => s + h.streak, 0);
    const routinesDone = rebuildData.routines.filter(r => r.isCompleted).length;
    const totalRoutines = rebuildData.routines.length;
    const goalsCompleted = rebuildData.goals.filter(g => g.isCompleted).length;
    const totalGoals = rebuildData.goals.length;
    const milestoneCount = rebuildData.confidenceMilestones.length;
    return { activeHabits, totalStreakDays, routinesDone, totalRoutines, goalsCompleted, totalGoals, milestoneCount };
  }, [rebuildData]);

  const programProgress = useMemo(() => {
    const totalModules = IDENTITY_MODULES.length;
    const completedCount = identityProgram.completedModuleIds.length;
    const totalExercises = IDENTITY_MODULES.reduce((sum, m) => sum + m.exercises.length, 0);
    const completedExercises = identityProgram.exerciseResponses.length;
    return {
      modulesCompleted: completedCount,
      totalModules,
      exercisesCompleted: completedExercises,
      totalExercises,
      percentage: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
    };
  }, [identityProgram]);

  const identityGrowthScore = useMemo(() => {
    let score = 0;
    const catScores: Record<string, number> = { self_worth: 0, values: 0, purpose: 0, life_goals: 0 };
    IDENTITY_MODULES.forEach(mod => {
      const exercisesInMod = mod.exercises.length;
      const completedInMod = mod.exercises.filter(ex =>
        identityProgram.exerciseResponses.some(r => r.moduleId === mod.id && r.exerciseId === ex.id)
      ).length;
      const modScore = exercisesInMod > 0 ? (completedInMod / exercisesInMod) * 25 : 0;
      catScores[mod.category] = Math.max(catScores[mod.category], modScore);
    });
    score = Object.values(catScores).reduce((s, v) => s + v, 0);
    score += Math.min(stats.activeHabits * 2, 10);
    score += Math.min(identityProgram.values.length * 2, 10);
    return Math.min(100, Math.round(score));
  }, [identityProgram, stats.activeHabits]);

  const identityScore = useMemo(() => {
    let score = 0;
    score += Math.min(stats.activeHabits * 10, 25);
    score += stats.totalRoutines > 0 ? Math.min((stats.routinesDone / stats.totalRoutines) * 25, 25) : 0;
    score += stats.totalGoals > 0 ? Math.min((stats.goalsCompleted / stats.totalGoals) * 25, 25) : 0;
    score += Math.min(stats.milestoneCount * 5, 25);
    return Math.round(score);
  }, [stats]);

  const combinedScore = useMemo(() => {
    return Math.round((identityScore + identityGrowthScore) / 2);
  }, [identityScore, identityGrowthScore]);

  const getModuleExerciseCount = useCallback((moduleId: string) => {
    const mod = IDENTITY_MODULES.find(m => m.id === moduleId);
    if (!mod) return { done: 0, total: 0 };
    const done = mod.exercises.filter(ex =>
      identityProgram.exerciseResponses.some(r => r.moduleId === moduleId && r.exerciseId === ex.id)
    ).length;
    return { done, total: mod.exercises.length };
  }, [identityProgram.exerciseResponses]);

  const isExerciseCompleted = useCallback((moduleId: string, exerciseId: string) => {
    return identityProgram.exerciseResponses.some(
      r => r.moduleId === moduleId && r.exerciseId === exerciseId
    );
  }, [identityProgram.exerciseResponses]);

  const getExerciseResponse = useCallback((moduleId: string, exerciseId: string) => {
    return identityProgram.exerciseResponses.find(
      r => r.moduleId === moduleId && r.exerciseId === exerciseId
    );
  }, [identityProgram.exerciseResponses]);

  const handleStartProgram = useCallback(() => {
    startIdentityProgram();
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [startIdentityProgram]);

  const handleSaveExercise = useCallback(() => {
    if (!activeExercise || !exerciseInput.trim()) return;
    const response: IdentityExerciseResponse = {
      moduleId: activeExercise.module.id,
      exerciseId: activeExercise.exercise.id,
      response: exerciseInput.trim(),
      completedAt: new Date().toISOString(),
    };
    saveExerciseResponse(response);

    const mod = activeExercise.module;
    const allDone = mod.exercises.every(ex => {
      if (ex.id === activeExercise.exercise.id) return true;
      return isExerciseCompleted(mod.id, ex.id);
    });
    if (allDone && !identityProgram.completedModuleIds.includes(mod.id)) {
      completeModule(mod.id);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setActiveExercise(null);
    setExerciseInput('');
    showEncouragement('exercise_done');
  }, [activeExercise, exerciseInput, saveExerciseResponse, completeModule, isExerciseCompleted, identityProgram.completedModuleIds, showEncouragement]);

  const handleOpenExercise = useCallback((module: IdentityModule, exercise: IdentityExercise) => {
    const existing = getExerciseResponse(module.id, exercise.id);
    setExerciseInput(existing?.response ?? '');
    setActiveExercise({ module, exercise });
  }, [getExerciseResponse]);

  const handleAddValue = useCallback(() => {
    if (!newValueLabel.trim()) return;
    const value: IdentityValue = {
      id: Date.now().toString(),
      label: newValueLabel.trim(),
      importance: newValueImportance,
      addedAt: new Date().toISOString(),
    };
    addIdentityValue(value);
    setNewValueLabel('');
    setNewValueImportance(3);
    setShowValueModal(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newValueLabel, newValueImportance, addIdentityValue]);

  const handleAddHabit = useCallback(() => {
    if (!newHabitTrigger.trim() || !newHabitReplacement.trim()) return;
    const habit: ReplacementHabit = {
      id: Date.now().toString(),
      oldTrigger: newHabitTrigger.trim(),
      newHabit: newHabitReplacement.trim(),
      category: newHabitCategory,
      streak: 0,
      lastCompleted: '',
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    addReplacementHabit(habit);
    setNewHabitTrigger('');
    setNewHabitReplacement('');
    setNewHabitCategory('physical');
    setShowAddHabit(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [newHabitTrigger, newHabitReplacement, newHabitCategory, addReplacementHabit]);

  const handleCompleteHabit = useCallback((habit: ReplacementHabit) => {
    const today = new Date().toISOString().split('T')[0];
    const lastDay = habit.lastCompleted ? habit.lastCompleted.split('T')[0] : '';
    if (lastDay === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const newStreak = lastDay === yesterdayStr ? habit.streak + 1 : 1;
    updateReplacementHabit(habit.id, {
      streak: newStreak,
      lastCompleted: new Date().toISOString(),
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showEncouragement('habit_complete');
  }, [updateReplacementHabit, showEncouragement]);

  const handleAddRoutine = useCallback(() => {
    if (!newRoutineTitle.trim()) return;
    const block: RoutineBlock = {
      id: Date.now().toString(),
      time: newRoutineTime,
      title: newRoutineTitle.trim(),
      description: newRoutineDesc.trim(),
      isCompleted: false,
      completedAt: '',
      order: rebuildData.routines.filter(r => r.time === newRoutineTime).length,
    };
    addRoutineBlock(block);
    setNewRoutineTitle('');
    setNewRoutineDesc('');
    setNewRoutineTime('morning');
    setShowAddRoutine(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [newRoutineTitle, newRoutineDesc, newRoutineTime, rebuildData.routines, addRoutineBlock]);

  const handleToggleRoutine = useCallback((block: RoutineBlock) => {
    updateRoutineBlock(block.id, {
      isCompleted: !block.isCompleted,
      completedAt: !block.isCompleted ? new Date().toISOString() : '',
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!block.isCompleted) showEncouragement('routine_done');
  }, [updateRoutineBlock, showEncouragement]);

  const handleAddGoal = useCallback(() => {
    if (!newGoalTitle.trim()) return;
    const steps: GoalStep[] = newGoalSteps
      .filter(s => s.trim())
      .map((s, i) => ({
        id: `${Date.now()}-step-${i}`,
        title: s.trim(),
        isCompleted: false,
        completedAt: '',
      }));
    const goal: PurposeGoal = {
      id: Date.now().toString(),
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      category: newGoalCategory,
      progress: 0,
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      isCompleted: false,
      milestoneSteps: steps,
    };
    addPurposeGoal(goal);
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalCategory('personal');
    setNewGoalSteps(['']);
    setShowAddGoal(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [newGoalTitle, newGoalDesc, newGoalCategory, newGoalSteps, addPurposeGoal]);

  const handleToggleGoalStep = useCallback((goal: PurposeGoal, stepId: string) => {
    const updatedSteps = goal.milestoneSteps.map(s =>
      s.id === stepId ? { ...s, isCompleted: !s.isCompleted, completedAt: !s.isCompleted ? new Date().toISOString() : '' } : s
    );
    const completedCount = updatedSteps.filter(s => s.isCompleted).length;
    const progress = updatedSteps.length > 0 ? Math.round((completedCount / updatedSteps.length) * 100) : 0;
    const isCompleted = progress === 100;
    updatePurposeGoal(goal.id, { milestoneSteps: updatedSteps, progress, isCompleted });
    if (isCompleted && !goal.isCompleted && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    showEncouragement('goal_progress');
  }, [updatePurposeGoal, showEncouragement]);

  const handleAddMilestone = useCallback(() => {
    if (!newMilestoneTitle.trim()) return;
    const milestone: ConfidenceMilestone = {
      id: Date.now().toString(),
      title: newMilestoneTitle.trim(),
      description: newMilestoneDesc.trim(),
      achievedAt: new Date().toISOString(),
      category: 'achievement',
    };
    addConfidenceMilestone(milestone);
    setNewMilestoneTitle('');
    setNewMilestoneDesc('');
    setShowAddMilestone(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showEncouragement('milestone');
  }, [newMilestoneTitle, newMilestoneDesc, addConfidenceMilestone, showEncouragement]);

  const isHabitDoneToday = useCallback((habit: ReplacementHabit) => {
    if (!habit.lastCompleted) return false;
    const today = new Date().toISOString().split('T')[0];
    return habit.lastCompleted.split('T')[0] === today;
  }, []);

  const routinesByTime = useMemo(() => {
    const grouped: Record<TimeOfDay, RoutineBlock[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };
    rebuildData.routines
      .sort((a, b) => a.order - b.order)
      .forEach(r => grouped[r.time].push(r));
    return grouped;
  }, [rebuildData.routines]);

  const renderGrowthIndicator = () => {
    const categories = [
      { key: 'self_worth', label: 'Self-Worth', color: '#FF8A80' },
      { key: 'values', label: 'Values', color: '#82B1FF' },
      { key: 'purpose', label: 'Purpose', color: '#B9F6CA' },
      { key: 'life_goals', label: 'Life Goals', color: '#FFD180' },
    ];

    return (
      <View style={styles.growthCard}>
        <View style={styles.growthHeader}>
          <Text style={styles.growthTitle}>Identity Growth</Text>
          <View style={styles.growthScoreBadge}>
            <Text style={styles.growthScoreText}>{combinedScore}</Text>
          </View>
        </View>
        <View style={styles.growthBarContainer}>
          <View style={styles.growthBarBg}>
            <Animated.View
              style={[
                styles.growthBarFill,
                { width: `${Math.min(combinedScore, 100)}%` },
              ]}
            />
          </View>
        </View>
        <View style={styles.growthCategories}>
          {categories.map(cat => {
            const modulesForCat = IDENTITY_MODULES.filter(m => m.category === cat.key);
            const totalEx = modulesForCat.reduce((s, m) => s + m.exercises.length, 0);
            const doneEx = modulesForCat.reduce((s, m) =>
              s + m.exercises.filter(ex =>
                identityProgram.exerciseResponses.some(r => r.moduleId === m.id && r.exerciseId === ex.id)
              ).length, 0);
            const pct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;
            return (
              <View key={cat.key} style={styles.growthCatItem}>
                <View style={styles.growthCatRow}>
                  <View style={[styles.growthCatDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.growthCatLabel}>{cat.label}</Text>
                  <Text style={styles.growthCatPct}>{pct}%</Text>
                </View>
                <View style={styles.growthCatBarBg}>
                  <View style={[styles.growthCatBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderProgramSection = () => {
    if (!programStarted) {
      return <RebuildProgramWelcome onStartProgram={handleStartProgram} Colors={Colors} styles={styles} />;
    }

    const currentWeek = identityProgram.currentWeek;
    const unlockedModules = IDENTITY_MODULES.filter(m => m.week <= currentWeek);
    const lockedModules = IDENTITY_MODULES.filter(m => m.week > currentWeek);

    return (
      <View style={styles.sectionContent}>
        {renderGrowthIndicator()}

        <View style={styles.weekIndicator}>
          <Text style={styles.weekLabel}>Week {currentWeek} of 8</Text>
          <Text style={styles.weekProgress}>
            {programProgress.exercisesCompleted}/{programProgress.totalExercises} exercises
          </Text>
        </View>

        {identityProgram.values.length > 0 && (
          <View style={styles.valuesCard}>
            <View style={styles.valuesHeader}>
              <Text style={styles.valuesTitle}>My Core Values</Text>
              <TouchableOpacity onPress={() => setShowValueModal(true)} activeOpacity={0.7}>
                <Plus size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.valuesChips}>
              {identityProgram.values.map(v => (
                <View key={v.id} style={styles.valueChip}>
                  <Text style={styles.valueChipText}>{v.label}</Text>
                  <TouchableOpacity onPress={() => removeIdentityValue(v.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={12} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {identityProgram.values.length === 0 && currentWeek >= 3 && (
          <TouchableOpacity
            style={styles.addValuesPrompt}
            onPress={() => setShowValueModal(true)}
            activeOpacity={0.7}
          >
            <Shield size={16} color="#82B1FF" />
            <Text style={styles.addValuesPromptText}>Add your core values as you discover them</Text>
            <Plus size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {unlockedModules.map(mod => {
          const isExpanded = expandedModule === mod.id;
          const { done, total } = getModuleExerciseCount(mod.id);
          const isModuleComplete = identityProgram.completedModuleIds.includes(mod.id);
          const catInfo = CATEGORY_INFO[mod.category];

          return (
            <View key={mod.id} style={[styles.moduleCard, isModuleComplete && styles.moduleCardComplete]}>
              <TouchableOpacity
                style={styles.moduleHeader}
                onPress={() => setExpandedModule(isExpanded ? null : mod.id)}
                activeOpacity={0.7}
              >
                <View style={styles.moduleHeaderLeft}>
                  <View style={[styles.moduleCatDot, { backgroundColor: catInfo?.color ?? Colors.primary }]} />
                  <View style={styles.moduleHeaderInfo}>
                    <View style={styles.moduleWeekRow}>
                      <Text style={styles.moduleWeekText}>Week {mod.week}</Text>
                      <View style={[styles.moduleCatBadge, { backgroundColor: catInfo?.darkColor ?? Colors.surface }]}>
                        <Text style={[styles.moduleCatBadgeText, { color: catInfo?.color ?? Colors.primary }]}>{catInfo?.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.moduleTitle}>{mod.title}</Text>
                    <Text style={styles.moduleDesc} numberOfLines={isExpanded ? undefined : 1}>{mod.description}</Text>
                  </View>
                </View>
                <View style={styles.moduleHeaderRight}>
                  {isModuleComplete ? (
                    <View style={styles.moduleCompleteBadge}>
                      <Check size={12} color={Colors.background} />
                    </View>
                  ) : (
                    <Text style={styles.moduleExCount}>{done}/{total}</Text>
                  )}
                  {isExpanded ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.moduleBody}>
                  <View style={styles.moduleAffirmation}>
                    <Feather size={14} color={Colors.accentWarm} />
                    <Text style={styles.moduleAffirmationText}>{mod.affirmation}</Text>
                  </View>

                  {mod.exercises.map(ex => {
                    const completed = isExerciseCompleted(mod.id, ex.id);
                    return (
                      <TouchableOpacity
                        key={ex.id}
                        style={[styles.exerciseItem, completed && styles.exerciseItemDone]}
                        onPress={() => handleOpenExercise(mod, ex)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.exerciseCheck, completed && styles.exerciseCheckDone]}>
                          {completed ? <Check size={10} color={Colors.background} /> : EXERCISE_TYPE_ICONS[ex.type]}
                        </View>
                        <View style={styles.exerciseInfo}>
                          <Text style={[styles.exerciseTitle, completed && styles.exerciseTitleDone]}>{ex.title}</Text>
                          <Text style={styles.exerciseType}>{ex.type.charAt(0).toUpperCase() + ex.type.slice(1)}</Text>
                        </View>
                        <ChevronRight size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}

                  {isModuleComplete && mod.week === currentWeek && currentWeek < 8 && (
                    <TouchableOpacity
                      style={styles.advanceWeekBtn}
                      onPress={() => {
                        advanceIdentityWeek();
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.advanceWeekBtnText}>Unlock Week {currentWeek + 1}</Text>
                      <ArrowRight size={14} color={Colors.background} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {lockedModules.length > 0 && (
          <View style={styles.lockedSection}>
            <Text style={styles.lockedSectionTitle}>Coming Up</Text>
            {lockedModules.map(mod => {
              const catInfo = CATEGORY_INFO[mod.category];
              return (
                <View key={mod.id} style={styles.lockedModuleCard}>
                  <Lock size={14} color={Colors.textMuted} />
                  <View style={styles.lockedModuleInfo}>
                    <Text style={styles.lockedModuleWeek}>Week {mod.week}</Text>
                    <Text style={styles.lockedModuleTitle}>{mod.title}</Text>
                  </View>
                  <View style={[styles.lockedCatBadge, { backgroundColor: catInfo?.darkColor ?? Colors.surface }]}>
                    <Text style={[styles.lockedCatText, { color: catInfo?.color ?? Colors.textMuted }]}>{catInfo?.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const categoryLabel = activeExercise
    ? `${CATEGORY_INFO[activeExercise.module.category]?.label} · Week ${activeExercise.module.week}`
    : undefined;

  const { hasFeature } = useSubscription();

  if (!hasFeature('rebuild_programs')) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Rebuild',
            headerShown: true,
            ...rebuildHeaderScreenOptions,
            headerRight: () => (
              <Pressable onPress={() => rebuildRouter.push('/settings' as never)} hitSlop={10}>
                <Settings size={18} color={Colors.text} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.premiumOverlay}>
          <View style={styles.premiumIconCircle}>
            <Hammer size={32} color="#D4A574" />
          </View>
          <Text style={styles.premiumOverlayTitle}>Life Rebuild Programs</Text>
          <Text style={styles.premiumOverlayDesc}>
            Structured identity rebuilding, habit replacement, routine building, purpose goals, and confidence milestones.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.premiumOverlayBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              rebuildRouter.push('/premium-upgrade' as never);
            }}
          >
            <Text style={styles.premiumOverlayBtnText}>Unlock Rebuild</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Rebuild',
          headerShown: true,
          ...rebuildHeaderScreenOptions,
          headerRight: () => (
            <Pressable onPress={() => rebuildRouter.push('/settings' as never)} hitSlop={10}>
              <Settings size={18} color={Colors.text} />
            </Pressable>
          ),
        }}
      />

      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RebuildHeroCard
          headerAnim={headerAnim}
          affirmation={getAffirmation(affirmationIndex)}
          combinedScore={combinedScore}
          stats={stats}
          programProgress={programProgress}
          Colors={Colors}
          styles={styles}
        />

        <RebuildSectionTabs
          activeSection={activeSection}
          onChange={setActiveSection}
          styles={styles}
          tabs={[
            { key: 'program', label: 'Program', icon: <Compass size={14} color={activeSection === 'program' ? Colors.text : Colors.textMuted} /> },
            { key: 'habits', label: 'Habits', icon: <RefreshCw size={14} color={activeSection === 'habits' ? Colors.text : Colors.textMuted} /> },
            { key: 'routine', label: 'Routine', icon: <Sunrise size={14} color={activeSection === 'routine' ? Colors.text : Colors.textMuted} /> },
            { key: 'goals', label: 'Goals', icon: <Target size={14} color={activeSection === 'goals' ? Colors.text : Colors.textMuted} /> },
            { key: 'confidence', label: 'Wins', icon: <Award size={14} color={activeSection === 'confidence' ? Colors.text : Colors.textMuted} /> },
          ]}
        />

        {activeSection === 'program' && renderProgramSection()}
        {activeSection === 'habits' && (
          <RebuildHabitsSection
            rebuildHabits={rebuildData.habits}
            habitCategories={HABIT_CATEGORIES}
            isHabitDoneToday={isHabitDoneToday}
            onOpenAddHabit={() => setShowAddHabit(true)}
            onCompleteHabit={handleCompleteHabit}
            onDeleteHabit={deleteReplacementHabit}
            Colors={Colors}
            styles={styles}
          />
        )}
        {activeSection === 'routine' && (
          <RebuildRoutineSection
            routines={rebuildData.routines}
            routinesByTime={routinesByTime}
            timeOptions={TIME_OPTIONS}
            onOpenAddRoutine={() => setShowAddRoutine(true)}
            onToggleRoutine={handleToggleRoutine}
            onDeleteRoutine={deleteRoutineBlock}
            Colors={Colors}
            styles={styles}
          />
        )}
        {activeSection === 'goals' && (
          <RebuildGoalsSection
            goals={rebuildData.goals}
            goalCategories={GOAL_CATEGORIES}
            expandedGoalId={expandedGoal}
            onToggleExpanded={setExpandedGoal}
            onOpenAddGoal={() => setShowAddGoal(true)}
            onToggleGoalStep={handleToggleGoalStep}
            onDeleteGoal={deletePurposeGoal}
            Colors={Colors}
            styles={styles}
          />
        )}
        {activeSection === 'confidence' && (
          <RebuildConfidenceSection
            milestones={rebuildData.confidenceMilestones}
            onOpenAddMilestone={() => setShowAddMilestone(true)}
            Colors={Colors}
            styles={styles}
          />
        )}

        <View style={{ height: 40 }} />
      </ScreenScrollView>

      <RebuildEncouragementToast
        message={encouragementMessage}
        fade={encouragementFade}
        onDismiss={dismissEncouragement}
        Colors={Colors}
        styles={styles}
      />

      <RebuildExerciseModal
        visible={!!activeExercise}
        activeExercise={activeExercise}
        exerciseInput={exerciseInput}
        setExerciseInput={setExerciseInput}
        onClose={() => {
          setActiveExercise(null);
          setExerciseInput('');
        }}
        onSave={handleSaveExercise}
        canSave={exerciseInput.trim().length > 0}
        saveLabel={
          activeExercise && isExerciseCompleted(activeExercise.module.id, activeExercise.exercise.id) ? 'Update Response' : 'Save Response'
        }
        categoryLabel={categoryLabel}
        Colors={Colors}
        styles={styles}
      />

      <RebuildValueModal
        visible={showValueModal}
        newValueLabel={newValueLabel}
        setNewValueLabel={setNewValueLabel}
        newValueImportance={newValueImportance}
        setNewValueImportance={setNewValueImportance}
        onClose={() => setShowValueModal(false)}
        onAddValue={handleAddValue}
        Colors={Colors}
        styles={styles}
      />

      <RebuildAddHabitModal
        visible={showAddHabit}
        newHabitTrigger={newHabitTrigger}
        setNewHabitTrigger={setNewHabitTrigger}
        newHabitReplacement={newHabitReplacement}
        setNewHabitReplacement={setNewHabitReplacement}
        newHabitCategory={newHabitCategory}
        setNewHabitCategory={setNewHabitCategory}
        habitCategories={HABIT_CATEGORIES}
        onClose={() => setShowAddHabit(false)}
        onAdd={handleAddHabit}
        Colors={Colors}
        styles={styles}
      />

      <RebuildAddRoutineModal
        visible={showAddRoutine}
        newRoutineTitle={newRoutineTitle}
        setNewRoutineTitle={setNewRoutineTitle}
        newRoutineDesc={newRoutineDesc}
        setNewRoutineDesc={setNewRoutineDesc}
        newRoutineTime={newRoutineTime}
        setNewRoutineTime={setNewRoutineTime}
        timeOptions={TIME_OPTIONS}
        onClose={() => setShowAddRoutine(false)}
        onAdd={handleAddRoutine}
        Colors={Colors}
        styles={styles}
      />

      <RebuildAddGoalModal
        visible={showAddGoal}
        newGoalTitle={newGoalTitle}
        setNewGoalTitle={setNewGoalTitle}
        newGoalDesc={newGoalDesc}
        setNewGoalDesc={setNewGoalDesc}
        newGoalCategory={newGoalCategory}
        setNewGoalCategory={setNewGoalCategory}
        goalCategories={GOAL_CATEGORIES}
        newGoalSteps={newGoalSteps}
        setNewGoalSteps={setNewGoalSteps}
        onClose={() => setShowAddGoal(false)}
        onAdd={handleAddGoal}
        Colors={Colors}
        styles={styles}
      />

      <RebuildAddMilestoneModal
        visible={showAddMilestone}
        newMilestoneTitle={newMilestoneTitle}
        setNewMilestoneTitle={setNewMilestoneTitle}
        newMilestoneDesc={newMilestoneDesc}
        setNewMilestoneDesc={setNewMilestoneDesc}
        onClose={() => setShowAddMilestone(false)}
        onAdd={handleAddMilestone}
        Colors={Colors}
        styles={styles}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityScoreWrap: {
    alignItems: 'flex-end',
  },
  identityScoreLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  identityScoreValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    lineHeight: 32,
  },
  heroAffirmation: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic' as const,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  heroStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  tabsScroll: {
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTabActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  sectionTabTextActive: {
    color: Colors.text,
  },
  sectionContent: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    maxWidth: 260,
  },
  welcomeCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  welcomeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(185,246,202,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(185,246,202,0.2)',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  welcomeDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 20,
  },
  welcomeFeatures: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 24,
  },
  welcomeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  welcomeFeatureText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  startProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startProgramBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  growthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  growthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  growthTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  growthScoreBadge: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthScoreText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  growthBarContainer: {
    marginBottom: 14,
  },
  growthBarBg: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  growthBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  growthCategories: {
    gap: 10,
  },
  growthCatItem: {
    gap: 4,
  },
  growthCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  growthCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  growthCatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  growthCatPct: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  growthCatBarBg: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden' as const,
    marginLeft: 14,
  },
  growthCatBarFill: {
    height: 4,
    borderRadius: 2,
  },
  weekIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  weekProgress: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  valuesCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(130,177,255,0.2)',
  },
  valuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  valuesTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#82B1FF',
  },
  valuesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(130,177,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(130,177,255,0.15)',
  },
  valueChipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  addValuesPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(130,177,255,0.15)',
  },
  addValuesPromptText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  moduleCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  moduleCardComplete: {
    borderColor: 'rgba(185,246,202,0.3)',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  moduleHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  moduleCatDot: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  moduleHeaderInfo: {
    flex: 1,
  },
  moduleWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  moduleWeekText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  moduleCatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleCatBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  moduleHeaderRight: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  moduleCompleteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleExCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  moduleBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  moduleAffirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,179,71,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  moduleAffirmationText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic' as const,
    color: Colors.accentWarm,
    lineHeight: 19,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  exerciseItemDone: {
    opacity: 0.75,
  },
  exerciseCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseCheckDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  exerciseTitleDone: {
    color: Colors.textMuted,
  },
  exerciseType: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  advanceWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  advanceWeekBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  lockedSection: {
    marginTop: 8,
  },
  lockedSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  lockedModuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.5,
    gap: 10,
  },
  lockedModuleInfo: {
    flex: 1,
  },
  lockedModuleWeek: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  lockedModuleTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  lockedCatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedCatText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  exerciseModalCat: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  exercisePromptCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exercisePromptText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },
  exerciseHintText: {
    fontSize: 13,
    color: Colors.accentWarm,
    fontStyle: 'italic' as const,
    marginTop: 10,
    lineHeight: 19,
  },
  importanceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  importanceDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  importanceDotActive: {
    backgroundColor: 'rgba(255,179,71,0.1)',
    borderColor: Colors.accentWarm,
  },
  habitCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitCardDone: {
    borderColor: Colors.primaryDark,
    opacity: 0.85,
  },
  habitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  habitCategoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,107,53,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FF6B35',
  },
  habitFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitTriggerBox: {
    flex: 1,
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.2)',
  },
  habitTriggerLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.danger,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  habitTriggerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  habitReplacementBox: {
    flex: 1,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.2)',
  },
  habitReplacementLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  habitReplacementText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  habitActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  completeBtnDone: {
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  completeBtnTextDone: {
    color: Colors.textMuted,
  },
  deleteBtn: {
    padding: 8,
  },
  timeGroup: {
    marginBottom: 16,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routineItemDone: {
    borderColor: Colors.primaryDark,
    opacity: 0.8,
  },
  routineCheck: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routineCheckDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  routineInfo: {
    flex: 1,
  },
  routineTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  routineTitleDone: {
    textDecorationLine: 'line-through' as const,
    color: Colors.textMuted,
  },
  routineDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  goalCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  goalCardDone: {
    borderColor: Colors.success,
  },
  goalHeader: {
    padding: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  goalCategoryBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  goalTitleDone: {
    color: Colors.success,
  },
  goalDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressBarFillDone: {
    backgroundColor: Colors.success,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    minWidth: 32,
    textAlign: 'right' as const,
  },
  goalSteps: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  stepCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  stepTextDone: {
    textDecorationLine: 'line-through' as const,
    color: Colors.textMuted,
  },
  deleteGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteGoalText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500' as const,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  milestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,179,71,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  milestoneDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  milestoneDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  latestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(46,196,182,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flex: 1,
    marginTop: 80,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInputMulti: {
    minHeight: 72,
    textAlignVertical: 'top' as const,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  categoryChipTextActive: {
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  stepInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  removeStepBtn: {
    padding: 8,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  addStepText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  premiumOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  premiumIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212,165,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  premiumOverlayTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  premiumOverlayDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumOverlayBtn: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  premiumOverlayBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  encouragementToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  encouragementText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  encouragementCloseBtn: {
    padding: 4,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
});
