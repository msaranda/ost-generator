import { TreeState, OSTNode, NodeType } from '../types';

export interface SerializeOptions {
  useShorthand?: boolean; // Use O: vs OUTCOME:
  preserveDescriptions?: boolean;
}

export interface SerializeResult {
  text: string;
  nodeLineMap: Record<string, number>; // Maps node ID to line number
}

// Shorthand prefix mapping
const SHORTHAND_PREFIX: Record<NodeType, string> = {
  'outcome': 'O:',
  'opportunity': 'OP:',
  'solution': 'S:',
  'sub-opportunity': 'SU:',
};

// Full prefix mapping
const FULL_PREFIX: Record<NodeType, string> = {
  'outcome': 'OUTCOME:',
  'opportunity': 'OPP:',
  'solution': 'SOL:',
  'sub-opportunity': 'SUB:',
};

/**
 * Get the appropriate prefix for a node type
 */
function getPrefix(nodeType: NodeType, useShorthand: boolean): string {
  return useShorthand ? SHORTHAND_PREFIX[nodeType] : FULL_PREFIX[nodeType];
}

/**
 * Generate indentation string
 */
function getIndentation(depth: number): string {
  return '  '.repeat(depth);
}

/**
 * Serialize a single node and its children recursively
 */
function serializeNode(
  node: OSTNode,
  nodes: Record<string, OSTNode>,
  depth: number,
  options: SerializeOptions,
  lines: string[],
  nodeLineMap: Record<string, number>
): void {
  const indent = getIndentation(depth);
  const prefix = getPrefix(node.type, options.useShorthand ?? true);
  const line = `${indent}${prefix} ${node.content}`;
  
  // Track line number (1-indexed)
  const lineNumber = lines.length + 1;
  nodeLineMap[node.id] = lineNumber;
  lines.push(line);

  // Serialize children in order
  for (const childId of node.children) {
    const child = nodes[childId];
    if (child) {
      serializeNode(child, nodes, depth + 1, options, lines, nodeLineMap);
    }
  }
}

/**
 * Serialize tree state to text format
 */
export function serializeTree(
  tree: TreeState,
  options: SerializeOptions = {}
): SerializeResult {
  const lines: string[] = [];
  const nodeLineMap: Record<string, number> = {};
  const rootNode = tree.nodes[tree.rootId];

  if (!rootNode) {
    return { text: '', nodeLineMap: {} };
  }

  // Start serialization from root
  serializeNode(rootNode, tree.nodes, 0, options, lines, nodeLineMap);

  return {
    text: lines.join('\n'),
    nodeLineMap,
  };
}
