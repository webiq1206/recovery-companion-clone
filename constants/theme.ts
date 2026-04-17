import { Platform, StyleSheet } from 'react-native';
import Colors from './colors';

/** 8pt grid — use multiples for padding, margin, gaps. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Soft separators — avoids harsh 1px solid lines. */
export const hairline = 'rgba(255,255,255,0.07)';
export const hairlineStrong = 'rgba(255,255,255,0.1)';

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }),
  tabBar: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
    },
    android: { elevation: 16 },
    default: {},
  }),
};

export const typography = {
  /** Stack / screen titles */
  navTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.35,
  },
  section: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  secondary: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    letterSpacing: 0.15,
  },
};

const isWeb = Platform.OS === 'web';

/** Default push animation: gentle horizontal slide (native), none on web. */
export const stackAnimation = isWeb ? ('none' as const) : ('slide_from_right' as const);
export const stackAnimationDuration = isWeb ? 0 : 320;
export const modalAnimation = isWeb ? ('none' as const) : ('slide_from_bottom' as const);
export const modalAnimationDuration = isWeb ? 0 : 340;
export const fadeAnimation = isWeb ? ('none' as const) : ('fade' as const);
export const fadeAnimationDuration = isWeb ? 0 : 280;

/** Shared native-stack options for in-tab stacks and consistent headers. */
export const defaultStackScreenOptions = {
  headerTitleAlign: 'center' as const,
  headerTitleStyle: typography.navTitle,
  headerTintColor: Colors.text,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: hairline,
  },
  contentStyle: { backgroundColor: Colors.background },
  animation: stackAnimation,
  animationDuration: stackAnimationDuration,
};

/** Recovery paths stack uses a darker chrome. */
export const recoveryPathsChrome = {
  background: '#0b0d0f',
  text: '#F2F3F5',
};

export const recoveryPathsStackScreenOptions = {
  headerTitleAlign: 'center' as const,
  headerTitleStyle: {
    ...typography.navTitle,
    color: recoveryPathsChrome.text,
  },
  headerTintColor: recoveryPathsChrome.text,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: recoveryPathsChrome.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  contentStyle: { backgroundColor: recoveryPathsChrome.background },
  animation: stackAnimation,
  animationDuration: stackAnimationDuration,
};
