import { ExportData, OSTNode, ValidationResult, ValidationError, NodeType } from '../types';

const VALID_NODE_TYPES: NodeType[] = ['outcome', 'opportunity', 'solution', 'sub-opportunity'];

// Check if a value is a valid node type
function isValidNodeType(type: string): type is NodeType {
  return VALID_NODE_TYPES.includes(type as NodeType);
}

// Validate a single node object
function validateNode(node: unknown, id: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!node || typeof node !== 'object') {
    errors.push({ code: 'INVALID_NODE', message: `Node ${id} is not a valid object` });
    return errors;
  }

  const n = node as Record<string, unknown>;

  if (typeof n.id !== 'string' || n.id !== id) {
    errors.push({ code: 'INVALID_ID', message: `Node ${id} has mismatched id` });
  }

  if (typeof n.type !== 'string' || !isValidNodeType(n.type)) {
    errors.push({ code: 'INVALID_TYPE', message: `Node ${id} has invalid type: ${n.type}` });
  }

  if (typeof n.content !== 'string') {
    errors.push({ code: 'INVALID_CONTENT', message: `Node ${id} has invalid content` });
  }

  if (n.parentId !== null && typeof n.parentId !== 'string') {
    errors.push({ code: 'INVALID_PARENT', message: `Node ${id} has invalid parentId` });
  }

  if (!Array.isArray(n.children)) {
    errors.push({ code: 'INVALID_CHILDREN', message: `Node ${id} has invalid children array` });
  } else {
    for (const childId of n.children) {
      if (typeof childId !== 'string') {
        errors.push({ code: 'INVALID_CHILD_ID', message: `Node ${id} has invalid child id` });
      }
    }
  }

  return errors;
}

// Check for circular references in the tree
function hasCircularReference(
  nodeId: string,
  nodes: Record<string, OSTNode>,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(nodeId)) {
    return true;
  }

  const node = nodes[nodeId];
  if (!node) return false;

  visited.add(nodeId);

  for (const childId of node.children) {
    if (hasCircularReference(childId, nodes, new Set(visited))) {
      return true;
    }
  }

  return false;
}

// Main validation function
export function validateTreeJSON(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Check basic structure
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ code: 'INVALID_FORMAT', message: 'Invalid JSON format' }] };
  }

  const d = data as Record<string, unknown>;

  // Check version
  if (typeof d.version !== 'string') {
    errors.push({ code: 'MISSING_VERSION', message: 'Missing or invalid version field' });
  }

  // Check tree structure
  if (!d.tree || typeof d.tree !== 'object') {
    return { valid: false, errors: [{ code: 'MISSING_TREE', message: 'Missing tree object' }] };
  }

  const tree = d.tree as Record<string, unknown>;

  // Check rootId
  if (typeof tree.rootId !== 'string') {
    errors.push({ code: 'INVALID_ROOT_ID', message: 'Invalid or missing rootId' });
    return { valid: false, errors };
  }

  // Check nodes
  if (!tree.nodes || typeof tree.nodes !== 'object') {
    return { valid: false, errors: [{ code: 'MISSING_NODES', message: 'Missing nodes object' }] };
  }

  const nodes = tree.nodes as Record<string, unknown>;

  // Validate each node
  for (const [id, node] of Object.entries(nodes)) {
    const nodeErrors = validateNode(node, id);
    errors.push(...nodeErrors);
  }

  // Check rootId exists in nodes
  if (!nodes[tree.rootId as string]) {
    errors.push({ code: 'ROOT_NOT_FOUND', message: 'rootId does not exist in nodes' });
  }

  // If we have errors at this point, return them
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validNodes = nodes as Record<string, OSTNode>;

  // Check all parent references exist
  for (const [id, node] of Object.entries(validNodes)) {
    if (node.parentId !== null && !validNodes[node.parentId]) {
      errors.push({ code: 'PARENT_NOT_FOUND', message: `Node ${id} references non-existent parent ${node.parentId}` });
    }
  }

  // Check all children references exist
  for (const [id, node] of Object.entries(validNodes)) {
    for (const childId of node.children) {
      if (!validNodes[childId]) {
        errors.push({ code: 'CHILD_NOT_FOUND', message: `Node ${id} references non-existent child ${childId}` });
      }
    }
  }

  // Check for only one root (parentId === null)
  const roots = Object.values(validNodes).filter(n => n.parentId === null);
  if (roots.length === 0) {
    errors.push({ code: 'NO_ROOT', message: 'No root node found (no node with parentId === null)' });
  } else if (roots.length > 1) {
    errors.push({ code: 'MULTIPLE_ROOTS', message: 'Multiple root nodes found' });
  }

  // Check for circular references
  if (hasCircularReference(tree.rootId as string, validNodes)) {
    errors.push({ code: 'CIRCULAR_REFERENCE', message: 'Tree contains circular references' });
  }

  return { valid: errors.length === 0, errors };
}

// Convert validated data to TreeState
export function parseValidatedData(data: ExportData) {
  return {
    rootId: data.tree.rootId,
    nodes: data.tree.nodes,
    selectedNodeId: null,
  };
}

