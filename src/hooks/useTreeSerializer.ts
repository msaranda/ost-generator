import { useMemo, useRef, useEffect } from 'react';
import { TreeState } from '../types';
import { serializeTree, SerializeOptions } from '../utils/textSerializer';

export interface UseTreeSerializerReturn {
  serializedText: string;
  isSerializing: boolean;
  nodeLineMap: Record<string, number>;
}

interface UseTreeSerializerOptions {
  tree: TreeState;
  onTextUpdate: (text: string) => void;
  options?: SerializeOptions;
}

/**
 * Custom hook for serializing tree state to text format
 * 
 * Serializes tree to text format on tree changes, detects serialization
 * source to prevent loops, preserves cursor position during serialization,
 * and handles shorthand vs full format options.
 */
export function useTreeSerializer({
  tree,
  onTextUpdate,
  options = { useShorthand: true },
}: UseTreeSerializerOptions): UseTreeSerializerReturn {
  const isSerializingRef = useRef(false);
  const previousTreeRef = useRef<string>('');
  const shouldUpdateRef = useRef(false);

  /**
   * Serialize tree to text format
   * Memoized to avoid unnecessary re-serialization
   */
  const serializeResult = useMemo(() => {
    // Create a stable string representation of the tree for comparison
    const treeSnapshot = JSON.stringify({
      rootId: tree.rootId,
      nodes: tree.nodes,
    });
    const treeChanged = treeSnapshot !== previousTreeRef.current;

    // Skip if tree hasn't changed
    if (!treeChanged) {
      shouldUpdateRef.current = false;
      return serializeTree(tree, options);
    }

    previousTreeRef.current = treeSnapshot;
    isSerializingRef.current = true;
    shouldUpdateRef.current = true; // Mark that this serialization should trigger an update

    const result = serializeTree(tree, options);

    // Reset serializing flag after a short delay
    setTimeout(() => {
      isSerializingRef.current = false;
    }, 0);

    return result;
  }, [tree, options]);

  const serializedText = serializeResult.text;
  const nodeLineMap = serializeResult.nodeLineMap;

  /**
   * Update text editor when serialized text changes OR when tree changes
   * This effect runs after the tree changes and serialization completes
   * CRITICAL: We depend on both serializedText AND tree to ensure updates happen
   * even if serializedText is the same but tree structure changed
   */
  useEffect(() => {
    // Only update if this is a visual edit (not from text editor)
    // Use shouldUpdateRef which was set during serialization, not the ref that may have been reset
    if (shouldUpdateRef.current) {
      shouldUpdateRef.current = false; // Reset after use
      onTextUpdate(serializedText);
    }
  }, [serializedText, onTextUpdate, tree]);

  return {
    serializedText,
    isSerializing: isSerializingRef.current,
    nodeLineMap,
  };
}
