import React from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
import { RecoveryPathRoomsContent } from '../../../components/connection/RecoveryPathRoomsContent';
import Colors from '../../../constants/colors';
import { spacing } from '../../../constants/theme';

export default function ConnectionChatPathsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.rootWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      <View style={[styles.root, { paddingTop: spacing.xs }]}>
        <ScreenScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <RecoveryPathRoomsContent testID="connection-chat-paths-content" />
        </ScreenScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootWrap: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
});
