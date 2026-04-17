import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Colors from '../constants/colors';
import { hairline, radius, shadows, spacing } from '../constants/theme';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, error.stack);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.emoji}>🛡️</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage || "Don't worry - your data is safe. Let's try again."}
            </Text>
            {__DEV__ && this.state.error && (
              <Text style={{ fontSize: 11, color: '#FF6B6B', marginBottom: 12, textAlign: 'center' }}>
                {this.state.error.message}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              onPress={this.handleRetry}
              testID="error-boundary-retry"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline,
    ...shadows.card,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.lg + 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
