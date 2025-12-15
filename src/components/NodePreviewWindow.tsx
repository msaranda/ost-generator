import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { X, Maximize2, Minimize2, Move } from 'lucide-react';
import ReactFlow, {
  Background,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TreeState, OSTNode, NODE_SIZES, NodeType } from '../types';
import StickyNote from './StickyNote';
import ConnectionLine from './ConnectionLine';

interface NodePreviewWindowProps {
  selectedNodeId: string | null;
  tree: TreeState;
  cursorLine: number;
  nodeLineMap: Record<string, number>;
  isReadOnly?: boolean;
}

// Custom node types
const nodeTypes: NodeTypes = {
  stickyNote: StickyNote,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  custom: ConnectionLine,
};

// Helper function to extract sub-tree (node + parent + children)
function extractSubTree(
  nodeId: string | null,
  tree: TreeState
): { nodes: Record<string, OSTNode>; edges: Array<{ source: string; target: string }> } {
  if (!nodeId || !tree.nodes[nodeId]) {
    return { nodes: {}, edges: [] };
  }

  const selectedNode = tree.nodes[nodeId];
  const subTreeNodes: Record<string, OSTNode> = { [nodeId]: selectedNode };
  const edges: Array<{ source: string; target: string }> = [];

  // Add parent node
  if (selectedNode.parentId && tree.nodes[selectedNode.parentId]) {
    subTreeNodes[selectedNode.parentId] = tree.nodes[selectedNode.parentId];
    edges.push({ source: selectedNode.parentId, target: nodeId });
  }

  // Add child nodes
  selectedNode.children.forEach((childId) => {
    if (tree.nodes[childId]) {
      subTreeNodes[childId] = tree.nodes[childId];
      edges.push({ source: nodeId, target: childId });
    }
  });

  return { nodes: subTreeNodes, edges };
}

export default function NodePreviewWindow({
  selectedNodeId,
  tree,
  cursorLine,
  nodeLineMap,
  isReadOnly = false,
}: NodePreviewWindowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    // Position in bottom-right corner by default
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, window.innerWidth - 420), // 400px width + 20px margin
        y: Math.max(20, window.innerHeight - 320), // 300px height + 20px margin
      };
    }
    return { x: 20, y: 20 };
  });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Update position on window resize to keep it in bounds
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setPosition((prev) => ({
          x: Math.min(prev.x, Math.max(20, window.innerWidth - size.width - 20)),
          y: Math.min(prev.y, Math.max(20, window.innerHeight - size.height - 20)),
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size.width, size.height]);

  // Determine which node to preview (selected node or node at cursor line)
  const previewNodeId = useMemo(() => {
    if (selectedNodeId) {
      return selectedNodeId;
    }
    // Find node at cursor line
    const nodeId = Object.keys(nodeLineMap).find((id) => nodeLineMap[id] === cursorLine);
    return nodeId || null;
  }, [selectedNodeId, cursorLine, nodeLineMap]);

  const previewNode = previewNodeId ? tree.nodes[previewNodeId] : null;

  // Extract sub-tree for expanded view
  const subTree = useMemo(() => {
    if (!previewNodeId) return { nodes: {}, edges: [] };
    return extractSubTree(previewNodeId, tree);
  }, [previewNodeId, tree]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  }, [position]);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up drag listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Don't render if no node to preview
  if (!previewNode) {
    return null;
  }

  return (
    <div
      ref={windowRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleDragStart}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg drag-handle cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Move size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Node Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isExpanded ? "Show single node" : "Show mini canvas"}
            title={isExpanded ? "Show single node" : "Show mini canvas"}
          >
            {isExpanded ? (
              <Minimize2 size={14} aria-hidden="true" />
            ) : (
              <Maximize2 size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isExpanded ? (
          <MiniCanvasView
            subTree={subTree}
            selectedNodeId={previewNodeId}
            tree={tree}
            isReadOnly={isReadOnly}
          />
        ) : (
          <SingleNodeView node={previewNode} isReadOnly={isReadOnly} />
        )}
      </div>
    </div>
  );
}

// Single node preview component
function SingleNodeView({ node, isReadOnly }: { node: OSTNode; isReadOnly: boolean }) {
  const size = NODE_SIZES[node.type as NodeType] || NODE_SIZES.opportunity;
  const scale = Math.min(1, 350 / size.width, 250 / size.height); // Scale to fit in preview window

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gray-50">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        <ReactFlowProvider>
          <StickyNote
            data={{
              ...node,
              onUpdate: () => {},
              onDelete: () => {},
              onAddChild: () => {},
              onSelect: () => {},
              onEditingChange: () => {},
              isSelected: true,
              isReadOnly,
            }}
            selected={true}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

// Mini canvas view inner component (uses ReactFlow hooks)
function MiniCanvasViewInner({
  subTree,
  selectedNodeId,
  tree,
  isReadOnly,
}: {
  subTree: { nodes: Record<string, OSTNode>; edges: Array<{ source: string; target: string }> };
  selectedNodeId: string | null;
  tree: TreeState;
  isReadOnly: boolean;
}) {
  const reactFlowInstance = useReactFlow();

  // Convert sub-tree nodes to ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    return Object.values(subTree.nodes).map((node: OSTNode) => {
      const size = NODE_SIZES[node.type as NodeType] || NODE_SIZES.opportunity;
      return {
        id: node.id,
        type: 'stickyNote',
        position: node.position,
        data: {
          ...node,
          onUpdate: () => {},
          onDelete: () => {},
          onAddChild: () => {},
          onSelect: () => {},
          onEditingChange: () => {},
          onTextSaved: () => {},
          isSelected: selectedNodeId === node.id,
          isReadOnly: true, // Always read-only in preview
        },
        style: {
          width: size.width,
          height: size.height,
        },
        draggable: false,
      };
    });
  }, [subTree.nodes, selectedNodeId]);

  // Convert edges
  const edges: Edge[] = useMemo(() => {
    return subTree.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#757575', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#757575',
        width: 20,
        height: 20,
      },
    }));
  }, [subTree.edges]);

  // Fit view to show all nodes when expanded
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, reactFlowInstance]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={true}
      zoomOnScroll={true}
      zoomOnPinch={true}
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{
        type: 'smoothstep',
      }}
      proOptions={{ hideAttribution: true }}
      className="bg-gray-50"
    >
      <Background color="#e5e5e5" gap={20} />
    </ReactFlow>
  );
}

// Mini canvas view component (wrapped with ReactFlowProvider)
function MiniCanvasView({
  subTree,
  selectedNodeId,
  tree,
  isReadOnly,
}: {
  subTree: { nodes: Record<string, OSTNode>; edges: Array<{ source: string; target: string }> };
  selectedNodeId: string | null;
  tree: TreeState;
  isReadOnly: boolean;
}) {
  return (
    <ReactFlowProvider>
      <MiniCanvasViewInner
        subTree={subTree}
        selectedNodeId={selectedNodeId}
        tree={tree}
        isReadOnly={isReadOnly}
      />
    </ReactFlowProvider>
  );
}

