import React, { forwardRef, useCallback, useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

/**
 * Drop-in ScrollView that scrolls to top when the screen is focused (e.g. after navigation).
 */
export const ScreenScrollView = forwardRef<ScrollView, ScrollViewProps>(function ScreenScrollView(
  props,
  ref,
) {
  const innerRef = useRef<ScrollView | null>(null);
  useScrollToTopOnFocus(innerRef);

  const setRef = useCallback(
    (node: ScrollView | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<ScrollView | null>).current = node;
    },
    [ref],
  );

  return <ScrollView ref={setRef} {...props} />;
});
