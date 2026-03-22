import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { FlatList, ScrollView } from 'react-native';

/**
 * Scrolls a vertical ScrollView or FlatList to the top whenever the current screen gains focus.
 */
export function scrollToTop(node: ScrollView | FlatList | null) {
  if (!node) return;
  const n = node as FlatList & ScrollView;
  try {
    if (typeof n.scrollToOffset === 'function') {
      n.scrollToOffset({ offset: 0, animated: false });
      return;
    }
    if (typeof n.scrollTo === 'function') {
      n.scrollTo({ y: 0, animated: false });
    }
  } catch {
    /* noop */
  }
}

export function useScrollToTopOnFocus(
  scrollRef: React.RefObject<ScrollView | FlatList | null>,
) {
  useFocusEffect(
    useCallback(() => {
      const id = requestAnimationFrame(() => {
        scrollToTop(scrollRef.current);
      });
      return () => cancelAnimationFrame(id);
    }, [scrollRef]),
  );
}
