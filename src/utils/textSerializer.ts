import { TreeState, OSTNode, NodeType } from '../types';

export interface SerializeOptions {
  useShorthand?: boolean; // Use O: vs OUTCOME:
  preserveDescriptions?: boolean;
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
  lines: string[]
): void {
  const indent = getIndentation(depth);
  const prefix = getPrefix(node.type, options.useShorthand ?? true);
  const line = `${indent}${prefix} ${node.content}`;
  lines.push(line);

  // Serialize children in order
  for (const childId of node.children) {
    const child = nodes[childId];
    if (child) {
      serializeNode(child, nodes, depth + 1, options, lines);
    }
  }
}

/**
 * Serialize tree state to text format
 */
export function serializeTree(
  tree: TreeState,
  options: SerializeOptions = {}
): string {
  const lines: string[] = [];
  const rootNode = tree.nodes[tree.rootId];

  if (!rootNode) {
    return '';
  }

  // Start serialization from root
  serializeNode(rootNode, tree.nodes, 0, options, lines);

  return lines.join('\n');
}
