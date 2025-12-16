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
    const nodeCount = Object.keys(tree.nodes).length;
    const treeChanged = treeSnapshot !== previousTreeRef.current;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:37',message:'serializeResult memo triggered',data:{nodeCount,treeChanged,previousTreeSnapshotLength:previousTreeRef.current.length,newTreeSnapshotLength:treeSnapshot.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // Skip if tree hasn't changed
    if (!treeChanged) {
      shouldUpdateRef.current = false;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:46',message:'serializeResult - tree unchanged, shouldUpdate=false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return serializeTree(tree, options);
    }

    previousTreeRef.current = treeSnapshot;
    isSerializingRef.current = true;
    shouldUpdateRef.current = true; // Mark that this serialization should trigger an update
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:52',message:'serializeResult - tree changed, shouldUpdate=true',data:{nodeCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    const result = serializeTree(tree, options);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:56',message:'serializeResult - serialization complete',data:{serializedTextLength:result.text.length,nodeLineMapSize:Object.keys(result.nodeLineMap).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:85',message:'serializer effect triggered',data:{serializedTextLength:serializedText.length,shouldUpdate:shouldUpdateRef.current,isSerializing:isSerializingRef.current,previousTreeSnapshotLength:previousTreeRef.current.length,nodeCount:Object.keys(tree.nodes).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    // Only update if this is a visual edit (not from text editor)
    // Use shouldUpdateRef which was set during serialization, not the ref that may have been reset
    if (shouldUpdateRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:91',message:'serializer calling onTextUpdate',data:{serializedTextLength:serializedText.length,serializedTextStart:serializedText.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      shouldUpdateRef.current = false; // Reset after use
      onTextUpdate(serializedText);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTreeSerializer.ts:96',message:'serializer effect - shouldUpdate is false, skipping onTextUpdate',data:{serializedTextLength:serializedText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    }
  }, [serializedText, onTextUpdate, tree]);

  return {
    serializedText,
    isSerializing: isSerializingRef.current,
    nodeLineMap,
  };
}
