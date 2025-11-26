import { v4 as uuidv4 } from 'uuid';
import { TreeState, OSTNode, NodeType } from '../types';
import { getNodeColor } from './nodeTypes';

export interface ValidationError {
  line: number;
  column: number;
  type: 'syntax' | 'indentation' | 'hierarchy' | 'prefix';
  message: string;
}

export interface ParseResult {
  success: boolean;
  tree?: TreeState;
  errors: ValidationError[];
}

interface ParseContext {
  lines: string[];
  currentLine: number;
  nodeStack: Array<{ node: OSTNode; indentLevel: number }>;
  errors: ValidationError[];
  nodeMap: Record<string, OSTNode>;
}

// Prefix mapping for node types
const PREFIX_MAP: Record<string, NodeType> = {
  'O:': 'outcome',
  'OUTCOME:': 'outcome',
  'OP:': 'opportunity',
  'OPP:': 'opportunity',
  'S:': 'solution',
  'SOL:': 'solution',
  'SU:': 'sub-opportunity',
  'SUB:': 'sub-opportunity',
};

// Valid child types for each parent type
const VALID_CHILDREN: Record<NodeType, NodeType[]> = {
  'outcome': ['opportunity'],
  'opportunity': ['solution', 'sub-opportunity'],
  'solution': ['sub-opportunity'],
  'sub-opportunity': ['solution'],
};

/**
 * Calculate indentation level from leading spaces
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^( *)/);
  return match ? match[1].length : 0;
}

/**
 * Extract prefix and content from a line
 */
function parseLine(line: string): { prefix: string; content: string; nodeType: NodeType | null } {
  const trimmed = line.trim();
  
  // Try to match any known prefix
  for (const [prefix, nodeType] of Object.entries(PREFIX_MAP)) {
    if (trimmed.startsWith(prefix)) {
      const content = trimmed.substring(prefix.length).trim();
      return { prefix, content, nodeType };
    }
  }
  
  return { prefix: '', content: trimmed, nodeType: null };
}

/**
 * Validate indentation is a multiple of 2
 */
function validateIndentation(indentLevel: number, lineNumber: number, errors: ValidationError[]): boolean {
  if (indentLevel % 2 !== 0) {
    errors.push({
      line: lineNumber,
      column: 0,
      type: 'indentation',
      message: `Indentation must be a multiple of 2 spaces (found ${indentLevel} spaces)`,
    });
    return false;
  }
  return true;
}

/**
 * Validate parent-child relationship
 */
function validateHierarchy(
  parentType: NodeType,
  childType: NodeType,
  lineNumber: number,
  errors: ValidationError[]
): boolean {
  const validChildren = VALID_CHILDREN[parentType];
  if (!validChildren.includes(childType)) {
    errors.push({
      line: lineNumber,
      column: 0,
      type: 'hierarchy',
      message: `Invalid hierarchy: ${childType} cannot be a child of ${parentType}`,
    });
    return false;
  }
  return true;
}

/**
 * Find parent node based on indentation level
 */
function findParent(
  indentLevel: number,
  nodeStack: Array<{ node: OSTNode; indentLevel: number }>
): OSTNode | null {
  // Pop nodes from stack until we find the parent level
  while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].indentLevel >= indentLevel) {
    nodeStack.pop();
  }
  
  return nodeStack.length > 0 ? nodeStack[nodeStack.length - 1].node : null;
}

/**
 * Parse text content into a tree structure
 */
export function parseText(text: string): ParseResult {
  const lines = text.split('\n');
  const context: ParseContext = {
    lines,
    currentLine: 0,
    nodeStack: [],
    errors: [],
    nodeMap: {},
  };

  let rootId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    context.currentLine = i + 1; // 1-indexed for user display

    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }

    const indentLevel = getIndentLevel(line);
    const { prefix, content, nodeType } = parseLine(line);

    // Validate prefix
    if (!nodeType) {
      context.errors.push({
        line: context.currentLine,
        column: indentLevel,
        type: 'prefix',
        message: `Invalid or missing node prefix. Expected one of: O:, OP:, S:, SU:`,
      });
      continue;
    }

    // Validate indentation
    if (!validateIndentation(indentLevel, context.currentLine, context.errors)) {
      continue;
    }

    // Validate content is not empty
    if (!content) {
      context.errors.push({
        line: context.currentLine,
        column: indentLevel + prefix.length,
        type: 'syntax',
        message: 'Node content cannot be empty',
      });
      continue;
    }

    // Create node
    const nodeId = uuidv4();
    const node: OSTNode = {
      id: nodeId,
      type: nodeType,
      content,
      parentId: null,
      children: [],
      position: { x: 0, y: 0 },
      color: getNodeColor(nodeType),
    };

    // Handle root node (indentation 0)
    if (indentLevel === 0) {
      if (rootId !== null) {
        context.errors.push({
          line: context.currentLine,
          column: 0,
          type: 'hierarchy',
          message: 'Multiple root nodes found. Only one root node (outcome) is allowed',
        });
        continue;
      }

      if (nodeType !== 'outcome') {
        context.errors.push({
          line: context.currentLine,
          column: 0,
          type: 'hierarchy',
          message: 'Root node must be of type outcome',
        });
        continue;
      }

      rootId = nodeId;
      context.nodeMap[nodeId] = node;
      context.nodeStack.push({ node, indentLevel });
    } else {
      // Find parent based on indentation
      const parent = findParent(indentLevel, context.nodeStack);

      if (!parent) {
        context.errors.push({
          line: context.currentLine,
          column: 0,
          type: 'indentation',
          message: 'Invalid indentation: no parent node found at this level',
        });
        continue;
      }

      // Validate hierarchy
      if (!validateHierarchy(parent.type, nodeType, context.currentLine, context.errors)) {
        continue;
      }

      // Link parent and child
      node.parentId = parent.id;
      parent.children.push(nodeId);
      context.nodeMap[nodeId] = node;
      context.nodeStack.push({ node, indentLevel });
    }
  }

  // Check if we have a root node
  if (rootId === null && Object.keys(context.nodeMap).length > 0) {
    context.errors.push({
      line: 1,
      column: 0,
      type: 'hierarchy',
      message: 'No root node found. Tree must start with an outcome node at indentation level 0',
    });
  }

  // Return result
  if (context.errors.length > 0) {
    return {
      success: false,
      errors: context.errors,
    };
  }

  if (!rootId) {
    return {
      success: false,
      errors: [{
        line: 1,
        column: 0,
        type: 'syntax',
        message: 'Empty tree or no valid nodes found',
      }],
    };
  }

  return {
    success: true,
    tree: {
      rootId,
      nodes: context.nodeMap,
      selectedNodeId: null,
    },
    errors: [],
  };
}
