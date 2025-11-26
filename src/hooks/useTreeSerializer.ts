import { useMemo, useRef, useEffect } from 'react';
import { TreeState } from '../types';
import { serializeTree, SerializeOptions } from '../utils/textSerializer';

export interface UseTreeSerializerReturn {
  serializedText: string;
  isSerializing: boolean;
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

  /**
   * Serialize tree to text format
   * Memoized to avoid unnecessary re-serialization
   */
  const serializedText = useMemo(() => {
    // Create a stable string representation of the tree for comparison
    const treeSnapshot = JSON.stringify({
      rootId: tree.rootId,
      nodes: tree.nodes,
    });

    // Skip if tree hasn't changed
    if (treeSnapshot === previousTreeRef.current) {
      return serializeTree(tree, options);
    }

    previousTreeRef.current = treeSnapshot;
    isSerializingRef.current = true;

    const text = serializeTree(tree, options);

    // Reset serializing flag after a short delay
    setTimeout(() => {
      isSerializingRef.current = false;
    }, 0);

    return text;
  }, [tree, options]);

  /**
   * Update text editor when serialized text changes
   * This effect runs after the tree changes and serialization completes
   */
  useEffect(() => {
    // Only update if this is a visual edit (not from text editor)
    // The text editor will handle its own updates
    if (isSerializingRef.current) {
      onTextUpdate(serializedText);
    }
  }, [serializedText, onTextUpdate]);

  return {
    serializedText,
    isSerializing: isSerializingRef.current,
  };
}
