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
  nodeLineMap?: Record<string, number>; // Maps node ID to line number
}

interface ParseContext {
  lines: string[];
  currentLine: number;
  nodeStack: Array<{ node: OSTNode; indentLevel: number }>;
  errors: ValidationError[];
  nodeMap: Record<string, OSTNode>;
  nodeLineMap: Record<string, number>; // Maps node ID to line number
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
 * Check if a line is a metadata field
 * Supports any label: content pattern where label contains alphanumeric characters, spaces, and underscores
 */
function isMetadataField(line: string): { isMetadata: boolean; fieldName: string | null; value: string } {
  const trimmed = line.trim();
  // Match pattern: label: content where label is alphanumeric, spaces, underscores
  // Pattern: ^([A-Za-z0-9_\s]+):\s*(.+)$
  const metadataPattern = /^([A-Za-z0-9_\s]+):\s*(.+)$/;
  const match = trimmed.match(metadataPattern);
  
  if (match) {
    const fieldName = match[1].trim();
    const value = match[2].trim();
    return { isMetadata: true, fieldName, value };
  }
  
  return { isMetadata: false, fieldName: null, value: '' };
}

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
 * Check if a line is a quoted description
 */
function isQuotedDescription(line: string): boolean {
  const trimmed = line.trim();
  return (trimmed.startsWith('"') && trimmed.endsWith('"')) || 
         (trimmed.startsWith("'") && trimmed.endsWith("'"));
}

/**
 * Extract description from quoted line
 */
function extractQuotedDescription(line: string): string {
  const trimmed = line.trim();
  return trimmed.slice(1, -1); // Remove quotes
}

/**
 * Check if a line is a continuation line (indented but no prefix)
 */
function isContinuationLine(line: string, expectedIndent: number): boolean {
  const indentLevel = getIndentLevel(line);
  const trimmed = line.trim();
  
  // Must be indented more than the node and not have a node prefix
  if (indentLevel <= expectedIndent || trimmed === '') {
    return false;
  }
  
  // Check if it has a node prefix
  for (const prefix of Object.keys(PREFIX_MAP)) {
    if (trimmed.startsWith(prefix)) {
      return false;
    }
  }
  
  return true;
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
    nodeLineMap: {},
  };

  let rootId: string | null = null;
  let lastNode: OSTNode | null = null;
  let lastNodeIndent: number = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    context.currentLine = i + 1; // 1-indexed for user display

    // Skip empty lines (they terminate multi-line content)
    if (line.trim() === '') {
      lastNode = null;
      lastNodeIndent = -1;
      continue;
    }

    const indentLevel = getIndentLevel(line);
    const { prefix, content, nodeType } = parseLine(line);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:215',message:'parsing line',data:{lineNumber:context.currentLine,indentLevel,nodeType,prefix,content:content.substring(0,50),lastNodeType:lastNode?.type,lastNodeIndent,hasLastNode:lastNode!==null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Check if this is a metadata field, description, or continuation line for the last node
    // CRITICAL: Check if this is a node line FIRST - node lines should NEVER be treated as metadata
    // Even if they match the metadata pattern (like "OP: Opportunity 1"), they are nodes, not metadata
    const shouldCheckMetadata = lastNode !== null && lastNodeIndent >= 0 && indentLevel > lastNodeIndent && nodeType === null;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:220',message:'metadata check condition',data:{shouldCheckMetadata,hasLastNode:lastNode!==null,lastNodeIndent,indentLevel,isMoreIndented:indentLevel>lastNodeIndent,nodeTypeIsNull:nodeType===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (shouldCheckMetadata) {
      // Not a node line - check for metadata field
      const metadataCheck = isMetadataField(line);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:222',message:'checking metadata field',data:{lineNumber:context.currentLine,isMetadata:metadataCheck.isMetadata,fieldName:metadataCheck.fieldName,value:metadataCheck.value?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (metadataCheck.isMetadata && metadataCheck.fieldName) {
        // Initialize metadata object if it doesn't exist
        if (!lastNode.metadata) {
          lastNode.metadata = {};
        }
        // Add metadata value (support multiple instances of same type)
        if (!lastNode.metadata[metadataCheck.fieldName]) {
          lastNode.metadata[metadataCheck.fieldName] = [];
        }
        lastNode.metadata[metadataCheck.fieldName].push(metadataCheck.value);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:232',message:'added metadata to node',data:{lineNumber:context.currentLine,nodeId:lastNode.id,nodeType:lastNode.type,fieldName:metadataCheck.fieldName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        continue;
      }
      
      // Check for quoted description
      if (isQuotedDescription(line)) {
        const description = extractQuotedDescription(line);
        if (lastNode.description) {
          lastNode.description += '\n' + description;
        } else {
          lastNode.description = description;
        }
        continue;
      }
      
      // Check for continuation line (non-metadata, non-quoted content)
      if (isContinuationLine(line, lastNodeIndent)) {
        const continuationText = line.trim();
        if (lastNode.description) {
          lastNode.description += '\n' + continuationText;
        } else {
          lastNode.description = continuationText;
        }
        continue;
      }
    }

    // Validate prefix
    if (!nodeType) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:260',message:'nodeType is null - adding error',data:{lineNumber:context.currentLine,line:line.substring(0,50),indentLevel,lastNodeType:lastNode?.type,lastNodeIndent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
      metadata: undefined, // Will be populated if metadata fields are found
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
      context.nodeLineMap[nodeId] = context.currentLine;
      context.nodeStack.push({ node, indentLevel });
      lastNode = node;
      lastNodeIndent = indentLevel;
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
      context.nodeLineMap[nodeId] = context.currentLine;
      context.nodeStack.push({ node, indentLevel });
      lastNode = node;
      lastNodeIndent = indentLevel;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:352',message:'created child node',data:{lineNumber:context.currentLine,nodeId,nodeType,parentId:parent.id,parentType:parent.type,indentLevel,parentChildrenCount:parent.children.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:368',message:'parseText returning errors',data:{errorCount:context.errors.length,nodeCount:Object.keys(context.nodeMap).length,errors:context.errors.map(e=>({line:e.line,type:e.type,message:e.message}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return {
      success: false,
      errors: context.errors,
    };
  }

  if (!rootId) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:380',message:'parseText no rootId',data:{nodeCount:Object.keys(context.nodeMap).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

  const nodeCount = Object.keys(context.nodeMap).length;
  const nodesWithMetadata = Object.values(context.nodeMap).filter(n => n.metadata && Object.keys(n.metadata).length > 0).length;
  const nodesWithChildren = Object.values(context.nodeMap).filter(n => n.children.length > 0).length;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textParser.ts:392',message:'parseText success',data:{nodeCount,rootId,nodesWithMetadata,nodesWithChildren,nodeTypes:Object.values(context.nodeMap).map(n=>n.type)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  return {
    success: true,
    tree: {
      rootId,
      nodes: context.nodeMap,
      selectedNodeId: null,
    },
    errors: [],
    nodeLineMap: context.nodeLineMap,
  };
}
