import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onAddChild?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  selectedNodeId: string | null;
  isEditing: boolean;
}

export function useKeyboardShortcuts({
  onAddChild,
  onDelete,
  onEscape,
  onSave,
  onUndo,
  onRedo,
  selectedNodeId,
  isEditing,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // When editing text, only handle specific shortcuts and let everything else pass through
      if (isEditing) {
        // Allow standard text editing shortcuts (Ctrl/Cmd + A, C, V, X, Z) to work normally
        if (cmdOrCtrl && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
          return; // Let browser handle these
        }
        
        // Handle undo/redo even when editing (they work on text too)
        if (cmdOrCtrl && event.key === 'z' && !event.shiftKey) {
          return; // Let browser handle text undo
        }
        if (cmdOrCtrl && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
          return; // Let browser handle text redo
        }
        
        // Escape exits editing mode
        if (event.key === 'Escape' && onEscape) {
          onEscape();
        }
        
        // All other keys should work normally in text editing (Delete, Backspace, arrows, etc.)
        return;
      }

      // Non-editing mode shortcuts below

      // Ctrl/Cmd + Z: Undo
      if (cmdOrCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (onUndo) {
          onUndo();
        }
        return;
      }

      // Ctrl/Cmd + Shift + Z: Redo
      if (cmdOrCtrl && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        if (onRedo) {
          onRedo();
        }
        return;
      }

      // Ctrl/Cmd + Y: Redo (alternative)
      if (cmdOrCtrl && event.key === 'y') {
        event.preventDefault();
        if (onRedo) {
          onRedo();
        }
        return;
      }

      // Ctrl/Cmd + S: Export JSON
      if (cmdOrCtrl && event.key === 's') {
        event.preventDefault();
        if (onSave) {
          onSave();
        }
        return;
      }

      // Only handle these shortcuts when a node is selected
      if (!selectedNodeId) return;

      switch (event.key) {
        case 'Tab':
          event.preventDefault();
          if (onAddChild) {
            onAddChild();
          }
          break;

        case 'Delete':
        case 'Backspace':
          // Only delete on Delete key, not Backspace (to avoid accidental deletion)
          if (event.key === 'Delete') {
            event.preventDefault();
            if (onDelete) {
              onDelete();
            }
          }
          break;

        case 'Escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;
      }
    },
    [isEditing, selectedNodeId, onAddChild, onDelete, onEscape, onSave, onUndo, onRedo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

