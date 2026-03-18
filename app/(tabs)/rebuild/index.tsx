import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { Stack, useRouter as useRebuildRouter } from 'expo-router';
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
  "You're building someone new — stronger, freer.",
  "Every small choice rewires who you are.",
  "Structure isn't restriction — it's freedom.",
  "The person you're becoming already exists inside you.",
  "Replacement isn't avoidance — it's evolution.",
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

  const showEncouragement = useCallback((context: 'habit_complete' | 'routine_done' | 'goal_progress' | 'exercise_done' | 'milestone') => {
    const msg = generateRebuildEncouragement(stage, riskLevel, context);
    setEncouragementMessage(msg);
    encouragementFade.setValue(0);
    Animated.sequence([
      Animated.timing(encouragementFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(encouragementFade, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setEncouragementMessage(''));
  }, [stage, riskLevel, encouragementFade]);

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

  const renderSectionTab = (key: ActiveSection, label: string, icon: React.ReactNode) => (
    <TouchableOpacity
      key={key}
      style={[styles.sectionTab, activeSection === key && styles.sectionTabActive]}
      onPress={() => setActiveSection(key)}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.sectionTabText, activeSection === key && styles.sectionTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
      return (
        <View style={styles.sectionContent}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconWrap}>
              <Compass size={28} color="#B9F6CA" />
            </View>
            <Text style={styles.welcomeTitle}>Identity Rebuild Program</Text>
            <Text style={styles.welcomeDesc}>
              An 8-week guided journey to rediscover your worth, clarify your values, find purpose, and set meaningful life goals.
            </Text>
            <View style={styles.welcomeFeatures}>
              {[
                { icon: <Heart size={14} color="#FF8A80" />, text: 'Self-worth restoration' },
                { icon: <Shield size={14} color="#82B1FF" />, text: 'Values clarification' },
                { icon: <Compass size={14} color="#B9F6CA" />, text: 'Purpose mapping' },
                { icon: <Target size={14} color="#FFD180" />, text: 'Long-term life goals' },
              ].map((f, i) => (
                <View key={i} style={styles.welcomeFeatureRow}>
                  {f.icon}
                  <Text style={styles.welcomeFeatureText}>{f.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.startProgramBtn}
              onPress={handleStartProgram}
              activeOpacity={0.7}
            >
              <Text style={styles.startProgramBtnText}>Begin Your Journey</Text>
              <ArrowRight size={16} color={Colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      );
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

  const renderHabitsSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Habit Replacements</Text>
          <Text style={styles.sectionSubtitle}>Replace old triggers with new patterns</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddHabit(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {rebuildData.habits.length === 0 ? (
        <View style={styles.emptyState}>
          <RefreshCw size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No habit replacements yet</Text>
          <Text style={styles.emptySubtext}>
            When a craving hits, what will you do instead?
          </Text>
        </View>
      ) : (
        rebuildData.habits.map(habit => {
          const done = isHabitDoneToday(habit);
          const catInfo = HABIT_CATEGORIES.find(c => c.key === habit.category);
          return (
            <View key={habit.id} style={[styles.habitCard, done && styles.habitCardDone]}>
              <View style={styles.habitTop}>
                <View style={styles.habitCategoryBadge}>
                  {catInfo?.icon}
                  <Text style={styles.habitCategoryText}>{catInfo?.label}</Text>
                </View>
                {habit.streak > 0 && (
                  <View style={styles.streakBadge}>
                    <Flame size={12} color="#FF6B35" />
                    <Text style={styles.streakText}>{habit.streak}d</Text>
                  </View>
                )}
              </View>
              <View style={styles.habitFlow}>
                <View style={styles.habitTriggerBox}>
                  <Text style={styles.habitTriggerLabel}>When I feel</Text>
                  <Text style={styles.habitTriggerText}>{habit.oldTrigger}</Text>
                </View>
                <ArrowRight size={16} color={Colors.primary} style={{ marginHorizontal: 8 }} />
                <View style={styles.habitReplacementBox}>
                  <Text style={styles.habitReplacementLabel}>I will</Text>
                  <Text style={styles.habitReplacementText}>{habit.newHabit}</Text>
                </View>
              </View>
              <View style={styles.habitActions}>
                <TouchableOpacity
                  style={[styles.completeBtn, done && styles.completeBtnDone]}
                  onPress={() => handleCompleteHabit(habit)}
                  disabled={done}
                  activeOpacity={0.7}
                >
                  <Check size={14} color={done ? Colors.textMuted : Colors.text} />
                  <Text style={[styles.completeBtnText, done && styles.completeBtnTextDone]}>
                    {done ? 'Done today' : 'Mark done'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteReplacementHabit(habit.id)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderRoutineSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Daily Routine</Text>
          <Text style={styles.sectionSubtitle}>Structure builds stability</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddRoutine(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {rebuildData.routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Sunrise size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No routines set</Text>
          <Text style={styles.emptySubtext}>
            Build a daily rhythm that keeps you grounded
          </Text>
        </View>
      ) : (
        TIME_OPTIONS.map(timeOpt => {
          const blocks = routinesByTime[timeOpt.key];
          if (blocks.length === 0) return null;
          return (
            <View key={timeOpt.key} style={styles.timeGroup}>
              <View style={styles.timeHeader}>
                {timeOpt.icon}
                <Text style={styles.timeLabel}>{timeOpt.label}</Text>
              </View>
              {blocks.map(block => (
                <TouchableOpacity
                  key={block.id}
                  style={[styles.routineItem, block.isCompleted && styles.routineItemDone]}
                  onPress={() => handleToggleRoutine(block)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.routineCheck, block.isCompleted && styles.routineCheckDone]}>
                    {block.isCompleted && <Check size={12} color={Colors.background} />}
                  </View>
                  <View style={styles.routineInfo}>
                    <Text style={[styles.routineTitle, block.isCompleted && styles.routineTitleDone]}>
                      {block.title}
                    </Text>
                    {block.description ? (
                      <Text style={styles.routineDesc}>{block.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteRoutineBlock(block.id)}
                    style={styles.deleteBtn}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          );
        })
      )}
    </View>
  );

  const renderGoalsSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Purpose Goals</Text>
          <Text style={styles.sectionSubtitle}>What are you building toward?</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddGoal(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {rebuildData.goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Target size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No goals yet</Text>
          <Text style={styles.emptySubtext}>
            Give your recovery a destination
          </Text>
        </View>
      ) : (
        rebuildData.goals.map(goal => {
          const isExpanded = expandedGoal === goal.id;
          const catInfo = GOAL_CATEGORIES.find(c => c.key === goal.category);
          return (
            <View key={goal.id} style={[styles.goalCard, goal.isCompleted && styles.goalCardDone]}>
              <TouchableOpacity
                style={styles.goalHeader}
                onPress={() => setExpandedGoal(isExpanded ? null : goal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.goalTitleRow}>
                  <View style={styles.goalCategoryBadge}>
                    {catInfo?.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, goal.isCompleted && styles.goalTitleDone]}>
                      {goal.title}
                    </Text>
                    {goal.description ? (
                      <Text style={styles.goalDesc} numberOfLines={isExpanded ? undefined : 1}>
                        {goal.description}
                      </Text>
                    ) : null}
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={18} color={Colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={Colors.textMuted} />
                  )}
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${goal.progress}%` },
                        goal.isCompleted && styles.progressBarFillDone,
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{goal.progress}%</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.goalSteps}>
                  {goal.milestoneSteps.map(step => (
                    <TouchableOpacity
                      key={step.id}
                      style={styles.stepItem}
                      onPress={() => handleToggleGoalStep(goal, step.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.stepCheck, step.isCompleted && styles.stepCheckDone]}>
                        {step.isCompleted && <Check size={10} color={Colors.background} />}
                      </View>
                      <Text style={[styles.stepText, step.isCompleted && styles.stepTextDone]}>
                        {step.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => deletePurposeGoal(goal.id)}
                    style={styles.deleteGoalBtn}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={Colors.danger} />
                    <Text style={styles.deleteGoalText}>Remove goal</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const renderConfidenceSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Confidence Wins</Text>
          <Text style={styles.sectionSubtitle}>Celebrate how far you've come</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddMilestone(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {rebuildData.confidenceMilestones.length === 0 ? (
        <View style={styles.emptyState}>
          <Award size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No wins recorded yet</Text>
          <Text style={styles.emptySubtext}>
            Log moments that made you feel proud or strong
          </Text>
        </View>
      ) : (
        rebuildData.confidenceMilestones.map((m, i) => (
          <View key={m.id} style={styles.milestoneCard}>
            <View style={styles.milestoneIcon}>
              <Star size={18} color={Colors.accentWarm} />
            </View>
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneTitle}>{m.title}</Text>
              {m.description ? (
                <Text style={styles.milestoneDesc}>{m.description}</Text>
              ) : null}
              <Text style={styles.milestoneDate}>
                {new Date(m.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {i === 0 && (
              <View style={styles.latestBadge}>
                <Sparkles size={10} color={Colors.primary} />
                <Text style={styles.latestBadgeText}>Latest</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  const renderExerciseModal = () => (
    <Modal visible={!!activeExercise} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalContent}>
            {activeExercise && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseModalCat}>
                      {CATEGORY_INFO[activeExercise.module.category]?.label} · Week {activeExercise.module.week}
                    </Text>
                    <Text style={styles.modalTitle}>{activeExercise.exercise.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setActiveExercise(null); setExerciseInput(''); }} activeOpacity={0.7}>
                    <X size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.exercisePromptCard}>
                  <Text style={styles.exercisePromptText}>{activeExercise.exercise.prompt}</Text>
                  {activeExercise.exercise.hint && (
                    <Text style={styles.exerciseHintText}>{activeExercise.exercise.hint}</Text>
                  )}
                </View>

                <Text style={styles.inputLabel}>Your Response</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMulti, { minHeight: 120 }]}
                  placeholder="Take your time. Write honestly..."
                  placeholderTextColor={Colors.textMuted}
                  value={exerciseInput}
                  onChangeText={setExerciseInput}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.saveButton, !exerciseInput.trim() && styles.saveButtonDisabled]}
                  onPress={handleSaveExercise}
                  disabled={!exerciseInput.trim()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>
                    {isExerciseCompleted(activeExercise.module.id, activeExercise.exercise.id) ? 'Update Response' : 'Save Response'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderValueModal = () => (
    <Modal visible={showValueModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a Core Value</Text>
            <TouchableOpacity onPress={() => setShowValueModal(false)} activeOpacity={0.7}>
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Value</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Honesty, Family, Courage..."
            placeholderTextColor={Colors.textMuted}
            value={newValueLabel}
            onChangeText={setNewValueLabel}
          />

          <Text style={styles.inputLabel}>How important is this to you?</Text>
          <View style={styles.importanceRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.importanceDot, newValueImportance >= n && styles.importanceDotActive]}
                onPress={() => setNewValueImportance(n)}
                activeOpacity={0.7}
              >
                <Star size={16} color={newValueImportance >= n ? Colors.accentWarm : Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !newValueLabel.trim() && styles.saveButtonDisabled]}
            onPress={handleAddValue}
            disabled={!newValueLabel.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Add Value</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAddHabitModal = () => (
    <Modal visible={showAddHabit} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Habit Replacement</Text>
            <TouchableOpacity onPress={() => setShowAddHabit(false)} activeOpacity={0.7}>
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>When I feel the urge to...</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. drink, scroll, isolate..."
            placeholderTextColor={Colors.textMuted}
            value={newHabitTrigger}
            onChangeText={setNewHabitTrigger}
          />

          <Text style={styles.inputLabel}>Instead, I will...</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. go for a walk, call a friend..."
            placeholderTextColor={Colors.textMuted}
            value={newHabitReplacement}
            onChangeText={setNewHabitReplacement}
          />

          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryPicker}>
            {HABIT_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, newHabitCategory === cat.key && styles.categoryChipActive]}
                onPress={() => setNewHabitCategory(cat.key)}
                activeOpacity={0.7}
              >
                {cat.icon}
                <Text style={[styles.categoryChipText, newHabitCategory === cat.key && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (!newHabitTrigger.trim() || !newHabitReplacement.trim()) && styles.saveButtonDisabled]}
            onPress={handleAddHabit}
            disabled={!newHabitTrigger.trim() || !newHabitReplacement.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Add Replacement</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAddRoutineModal = () => (
    <Modal visible={showAddRoutine} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Routine Block</Text>
            <TouchableOpacity onPress={() => setShowAddRoutine(false)} activeOpacity={0.7}>
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Activity</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Meditation, Exercise, Read..."
            placeholderTextColor={Colors.textMuted}
            value={newRoutineTitle}
            onChangeText={setNewRoutineTitle}
          />

          <Text style={styles.inputLabel}>Details (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 10 minutes of breathing"
            placeholderTextColor={Colors.textMuted}
            value={newRoutineDesc}
            onChangeText={setNewRoutineDesc}
          />

          <Text style={styles.inputLabel}>Time of Day</Text>
          <View style={styles.categoryPicker}>
            {TIME_OPTIONS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.categoryChip, newRoutineTime === t.key && styles.categoryChipActive]}
                onPress={() => setNewRoutineTime(t.key)}
                activeOpacity={0.7}
              >
                {t.icon}
                <Text style={[styles.categoryChipText, newRoutineTime === t.key && styles.categoryChipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !newRoutineTitle.trim() && styles.saveButtonDisabled]}
            onPress={handleAddRoutine}
            disabled={!newRoutineTitle.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Add to Routine</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAddGoalModal = () => (
    <Modal visible={showAddGoal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Purpose Goal</Text>
              <TouchableOpacity onPress={() => setShowAddGoal(false)} activeOpacity={0.7}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Goal</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Get physically fit, Start a new hobby..."
              placeholderTextColor={Colors.textMuted}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
            />

            <Text style={styles.inputLabel}>Why this matters (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMulti]}
              placeholder="What will this give you?"
              placeholderTextColor={Colors.textMuted}
              value={newGoalDesc}
              onChangeText={setNewGoalDesc}
              multiline
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPicker}>
              {GOAL_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, newGoalCategory === cat.key && styles.categoryChipActive]}
                  onPress={() => setNewGoalCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  {cat.icon}
                  <Text style={[styles.categoryChipText, newGoalCategory === cat.key && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Steps to get there</Text>
            {newGoalSteps.map((step, i) => (
              <View key={i} style={styles.stepInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder={`Step ${i + 1}`}
                  placeholderTextColor={Colors.textMuted}
                  value={step}
                  onChangeText={text => {
                    const updated = [...newGoalSteps];
                    updated[i] = text;
                    setNewGoalSteps(updated);
                  }}
                />
                {newGoalSteps.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeStepBtn}
                    onPress={() => setNewGoalSteps(newGoalSteps.filter((_, j) => j !== i))}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addStepBtn}
              onPress={() => setNewGoalSteps([...newGoalSteps, ''])}
              activeOpacity={0.7}
            >
              <Plus size={14} color={Colors.primary} />
              <Text style={styles.addStepText}>Add step</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, !newGoalTitle.trim() && styles.saveButtonDisabled]}
              onPress={handleAddGoal}
              disabled={!newGoalTitle.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderAddMilestoneModal = () => (
    <Modal visible={showAddMilestone} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log a Win</Text>
            <TouchableOpacity onPress={() => setShowAddMilestone(false)} activeOpacity={0.7}>
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>What did you accomplish?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Said no to a craving, Finished a workout..."
            placeholderTextColor={Colors.textMuted}
            value={newMilestoneTitle}
            onChangeText={setNewMilestoneTitle}
          />

          <Text style={styles.inputLabel}>How did it make you feel? (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMulti]}
            placeholder="Describe the moment..."
            placeholderTextColor={Colors.textMuted}
            value={newMilestoneDesc}
            onChangeText={setNewMilestoneDesc}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveButton, !newMilestoneTitle.trim() && styles.saveButtonDisabled]}
            onPress={handleAddMilestone}
            disabled={!newMilestoneTitle.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Log Win</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const { hasFeature } = useSubscription();
  const rebuildRouter = useRebuildRouter();

  if (!hasFeature('rebuild_programs')) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Rebuild', headerShown: true }} />
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
      <Stack.Screen options={{ title: 'Rebuild', headerShown: true }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Hammer size={22} color={Colors.background} />
            </View>
            <View style={styles.identityScoreWrap}>
              <Text style={styles.identityScoreLabel}>Identity Score</Text>
              <Text style={styles.identityScoreValue}>{combinedScore}</Text>
            </View>
          </View>
          <Text style={styles.heroAffirmation}>{getAffirmation(affirmationIndex)}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{programProgress.modulesCompleted}/{programProgress.totalModules}</Text>
              <Text style={styles.heroStatLabel}>Modules</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.activeHabits}</Text>
              <Text style={styles.heroStatLabel}>Habits</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.goalsCompleted}/{stats.totalGoals}</Text>
              <Text style={styles.heroStatLabel}>Goals</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.milestoneCount}</Text>
              <Text style={styles.heroStatLabel}>Wins</Text>
            </View>
          </View>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScroll}
        >
          {renderSectionTab('program', 'Program', <Compass size={14} color={activeSection === 'program' ? Colors.text : Colors.textMuted} />)}
          {renderSectionTab('habits', 'Habits', <RefreshCw size={14} color={activeSection === 'habits' ? Colors.text : Colors.textMuted} />)}
          {renderSectionTab('routine', 'Routine', <Sunrise size={14} color={activeSection === 'routine' ? Colors.text : Colors.textMuted} />)}
          {renderSectionTab('goals', 'Goals', <Target size={14} color={activeSection === 'goals' ? Colors.text : Colors.textMuted} />)}
          {renderSectionTab('confidence', 'Wins', <Award size={14} color={activeSection === 'confidence' ? Colors.text : Colors.textMuted} />)}
        </ScrollView>

        {activeSection === 'program' && renderProgramSection()}
        {activeSection === 'habits' && renderHabitsSection()}
        {activeSection === 'routine' && renderRoutineSection()}
        {activeSection === 'goals' && renderGoalsSection()}
        {activeSection === 'confidence' && renderConfidenceSection()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {encouragementMessage !== '' && (
        <Animated.View style={[styles.encouragementToast, { opacity: encouragementFade }]}>
          <Sparkles size={14} color={Colors.primary} />
          <Text style={styles.encouragementText}>{encouragementMessage}</Text>
        </Animated.View>
      )}

      {renderExerciseModal()}
      {renderValueModal()}
      {renderAddHabitModal()}
      {renderAddRoutineModal()}
      {renderAddGoalModal()}
      {renderAddMilestoneModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
});
