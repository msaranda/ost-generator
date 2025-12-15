import { useEffect, useCallback } from 'react';
import { TreeState } from '../types';

interface KeyboardShortcutHandlers {
  onAddChild?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onEnterEdit?: () => void;
  onShowDetails?: (nodeId: string) => void;
  onSelectNode?: (nodeId: string) => void;
  onCloseModal?: () => void;
  hasOpenModal: boolean;
  getNearestNodeToCursor?: () => string | null;
  tree: TreeState;
  selectedNodeId: string | null;
  isEditing: boolean;
}

// Navigation helper functions
function getParentNodeId(nodeId: string, tree: TreeState): string | null {
  const node = tree.nodes[nodeId];
  return node?.parentId || null;
}

function getFirstChildId(nodeId: string, tree: TreeState): string | null {
  const node = tree.nodes[nodeId];
  return node?.children[0] || null;
}

function getSiblingId(nodeId: string, tree: TreeState, direction: 'prev' | 'next'): string | null {
  const node = tree.nodes[nodeId];
  if (!node?.parentId) return null;
  
  const parent = tree.nodes[node.parentId];
  if (!parent) return null;
  
  const siblingIndex = parent.children.indexOf(nodeId);
  if (siblingIndex === -1) return null;
  
  if (direction === 'prev') {
    return siblingIndex > 0 ? parent.children[siblingIndex - 1] : null;
  } else {
    return siblingIndex < parent.children.length - 1 ? parent.children[siblingIndex + 1] : null;
  }
}

export function useKeyboardShortcuts({
  onAddChild,
  onDelete,
  onEscape,
  onSave,
  onUndo,
  onRedo,
  onEnterEdit,
  onShowDetails,
  onSelectNode,
  onCloseModal,
  hasOpenModal,
  getNearestNodeToCursor,
  tree,
  selectedNodeId,
  isEditing,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if the text editor is focused - if so, don't handle app shortcuts
      const activeElement = document.activeElement;
      const isTextEditorFocused = activeElement?.closest('[role="main"]') !== null && 
                                   activeElement?.closest('aside[aria-label="Text editor panel"]') !== null;
      
      // Also check if CodeMirror editor has focus (it uses contenteditable)
      const isCodeMirrorFocused = activeElement?.classList.contains('cm-content') || 
                                   activeElement?.closest('.cm-editor') !== null ||
                                   activeElement?.closest('.cm-scroller') !== null;
      
      if (isTextEditorFocused || isCodeMirrorFocused) {
        // Let the editor handle all keyboard events
        return;
      }

      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Priority 1: Handle modal ESCAPE - close any open modal
      if (event.key === 'Escape' && hasOpenModal && onCloseModal) {
        event.preventDefault();
        onCloseModal();
        return;
      }

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
        
        // Escape exits editing mode (handled by StickyNote component directly)
        // Don't call onEscape here as it would also deselect the node
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

      const key = event.key.toLowerCase();

      // Arrow keys: if no node selected, select nearest node to cursor
      if (!selectedNodeId && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        if (onSelectNode && getNearestNodeToCursor) {
          const nearestNodeId = getNearestNodeToCursor();
          if (nearestNodeId) {
            onSelectNode(nearestNodeId);
          }
        }
        return;
      }

      // Only handle these shortcuts when a node is selected
      if (!selectedNodeId) return;

      switch (key) {
        // A: Add child node
        case 'a':
          event.preventDefault();
          if (onAddChild) {
            onAddChild();
          }
          break;

        // D: Delete node
        case 'd':
          event.preventDefault();
          if (onDelete) {
            onDelete();
          }
          break;

        // Enter: Show details if available, otherwise enter edit mode
        case 'enter':
          event.preventDefault();
          if (selectedNodeId) {
            const node = tree.nodes[selectedNodeId];
            const hasDescription = !!node?.description;
            const hasMetadata = !!node?.metadata && Object.keys(node.metadata).length > 0;
            
            // If node has details, show them; otherwise enter edit mode
            if ((hasDescription || hasMetadata) && onShowDetails) {
              onShowDetails(selectedNodeId);
            } else if (onEnterEdit) {
              onEnterEdit();
            }
          }
          break;

        // Escape: Deselect
        case 'escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;

        // Arrow keys for navigation
        case 'arrowup':
          event.preventDefault();
          if (onSelectNode) {
            const parentId = getParentNodeId(selectedNodeId, tree);
            if (parentId) {
              onSelectNode(parentId);
            }
          }
          break;

        case 'arrowdown':
          event.preventDefault();
          if (onSelectNode) {
            const childId = getFirstChildId(selectedNodeId, tree);
            if (childId) {
              onSelectNode(childId);
            }
          }
          break;

        case 'arrowleft':
          event.preventDefault();
          if (onSelectNode) {
            const prevSiblingId = getSiblingId(selectedNodeId, tree, 'prev');
            if (prevSiblingId) {
              onSelectNode(prevSiblingId);
            }
          }
          break;

        case 'arrowright':
          event.preventDefault();
          if (onSelectNode) {
            const nextSiblingId = getSiblingId(selectedNodeId, tree, 'next');
            if (nextSiblingId) {
              onSelectNode(nextSiblingId);
            }
          }
          break;
      }
    },
    [isEditing, selectedNodeId, tree, onAddChild, onDelete, onEscape, onSave, onUndo, onRedo, onEnterEdit, onShowDetails, onSelectNode, onCloseModal, hasOpenModal, getNearestNodeToCursor]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
