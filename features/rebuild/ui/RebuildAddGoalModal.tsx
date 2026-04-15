import React from 'react';
import { Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X } from 'lucide-react-native';

import type { PurposeGoal } from '../../../types';

export function RebuildAddGoalModal(props: {
  visible: boolean;
  newGoalTitle: string;
  setNewGoalTitle: (v: string) => void;
  newGoalDesc: string;
  setNewGoalDesc: (v: string) => void;
  newGoalCategory: PurposeGoal['category'];
  setNewGoalCategory: (c: PurposeGoal['category']) => void;
  goalCategories: { key: PurposeGoal['category']; label: string; icon: React.ReactNode }[];
  newGoalSteps: string[];
  setNewGoalSteps: (steps: string[]) => void;
  onClose: () => void;
  onAdd: () => void;
  Colors: any;
  styles: any;
}) {
  const {
    visible,
    newGoalTitle,
    setNewGoalTitle,
    newGoalDesc,
    setNewGoalDesc,
    newGoalCategory,
    setNewGoalCategory,
    goalCategories,
    newGoalSteps,
    setNewGoalSteps,
    onClose,
    onAdd,
    Colors,
    styles,
  } = props;

  const insets = useSafeAreaInsets();
  const scrollBottomPad = (Platform.OS === 'ios' ? 36 : 24) + insets.bottom;

  const canAdd = newGoalTitle.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={[styles.modalScrollContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Purpose Goal</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
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
              {goalCategories.map((cat) => (
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
                  onChangeText={(text) => {
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
              style={[styles.saveButton, !canAdd && styles.saveButtonDisabled]}
              onPress={onAdd}
              disabled={!canAdd}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

