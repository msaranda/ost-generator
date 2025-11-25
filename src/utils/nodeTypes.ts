import { NodeType, NODE_COLORS, NODE_SIZES } from '../types';

// Determine what type a child node should be based on parent type
export function getChildNodeType(parentType: NodeType): NodeType {
  switch (parentType) {
    case 'outcome':
      return 'opportunity';
    case 'opportunity':
      return 'solution';
    case 'solution':
      return 'sub-opportunity';
    case 'sub-opportunity':
      return 'solution';
    default:
      return 'opportunity';
  }
}

// Get node color by type
export function getNodeColor(type: NodeType): string {
  return NODE_COLORS[type] || NODE_COLORS.opportunity;
}

// Get node size by type
export function getNodeSize(type: NodeType): { width: number; height: number } {
  return NODE_SIZES[type] || NODE_SIZES.opportunity;
}

// Get default content for a new node
export function getDefaultContent(type: NodeType): string {
  switch (type) {
    case 'outcome':
      return 'Your outcome here';
    case 'opportunity':
      return 'New opportunity';
    case 'solution':
      return 'New solution';
    case 'sub-opportunity':
      return 'New sub-opportunity';
    default:
      return 'New node';
  }
}

// Get display label for node type
export function getNodeTypeLabel(type: NodeType): string {
  switch (type) {
    case 'outcome':
      return 'Outcome';
    case 'opportunity':
      return 'Opportunity';
    case 'solution':
      return 'Solution';
    case 'sub-opportunity':
      return 'Sub-opportunity';
    default:
      return 'Node';
  }
}

