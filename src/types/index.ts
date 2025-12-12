// Node types for the OST tree
export type NodeType =
  | "outcome"
  | "opportunity"
  | "solution"
  | "sub-opportunity";

// Individual node in the tree
export interface OSTNode {
  id: string;
  type: NodeType;
  content: string;
  description?: string; // Optional multi-line description
  parentId: string | null;
  children: string[];
  position: { x: number; y: number };
  color: string;
}

// Tree state containing all nodes
export interface TreeState {
  rootId: string;
  nodes: Record<string, OSTNode>;
  selectedNodeId: string | null;
}

// UI state for canvas interactions
export interface UIState {
  zoom: number;
  pan: { x: number; y: number };
  layoutMode: "auto" | "manual";
}

// Combined app state
export interface AppState {
  tree: TreeState;
  ui: UIState;
}

// JSON export structure
export interface ExportData {
  version: string;
  created: string;
  modified: string;
  tree: {
    rootId: string;
    nodes: Record<string, OSTNode>;
  };
}

// Action types for tree reducer
export type TreeAction =
  | { type: "ADD_NODE"; payload: { parentId: string; nodeType?: NodeType } }
  | { type: "UPDATE_NODE"; payload: { id: string; content: string } }
  | { type: "DELETE_NODE"; payload: { id: string } }
  | { type: "SELECT_NODE"; payload: { id: string | null } }
  | { type: "IMPORT_TREE"; payload: { tree: TreeState } }
  | {
      type: "UPDATE_POSITIONS";
      payload: { positions: Record<string, { x: number; y: number }> };
    }
  | {
      type: "MOVE_NODE";
      payload: { id: string; position: { x: number; y: number } };
    };

// Node size configurations
export const NODE_SIZES: Record<NodeType, { width: number; height: number }> = {
  outcome: { width: 350, height: 200 },
  opportunity: { width: 320, height: 180 },
  solution: { width: 300, height: 160 },
  "sub-opportunity": { width: 320, height: 180 },
};

// Node color configurations
export const NODE_COLORS: Record<NodeType, string> = {
  outcome: "#FFF9C4",
  opportunity: "#BBDEFB",
  solution: "#C8E6C9",
  "sub-opportunity": "#E1BEE7",
};

// Layout constants
export const LAYOUT_CONFIG = {
  LEVEL_HEIGHT: 280,
  NODE_SPACING: 120,
  MIN_NODE_SPACING: 80,
};

// Validation error types
export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
