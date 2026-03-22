import React, { forwardRef, useCallback, useRef } from 'react';
import { FlatList, type FlatListProps } from 'react-native';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

/**
 * Drop-in FlatList that scrolls to top when the screen is focused.
 * Forwards ref so callers can still use scrollToEnd, etc.
 */
export const ScreenFlatList = forwardRef<FlatList<any>, FlatListProps<any>>(
  function ScreenFlatList(props, ref) {
    const innerRef = useRef<FlatList<any> | null>(null);
    useScrollToTopOnFocus(innerRef as React.RefObject<FlatList | null>);

    const setRef = useCallback(
      (node: FlatList<any> | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<FlatList<any> | null>).current = node;
      },
      [ref],
    );

    return <FlatList ref={setRef} {...props} />;
  },
);
