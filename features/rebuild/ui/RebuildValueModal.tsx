import React from 'react';
import { Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, X } from 'lucide-react-native';

export function RebuildValueModal(props: {
  visible: boolean;
  newValueLabel: string;
  setNewValueLabel: (v: string) => void;
  newValueImportance: number;
  setNewValueImportance: (n: number) => void;
  onClose: () => void;
  onAddValue: () => void;
  Colors: any;
  styles: any;
}) {
  const {
    visible,
    newValueLabel,
    setNewValueLabel,
    newValueImportance,
    setNewValueImportance,
    onClose,
    onAddValue,
    Colors,
    styles,
  } = props;

  const insets = useSafeAreaInsets();
  const modalBottomPad = (Platform.OS === 'ios' ? 36 : 24) + insets.bottom;

  const canAdd = newValueLabel.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: modalBottomPad }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a Core Value</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
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
            {[1, 2, 3, 4, 5].map((n) => (
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
            style={[styles.saveButton, !canAdd && styles.saveButtonDisabled]}
            onPress={onAddValue}
            disabled={!canAdd}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Add Value</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

