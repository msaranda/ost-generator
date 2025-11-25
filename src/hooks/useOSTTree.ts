import { useReducer, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TreeState, TreeAction, OSTNode, NodeType } from '../types';
import { getChildNodeType, getNodeColor, getDefaultContent } from '../utils/nodeTypes';
import { calculateTreeLayout } from '../utils/treeLayout';

const MAX_HISTORY_SIZE = 50;

// Create initial default tree
function createDefaultTree(): TreeState {
  const rootId = uuidv4();
  const opp1Id = uuidv4();
  const opp2Id = uuidv4();
  const sol1Id = uuidv4();
  const sol2Id = uuidv4();

  const nodes: Record<string, OSTNode> = {
    [rootId]: {
      id: rootId,
      type: 'outcome',
      content: 'Your outcome here',
      parentId: null,
      children: [opp1Id, opp2Id],
      position: { x: 0, y: 0 },
      color: getNodeColor('outcome'),
    },
    [opp1Id]: {
      id: opp1Id,
      type: 'opportunity',
      content: 'Opportunity 1',
      parentId: rootId,
      children: [sol1Id],
      position: { x: 0, y: 0 },
      color: getNodeColor('opportunity'),
    },
    [opp2Id]: {
      id: opp2Id,
      type: 'opportunity',
      content: 'Opportunity 2',
      parentId: rootId,
      children: [sol2Id],
      position: { x: 0, y: 0 },
      color: getNodeColor('opportunity'),
    },
    [sol1Id]: {
      id: sol1Id,
      type: 'solution',
      content: 'Solution 1.1',
      parentId: opp1Id,
      children: [],
      position: { x: 0, y: 0 },
      color: getNodeColor('solution'),
    },
    [sol2Id]: {
      id: sol2Id,
      type: 'solution',
      content: 'Solution 2.1',
      parentId: opp2Id,
      children: [],
      position: { x: 0, y: 0 },
      color: getNodeColor('solution'),
    },
  };

  // Calculate initial positions
  const positions = calculateTreeLayout(rootId, nodes);
  for (const [id, pos] of Object.entries(positions)) {
    if (nodes[id]) {
      nodes[id].position = pos;
    }
  }

  return {
    rootId,
    nodes,
    selectedNodeId: null,
  };
}

// Recursively delete a node and all its children
function deleteNodeRecursively(
  nodeId: string,
  nodes: Record<string, OSTNode>
): Record<string, OSTNode> {
  const node = nodes[nodeId];
  if (!node) return nodes;

  const newNodes = { ...nodes };

  // Delete all children first
  for (const childId of node.children) {
    const result = deleteNodeRecursively(childId, newNodes);
    Object.keys(newNodes).forEach(key => {
      if (!result[key]) delete newNodes[key];
    });
  }

  // Remove this node from parent's children array
  if (node.parentId && newNodes[node.parentId]) {
    newNodes[node.parentId] = {
      ...newNodes[node.parentId],
      children: newNodes[node.parentId].children.filter(id => id !== nodeId),
    };
  }

  // Delete the node itself
  delete newNodes[nodeId];

  return newNodes;
}

// Reducer function for tree state
function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'ADD_NODE': {
      const { parentId, nodeType } = action.payload;
      const parent = state.nodes[parentId];
      if (!parent) return state;

      const newId = uuidv4();
      const type = nodeType || getChildNodeType(parent.type as NodeType);
      
      const newNode: OSTNode = {
        id: newId,
        type,
        content: getDefaultContent(type),
        parentId,
        children: [],
        position: { x: 0, y: 0 },
        color: getNodeColor(type),
      };

      const newNodes = {
        ...state.nodes,
        [newId]: newNode,
        [parentId]: {
          ...parent,
          children: [...parent.children, newId],
        },
      };

      // Recalculate layout
      const positions = calculateTreeLayout(state.rootId, newNodes);
      for (const [id, pos] of Object.entries(positions)) {
        if (newNodes[id]) {
          newNodes[id] = { ...newNodes[id], position: pos };
        }
      }

      return {
        ...state,
        nodes: newNodes,
        selectedNodeId: newId,
      };
    }

    case 'UPDATE_NODE': {
      const { id, content } = action.payload;
      if (!state.nodes[id]) return state;

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            content,
          },
        },
      };
    }

    case 'DELETE_NODE': {
      const { id } = action.payload;
      const node = state.nodes[id];
      
      // Cannot delete root node
      if (!node || node.parentId === null) return state;

      const newNodes = deleteNodeRecursively(id, state.nodes);
      
      // Recalculate layout
      const positions = calculateTreeLayout(state.rootId, newNodes);
      for (const [nodeId, pos] of Object.entries(positions)) {
        if (newNodes[nodeId]) {
          newNodes[nodeId] = { ...newNodes[nodeId], position: pos };
        }
      }

      return {
        ...state,
        nodes: newNodes,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    }

    case 'SELECT_NODE': {
      return {
        ...state,
        selectedNodeId: action.payload.id,
      };
    }

    case 'IMPORT_TREE': {
      const { tree } = action.payload;
      
      // Recalculate layout for imported tree
      const positions = calculateTreeLayout(tree.rootId, tree.nodes);
      const newNodes = { ...tree.nodes };
      
      for (const [id, pos] of Object.entries(positions)) {
        if (newNodes[id]) {
          newNodes[id] = { ...newNodes[id], position: pos };
        }
      }

      return {
        ...tree,
        nodes: newNodes,
        selectedNodeId: null,
      };
    }

    case 'UPDATE_POSITIONS': {
      const { positions } = action.payload;
      const newNodes = { ...state.nodes };
      
      for (const [id, pos] of Object.entries(positions)) {
        if (newNodes[id]) {
          newNodes[id] = { ...newNodes[id], position: pos };
        }
      }

      return {
        ...state,
        nodes: newNodes,
      };
    }

    case 'MOVE_NODE': {
      const { id, position } = action.payload;
      if (!state.nodes[id]) return state;

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            position,
          },
        },
      };
    }

    default:
      return state;
  }
}

