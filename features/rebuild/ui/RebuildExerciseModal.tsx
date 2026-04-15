import React from 'react';
import { Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import type { IdentityExercise, IdentityModule } from '../../../types';

export function RebuildExerciseModal(props: {
  visible: boolean;
  activeExercise: { module: IdentityModule; exercise: IdentityExercise } | null;
  exerciseInput: string;
  setExerciseInput: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  saveLabel: string;
  categoryLabel?: string;
  Colors: any;
  styles: any;
}) {
  const {
    visible,
    activeExercise,
    exerciseInput,
    setExerciseInput,
    onClose,
    onSave,
    canSave,
    saveLabel,
    categoryLabel,
    Colors,
    styles,
  } = props;

  const insets = useSafeAreaInsets();
  const scrollBottomPad = (Platform.OS === 'ios' ? 36 : 24) + insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={[styles.modalScrollContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalContent}>
            {activeExercise && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseModalCat}>{categoryLabel}</Text>
                    <Text style={styles.modalTitle}>{activeExercise.exercise.title}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                    <X size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.exercisePromptCard}>
                  <Text style={styles.exercisePromptText}>{activeExercise.exercise.prompt}</Text>
                  {activeExercise.exercise.hint && <Text style={styles.exerciseHintText}>{activeExercise.exercise.hint}</Text>}
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
                  style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                  onPress={onSave}
                  disabled={!canSave}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>{saveLabel}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

