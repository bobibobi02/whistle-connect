import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface UseKeyboardNavigationOptions {
  items: { id: string }[];
  enabled?: boolean;
  onNavigate?: (id: string) => void;
}

/**
 * Hook for J/K keyboard navigation through a list of items.
 * - J = next item
 * - K = previous item
 * - Enter = open focused item
 * Disabled when typing in inputs/textareas or when modals are open.
 */
export const useKeyboardNavigation = ({
  items,
  enabled = true,
  onNavigate,
}: UseKeyboardNavigationOptions) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const navigate = useNavigate();

  const focusedId = focusedIndex >= 0 && focusedIndex < items.length 
    ? items[focusedIndex].id 
    : null;

  const scrollToItem = useCallback((index: number) => {
    const element = document.querySelector(`[data-post-id="${items[index]?.id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [items]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Don't trigger when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger when modals/dialogs are open
      const hasOpenDialog = document.querySelector('[role="dialog"]');
      const hasOpenSheet = document.querySelector('[data-state="open"][role="dialog"]');
      if (hasOpenDialog || hasOpenSheet) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "j": {
          e.preventDefault();
          const nextIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : focusedIndex;
          if (nextIndex !== focusedIndex || focusedIndex === -1) {
            const newIndex = focusedIndex === -1 ? 0 : nextIndex;
            setFocusedIndex(newIndex);
            scrollToItem(newIndex);
            onNavigate?.(items[newIndex].id);
          }
          break;
        }
        case "k": {
          e.preventDefault();
          if (focusedIndex > 0) {
            const newIndex = focusedIndex - 1;
            setFocusedIndex(newIndex);
            scrollToItem(newIndex);
            onNavigate?.(items[newIndex].id);
          }
          break;
        }
        case "enter": {
          if (focusedIndex >= 0 && items[focusedIndex]) {
            e.preventDefault();
            navigate(`/post/${items[focusedIndex].id}`);
          }
          break;
        }
        case "escape": {
          setFocusedIndex(-1);
          break;
        }
      }
    },
    [enabled, items, focusedIndex, scrollToItem, navigate, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset focus when items change significantly
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [items.length, focusedIndex]);

  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  return {
    focusedIndex,
    focusedId,
    setFocusedIndex,
    clearFocus,
  };
};
