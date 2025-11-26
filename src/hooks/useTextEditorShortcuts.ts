import { useEffect, useCallback, useRef } from 'react';

interface TextEditorShortcutHandlers {
  onFind?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  isEditorFocused: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

/**
 * Custom hook for handling text editor keyboard shortcuts
 * 
 * Implements shortcuts for:
 * - Cmd/Ctrl+F: Find dialog
 * - Cmd/Ctrl+Z: Undo
 * - Cmd/Ctrl+Shift+Z: Redo
 * - Cmd/Ctrl+A: Select all
 * 
 * Only active when the text editor is focused to prevent interference
 * with app-level shortcuts.
 */
export function useTextEditorShortcuts({
  onFind,
  onUndo,
  onRedo,
  onSelectAll,
  isEditorFocused,
  textareaRef,
}: TextEditorShortcutHandlers) {
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const currentValueRef = useRef<string>('');

  /**
   * Save current state to undo stack
   */
  const saveToUndoStack = useCallback((value: string) => {
    if (value !== currentValueRef.current) {
      undoStackRef.current.push(currentValueRef.current);
      currentValueRef.current = value;
      redoStackRef.current = []; // Clear redo stack on new change
    }
  }, []);

  /**
   * Update current value reference
   */
  const updateCurrentValue = useCallback((value: string) => {
    currentValueRef.current = value;
  }, []);

  /**
   * Handle undo operation
   */
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || !textareaRef.current) return;

    const previousValue = undoStackRef.current.pop()!;
    redoStackRef.current.push(currentValueRef.current);
    currentValueRef.current = previousValue;

    // Update textarea value
    textareaRef.current.value = previousValue;
    
    // Trigger change event to update component state
    const event = new Event('input', { bubbles: true });
    textareaRef.current.dispatchEvent(event);
  }, [textareaRef]);

  /**
   * Handle redo operation
   */
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0 || !textareaRef.current) return;

    const nextValue = redoStackRef.current.pop()!;
    undoStackRef.current.push(currentValueRef.current);
    currentValueRef.current = nextValue;

    // Update textarea value
    textareaRef.current.value = nextValue;
    
    // Trigger change event to update component state
    const event = new Event('input', { bubbles: true });
    textareaRef.current.dispatchEvent(event);
  }, [textareaRef]);

  /**
   * Handle select all operation
   */
  const handleSelectAll = useCallback(() => {
    if (!textareaRef.current) return;
    
    textareaRef.current.select();
  }, [textareaRef]);

  /**
   * Handle find operation
   */
  const handleFind = useCallback(() => {
    if (!textareaRef.current) return;
    
    // Trigger custom find handler or browser's native find
    if (onFind) {
      onFind();
    } else {
      // Trigger browser's native find dialog (Cmd/Ctrl+F)
      // The browser will handle this natively
      textareaRef.current.focus();
    }
  }, [textareaRef, onFind]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts when editor is focused
      if (!isEditorFocused) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Cmd/Ctrl + F: Find
      if (cmdOrCtrl && event.key === 'f') {
        // Let browser handle native find functionality
        // In the future, this could be customized with a custom find dialog
        if (onFind) {
          event.preventDefault();
          handleFind();
        }
        // Otherwise, let browser's native find work
        return;
      }

      // Cmd/Ctrl + Z: Undo
      if (cmdOrCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (onUndo) {
          onUndo();
        } else {
          handleUndo();
        }
        return;
      }

      // Cmd/Ctrl + Shift + Z: Redo
      if (cmdOrCtrl && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        if (onRedo) {
          onRedo();
        } else {
          handleRedo();
        }
        return;
      }

      // Cmd/Ctrl + Y: Redo (alternative)
      if (cmdOrCtrl && event.key === 'y') {
        event.preventDefault();
        if (onRedo) {
          onRedo();
        } else {
          handleRedo();
        }
        return;
      }

      // Cmd/Ctrl + A: Select all
      if (cmdOrCtrl && event.key === 'a') {
        event.preventDefault();
        if (onSelectAll) {
          onSelectAll();
        } else {
          handleSelectAll();
        }
        return;
      }
    },
    [isEditorFocused, handleFind, handleUndo, handleRedo, handleSelectAll, onFind, onUndo, onRedo, onSelectAll]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    saveToUndoStack,
    updateCurrentValue,
    handleUndo,
    handleRedo,
    handleSelectAll,
    handleFind,
  };
}
