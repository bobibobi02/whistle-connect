import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Virtualizer } from "@tanstack/react-virtual";

interface UseKeyboardNavigationOptions {
  items: { id: string }[];
  enabled?: boolean;
  onNavigate?: (id: string, index: number) => void;
  virtualizerRef?: React.RefObject<Virtualizer<HTMLDivElement, Element> | null>;
}

/**
 * Hook for J/K keyboard navigation through a list of items.
 * - J = next item
 * - K = previous item
 * - Enter = open focused item
 * Disabled when typing in inputs/textareas or when modals are open.
 * Integrates with @tanstack/react-virtual for virtualized lists.
 */
export const useKeyboardNavigation = ({
  items,
  enabled = true,
  onNavigate,
  virtualizerRef,
}: UseKeyboardNavigationOptions) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const navigate = useNavigate();

  const focusedId = focusedIndex >= 0 && focusedIndex < items.length 
    ? items[focusedIndex].id 
    : null;

  const scrollToIndex = useCallback((index: number) => {
    // Prefer virtualizer's scrollToIndex for proper virtualization support
    if (virtualizerRef?.current) {
      virtualizerRef.current.scrollToIndex(index, { align: "center", behavior: "smooth" });
    } else {
      // Fallback to querySelector for non-virtualized lists
      const element = document.querySelector(`[data-post-id="${items[index]?.id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [items, virtualizerRef]);

  const isInputFocused = useCallback((): boolean => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      activeElement.isContentEditable ||
      activeElement.getAttribute("role") === "textbox"
    );
  }, []);

  const isModalOpen = useCallback((): boolean => {
    // Check for various modal/dialog states
    const hasDialog = document.querySelector('[role="dialog"][data-state="open"]');
    const hasSheet = document.querySelector('[data-vaul-drawer][data-state="open"]');
    const hasAlertDialog = document.querySelector('[role="alertdialog"]');
    return !!(hasDialog || hasSheet || hasAlertDialog);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Don't trigger when typing in inputs/textareas
      if (isInputFocused()) return;

      // Don't trigger when modals/dialogs are open
      if (isModalOpen()) return;

      const key = e.key.toLowerCase();

      if (key === "j") {
        e.preventDefault();
        const newIndex = focusedIndex === -1 ? 0 : Math.min(focusedIndex + 1, items.length - 1);
        if (newIndex !== focusedIndex || focusedIndex === -1) {
          setFocusedIndex(newIndex);
          scrollToIndex(newIndex);
          onNavigate?.(items[newIndex].id, newIndex);
        }
      } else if (key === "k") {
        e.preventDefault();
        if (focusedIndex > 0) {
          const newIndex = focusedIndex - 1;
          setFocusedIndex(newIndex);
          scrollToIndex(newIndex);
          onNavigate?.(items[newIndex].id, newIndex);
        } else if (focusedIndex === -1 && items.length > 0) {
          // Start from the first item
          setFocusedIndex(0);
          scrollToIndex(0);
          onNavigate?.(items[0].id, 0);
        }
      } else if (key === "enter" && focusedIndex >= 0 && items[focusedIndex]) {
        e.preventDefault();
        navigate(`/post/${items[focusedIndex].id}`);
      } else if (key === "escape") {
        setFocusedIndex(-1);
      }
    },
    [enabled, items, focusedIndex, scrollToIndex, navigate, onNavigate, isInputFocused, isModalOpen]
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
