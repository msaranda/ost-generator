import { useEffect, useRef } from 'react';
import { TreeState } from '../types';
import { calculateTreeLayout } from '../utils/treeLayout';

interface UseAutoLayoutOptions {
  enabled: boolean;
  onLayoutCalculated: (positions: Record<string, { x: number; y: number }>) => void;
}

export function useAutoLayout(
  tree: TreeState,
  options: UseAutoLayoutOptions
) {
  const { enabled, onLayoutCalculated } = options;
  const prevNodeCountRef = useRef<number>(Object.keys(tree.nodes).length);
  const prevChildrenRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    const nodeCount = Object.keys(tree.nodes).length;
    const childrenSignature = Object.values(tree.nodes)
      .map(n => `${n.id}:${n.children.join(',')}`)
      .sort()
      .join('|');

    // Only recalculate if node count or tree structure changed
    if (
      nodeCount !== prevNodeCountRef.current ||
      childrenSignature !== prevChildrenRef.current
    ) {
      const positions = calculateTreeLayout(tree.rootId, tree.nodes);
      onLayoutCalculated(positions);
      
      prevNodeCountRef.current = nodeCount;
      prevChildrenRef.current = childrenSignature;
    }
  }, [tree, enabled, onLayoutCalculated]);
}

