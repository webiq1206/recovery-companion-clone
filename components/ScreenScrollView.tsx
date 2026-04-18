import React, { forwardRef, useCallback, useRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { useScrollToTopOnFocus } from '../hooks/useScrollToTopOnFocus';

export type ScreenScrollViewProps = ScrollViewProps & {
  /** When false, skip scrolling to top on focus (e.g. deep links that scroll to a section). Default true. */
  scrollToTopOnFocus?: boolean;
};

/**
 * Drop-in ScrollView that scrolls to top when the screen is focused (e.g. after navigation).
 */
export const ScreenScrollView = forwardRef<ScrollView, ScreenScrollViewProps>(function ScreenScrollView(
  { scrollToTopOnFocus: scrollToTopOnFocusProp = true, ...props },
  ref,
) {
  const innerRef = useRef<ScrollView | null>(null);
  useScrollToTopOnFocus(innerRef, scrollToTopOnFocusProp);

  const setRef = useCallback(
    (node: ScrollView | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<ScrollView | null>).current = node;
    },
    [ref],
  );

  const {
    showsVerticalScrollIndicator,
    keyboardShouldPersistTaps,
    ...rest
  } = props;

  return (
    <ScrollView
      ref={setRef}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      {...rest}
    />
  );
});