// Deep clone a tree state
function cloneTreeState(state: TreeState): TreeState {
  return {
    rootId: state.rootId,
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    selectedNodeId: state.selectedNodeId,
  };
}

// Custom hook for tree state management with undo/redo
export function useOSTTree(initialTree?: TreeState) {
  const [tree, dispatch] = useReducer(
    treeReducer,
    initialTree || createDefaultTree()
  );

  // History stacks for undo/redo
  const historyRef = useRef<TreeState[]>([]);
  const futureRef = useRef<TreeState[]>([]);
  const isUndoRedoRef = useRef(false);

  // Save current state to history before making changes
  const saveToHistory = useCallback((currentState: TreeState) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    historyRef.current = [...historyRef.current, cloneTreeState(currentState)];
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY_SIZE);
    }
    
    // Clear future when new action is performed
    futureRef.current = [];
  }, []);

  const addNode = useCallback((parentId: string, nodeType?: NodeType) => {
    saveToHistory(tree);
    dispatch({ type: 'ADD_NODE', payload: { parentId, nodeType } });
  }, [tree, saveToHistory]);

  const updateNode = useCallback((id: string, content: string) => {
    saveToHistory(tree);
    dispatch({ type: 'UPDATE_NODE', payload: { id, content } });
  }, [tree, saveToHistory]);

  const deleteNode = useCallback((id: string) => {
    saveToHistory(tree);
    dispatch({ type: 'DELETE_NODE', payload: { id } });
  }, [tree, saveToHistory]);

  const selectNode = useCallback((id: string | null) => {
    // Don't save selection changes to history
    dispatch({ type: 'SELECT_NODE', payload: { id } });
  }, []);

  const importTree = useCallback((newTree: TreeState) => {
    saveToHistory(tree);
    dispatch({ type: 'IMPORT_TREE', payload: { tree: newTree } });
  }, [tree, saveToHistory]);

  const updatePositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    dispatch({ type: 'UPDATE_POSITIONS', payload: { positions } });
  }, []);

  const moveNode = useCallback((id: string, position: { x: number; y: number }) => {
    saveToHistory(tree);
    dispatch({ type: 'MOVE_NODE', payload: { id, position } });
  }, [tree, saveToHistory]);

  const recalculateLayout = useCallback(() => {
    const positions = calculateTreeLayout(tree.rootId, tree.nodes);
    updatePositions(positions);
  }, [tree.rootId, tree.nodes, updatePositions]);

  // Undo function
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    
    const previousState = historyRef.current.pop()!;
    futureRef.current = [cloneTreeState(tree), ...futureRef.current];
    
    isUndoRedoRef.current = true;
    dispatch({ type: 'IMPORT_TREE', payload: { tree: previousState } });
  }, [tree]);

  // Redo function
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    
    const nextState = futureRef.current.shift()!;
    historyRef.current = [...historyRef.current, cloneTreeState(tree)];
    
    isUndoRedoRef.current = true;
    dispatch({ type: 'IMPORT_TREE', payload: { tree: nextState } });
  }, [tree]);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return {
    tree,
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    importTree,
    updatePositions,
    moveNode,
    recalculateLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

export { createDefaultTree };

