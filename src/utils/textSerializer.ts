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

  const metadataIndent = getIndentation(depth + 1);

  // Serialize metadata fields if present (order: Evidence, Problem, Supporting Data, Impact, Effort)
  if (node.metadata && (options.preserveDescriptions ?? true)) {
    const metadataOrder = ['Evidence', 'Problem', 'Supporting Data', 'Impact', 'Effort'];
    for (const fieldName of metadataOrder) {
      if (node.metadata[fieldName] && node.metadata[fieldName].length > 0) {
        for (const value of node.metadata[fieldName]) {
          lines.push(`${metadataIndent}${fieldName}: ${value}`);
        }
      }
    }
    // Also serialize any metadata fields not in the standard order
    for (const [fieldName, values] of Object.entries(node.metadata)) {
      if (!metadataOrder.includes(fieldName)) {
        for (const value of values) {
          lines.push(`${metadataIndent}${fieldName}: ${value}`);
        }
      }
    }
  }

  // Serialize description if present and preserveDescriptions is enabled
  if (node.description && (options.preserveDescriptions ?? true)) {
    const descriptionLines = node.description.split('\n');
    const descriptionIndent = getIndentation(depth + 1);
    
    for (const descLine of descriptionLines) {
      // Use quotes for the first line if it's a single line, otherwise use continuation format
      if (descriptionLines.length === 1) {
        lines.push(`${descriptionIndent}"${descLine}"`);
      } else {
        lines.push(`${descriptionIndent}${descLine}`);
      }
    }
  }

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
