import React from 'react';
import { Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import type { RoutineBlock } from '../../../types';

export function RebuildAddRoutineModal(props: {
  visible: boolean;
  newRoutineTitle: string;
  setNewRoutineTitle: (v: string) => void;
  newRoutineDesc: string;
  setNewRoutineDesc: (v: string) => void;
  newRoutineTime: RoutineBlock['time'];
  setNewRoutineTime: (t: RoutineBlock['time']) => void;
  timeOptions: { key: RoutineBlock['time']; label: string; icon: React.ReactNode }[];
  onClose: () => void;
  onAdd: () => void;
  Colors: any;
  styles: any;
}) {
  const {
    visible,
    newRoutineTitle,
    setNewRoutineTitle,
    newRoutineDesc,
    setNewRoutineDesc,
    newRoutineTime,
    setNewRoutineTime,
    timeOptions,
    onClose,
    onAdd,
    Colors,
    styles,
  } = props;

  const insets = useSafeAreaInsets();
  const modalBottomPad = (Platform.OS === 'ios' ? 36 : 24) + insets.bottom;

  const canAdd = newRoutineTitle.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: modalBottomPad }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Routine Block</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
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
            {timeOptions.map((t) => (
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
            style={[styles.saveButton, !canAdd && styles.saveButtonDisabled]}
            onPress={onAdd}
            disabled={!canAdd}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Add to Routine</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

