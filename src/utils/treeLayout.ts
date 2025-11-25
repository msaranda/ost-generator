import { OSTNode, LAYOUT_CONFIG, NODE_SIZES, NodeType } from '../types';

interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
  height: number;
  x: number;
  y: number;
}

// Build a tree structure from flat nodes map
function buildTree(
  nodeId: string,
  nodes: Record<string, OSTNode>
): TreeNode | null {
  const node = nodes[nodeId];
  if (!node) return null;

  const size = NODE_SIZES[node.type as NodeType] || NODE_SIZES.opportunity;

  const treeNode: TreeNode = {
    id: nodeId,
    children: [],
    width: size.width,
    height: size.height,
    x: 0,
    y: 0,
  };

  for (const childId of node.children) {
    const childNode = buildTree(childId, nodes);
    if (childNode) {
      treeNode.children.push(childNode);
    }
  }

  return treeNode;
}

// Calculate the width required by a subtree (post-order traversal)
function calculateSubtreeWidths(node: TreeNode): Record<string, number> {
  const widths: Record<string, number> = {};

  function traverse(n: TreeNode): number {
    if (n.children.length === 0) {
      widths[n.id] = n.width + LAYOUT_CONFIG.NODE_SPACING;
      return widths[n.id];
    }

    let totalChildWidth = 0;
    for (const child of n.children) {
      totalChildWidth += traverse(child);
    }

    // Add spacing between siblings
    totalChildWidth += (n.children.length - 1) * LAYOUT_CONFIG.MIN_NODE_SPACING;

    widths[n.id] = Math.max(n.width + LAYOUT_CONFIG.NODE_SPACING, totalChildWidth);
    return widths[n.id];
  }

  traverse(node);
  return widths;
}

// Position nodes in the tree (pre-order traversal)
function positionNodes(
  node: TreeNode,
  widths: Record<string, number>,
  x: number,
  level: number
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  function traverse(n: TreeNode, centerX: number, currentLevel: number) {
    // Position this node
    positions[n.id] = {
      x: centerX - n.width / 2,
      y: currentLevel * LAYOUT_CONFIG.LEVEL_HEIGHT,
    };

    if (n.children.length === 0) return;

    // Calculate starting X for children
    const totalChildWidth = n.children.reduce(
      (sum, child) => sum + widths[child.id],
      0
    );
    
    let currentX = centerX - totalChildWidth / 2;

    for (const child of n.children) {
      const childWidth = widths[child.id];
      traverse(child, currentX + childWidth / 2, currentLevel + 1);
      currentX += childWidth;
    }
  }

  traverse(node, x, level);
  return positions;
}

// Main layout function
export function calculateTreeLayout(
  rootId: string,
  nodes: Record<string, OSTNode>
): Record<string, { x: number; y: number }> {
  if (!rootId || Object.keys(nodes).length === 0) {
    return {};
  }

  const tree = buildTree(rootId, nodes);
  if (!tree) return {};

  const widths = calculateSubtreeWidths(tree);
  const positions = positionNodes(tree, widths, 0, 0);

  return positions;
}

// Calculate bounding box of all nodes
export function calculateBoundingBox(
  nodes: Record<string, OSTNode>
): { x: number; y: number; width: number; height: number } {
  const nodeList = Object.values(nodes);
  
  if (nodeList.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodeList) {
    const size = NODE_SIZES[node.type as NodeType] || NODE_SIZES.opportunity;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

