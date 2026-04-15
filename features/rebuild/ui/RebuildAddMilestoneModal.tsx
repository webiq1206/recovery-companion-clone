import React from 'react';
import { Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

export function RebuildAddMilestoneModal(props: {
  visible: boolean;
  newMilestoneTitle: string;
  setNewMilestoneTitle: (v: string) => void;
  newMilestoneDesc: string;
  setNewMilestoneDesc: (v: string) => void;
  onClose: () => void;
  onAdd: () => void;
  Colors: any;
  styles: any;
}) {
  const {
    visible,
    newMilestoneTitle,
    setNewMilestoneTitle,
    newMilestoneDesc,
    setNewMilestoneDesc,
    onClose,
    onAdd,
    Colors,
    styles,
  } = props;

  const insets = useSafeAreaInsets();
  const modalBottomPad = (Platform.OS === 'ios' ? 36 : 24) + insets.bottom;

  const canAdd = newMilestoneTitle.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: modalBottomPad }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log a Win</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
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
            style={[styles.saveButton, !canAdd && styles.saveButtonDisabled]}
            onPress={onAdd}
            disabled={!canAdd}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Log Win</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

