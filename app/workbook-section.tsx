import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  type ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Redirect, useLocalSearchParams, Stack } from 'expo-router';
import { useSubscription } from '../providers/SubscriptionProvider';
import { CheckCircle, Circle, ChevronDown, ChevronUp, BookOpen, PenLine, Lightbulb, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useWorkbook } from '../core/domains/useWorkbook';
import { useWorkbookStore } from '../features/workbook/state/useWorkbookStore';
import { WORKBOOK_SECTIONS } from '../constants/workbook';
import { WorkbookQuestion } from '../types';

const TYPE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  reflection: Lightbulb,
  assignment: PenLine,
  journaling: BookOpen,
  exercise: Dumbbell,
};

const TYPE_COLORS: Record<string, string> = {
  reflection: '#2EC4B6',
  assignment: '#FF6B35',
  journaling: '#9B59B6',
  exercise: '#4CAF50',
};

const TYPE_LABELS: Record<string, string> = {
  reflection: 'Reflection',
  assignment: 'Assignment',
  journaling: 'Journaling',
  exercise: 'Exercise',
};

/** Exercises 1–3 (indices 0–2) are free; 4–25 require Paid Premium (`deep_exercises`). */
const FREE_EXERCISE_COUNT = 3;

export default function WorkbookSectionScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const section = WORKBOOK_SECTIONS.find(s => s.id === id);
  const { hasFeature } = useSubscription();
  const hasPremium = hasFeature('deep_exercises');
  const sectionIndex = useMemo(
    () => (id ? WORKBOOK_SECTIONS.findIndex(s => s.id === id) : -1),
    [id]
  );
  const { saveWorkbookAnswer, getWorkbookAnswer } = useWorkbook();
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<string>('');
  const scrollRef = useRef<ScrollView>(null);
  const cardTopYRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!expandedQuestion) return;
    const scrollToCard = () => {
      const y = cardTopYRef.current[expandedQuestion];
      if (typeof y === 'number' && scrollRef.current) {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(scrollToCard));
    const retry = setTimeout(scrollToCard, 420);
    return () => clearTimeout(retry);
  }, [expandedQuestion]);

  const progress = useWorkbookStore(
    useCallback((s) => {
      if (!section) return 0;
      const n = section.questions.length;
      if (n <= 0) return 0;
      const done = s.workbookAnswers.filter((a) => a.sectionId === section.id).length;
      return Math.min(1, Math.max(0, done / n));
    }, [section])
  );

  const handleToggleQuestion = useCallback((questionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
      setEditingAnswer('');
    } else {
      setExpandedQuestion(questionId);
      if (section) {
        const existing = getWorkbookAnswer(section.id, questionId);
        setEditingAnswer(existing?.answer ?? '');
      }
    }
  }, [expandedQuestion, section, getWorkbookAnswer]);

  const handleSaveAnswer = useCallback((questionId: string) => {
    if (!section || !editingAnswer.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveWorkbookAnswer({
      questionId,
      sectionId: section.id,
      answer: editingAnswer.trim(),
      completedAt: new Date().toISOString(),
    });
    setExpandedQuestion(null);
    setEditingAnswer('');
  }, [section, editingAnswer, saveWorkbookAnswer]);

  if (!section) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Section Not Found' }} />
        <Text style={styles.errorText}>Section not found.</Text>
      </View>
    );
  }

  if (sectionIndex >= FREE_EXERCISE_COUNT && !hasPremium) {
    return (
      <>
        <Stack.Screen options={{ title: 'Premium' }} />
        <Redirect href="/premium-upgrade" />
      </>
    );
  }

  const renderQuestion = ({ item, index }: { item: WorkbookQuestion; index: number }) => {
    const isExpanded = expandedQuestion === item.id;
    const existing = getWorkbookAnswer(section.id, item.id);
    const isCompleted = !!existing;
    const IconComponent = TYPE_ICONS[item.type] ?? Lightbulb;
    const typeColor = TYPE_COLORS[item.type] ?? Colors.primary;

    return (
      <View
        style={[styles.questionCard, isExpanded && styles.questionCardExpanded]}
        onLayout={(e) => {
          cardTopYRef.current[item.id] = e.nativeEvent.layout.y;
        }}
      >
        <Pressable
          style={styles.questionHeader}
          onPress={() => handleToggleQuestion(item.id)}
          testID={`question-${item.id}`}
        >
          <View style={styles.questionLeft}>
            {isCompleted ? (
              <CheckCircle size={20} color={Colors.primary} />
            ) : (
              <Circle size={20} color={Colors.textMuted} />
            )}
            <View style={styles.questionMeta}>
              <View style={styles.questionTypeRow}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                  <IconComponent size={10} color={typeColor} />
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>{TYPE_LABELS[item.type]}</Text>
                </View>
                <Text style={styles.questionNumber}>Q{index + 1}</Text>
              </View>
              <Text style={styles.questionText} numberOfLines={isExpanded ? undefined : 2}>{item.question}</Text>
            </View>
          </View>
          {isExpanded ? (
            <ChevronUp size={18} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={Colors.textMuted} />
          )}
        </Pressable>

        {isExpanded && (
          <View style={styles.answerSection}>
            {item.hint && (
              <View style={styles.hintRow}>
                <Lightbulb size={12} color={Colors.accentWarm} />
                <Text style={styles.hintText}>{item.hint}</Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, !editingAnswer.trim() && styles.saveBtnDisabled]}
              onPress={() => handleSaveAnswer(item.id)}
              disabled={!editingAnswer.trim()}
            >
              <Text style={styles.saveBtnText}>Save Response</Text>
            </Pressable>
            <TextInput
              style={styles.answerInput}
              value={editingAnswer}
              onChangeText={setEditingAnswer}
              placeholder="Write your response here..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            {existing && (
              <Text style={styles.savedDate}>
                Last saved: {new Date(existing.completedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ title: section.title }} />
      <ScreenScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 40 + insets.bottom }]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionDesc}>{section.description}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
        {section.questions.map((item, index) => (
          <React.Fragment key={item.id}>{renderQuestion({ item, index })}</React.Fragment>
        ))}
      </ScreenScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  questionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  questionCardExpanded: {
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  questionLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  questionMeta: {
    flex: 1,
  },
  questionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  questionNumber: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  questionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  answerSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.accentWarm,
    lineHeight: 17,
  },
  answerInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 140,
    lineHeight: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  savedDate: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
