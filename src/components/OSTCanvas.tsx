import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  NodeDragHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TreeState, OSTNode, NODE_SIZES, NodeType } from '../types';
import StickyNote from './StickyNote';
import ConnectionLine from './ConnectionLine';

interface OSTCanvasProps {
  tree: TreeState;
  onUpdateNode: (id: string, content: string) => void;
  onDeleteNode: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onSelectNode: (id: string | null) => void;
  onRequestDelete: (id: string) => void;
  onMoveNode: (id: string, position: { x: number; y: number }) => void;
  onEditingChange: (isEditing: boolean) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  layoutMode: 'auto' | 'manual';
  isReadOnly?: boolean;
}

export interface OSTCanvasHandle {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getCanvasElement: () => HTMLElement | null;
}

// Custom node types
const nodeTypes: NodeTypes = {
  stickyNote: StickyNote,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  custom: ConnectionLine,
};

// Inner component that uses ReactFlow hooks
const OSTCanvasInner = forwardRef<OSTCanvasHandle, OSTCanvasProps>(
  function OSTCanvasInner(
    {
      tree,
      onUpdateNode,
      onDeleteNode: _onDeleteNode,
      onAddChild,
      onSelectNode,
      onRequestDelete,
      onMoveNode,
      onEditingChange,
      zoom: _zoom,
      onZoomChange,
      layoutMode,
      isReadOnly = false,
    },
    ref
  ) {
    const reactFlowInstance = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      fitView: () => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      },
      zoomIn: () => {
        reactFlowInstance.zoomIn({ duration: 200 });
      },
      zoomOut: () => {
        reactFlowInstance.zoomOut({ duration: 200 });
      },
      getCanvasElement: () => containerRef.current,
    }));

    // Convert tree nodes to ReactFlow nodes
    const nodes: Node[] = useMemo(() => {
      return Object.values(tree.nodes).map((node: OSTNode) => {
        const size = NODE_SIZES[node.type as NodeType] || NODE_SIZES.opportunity;
        return {
          id: node.id,
          type: 'stickyNote',
          position: node.position,
          data: {
            ...node,
            onUpdate: onUpdateNode,
            onDelete: onRequestDelete,
            onAddChild,
            onSelect: onSelectNode,
            onEditingChange,
            isSelected: tree.selectedNodeId === node.id,
            isReadOnly,
          },
          style: {
            width: size.width,
            height: size.height,
          },
          draggable: layoutMode === 'manual' && !isReadOnly, // Enable dragging in manual mode (not in read-only)
        };
      });
    }, [tree.nodes, tree.selectedNodeId, onUpdateNode, onRequestDelete, onAddChild, onSelectNode, onEditingChange, layoutMode, isReadOnly]);

    // Handle node drag end (for manual mode)
    const handleNodeDragStop: NodeDragHandler = useCallback(
      (_event, node) => {
        if (layoutMode === 'manual') {
          onMoveNode(node.id, node.position);
        }
      },
      [layoutMode, onMoveNode]
    );

    // Convert tree structure to ReactFlow edges
    const edges: Edge[] = useMemo(() => {
      const edgeList: Edge[] = [];
      
      Object.values(tree.nodes).forEach((node: OSTNode) => {
        node.children.forEach((childId) => {
          edgeList.push({
            id: `${node.id}-${childId}`,
            source: node.id,
            target: childId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#757575', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#757575',
              width: 20,
              height: 20,
            },
          });
        });
      });
      
      return edgeList;
    }, [tree.nodes]);

    // Handle zoom changes
    const handleMoveEnd = useCallback(
      (_event: unknown, viewport: { zoom: number }) => {
        onZoomChange(viewport.zoom);
      },
      [onZoomChange]
    );

    // Handle click on empty canvas
    const handlePaneClick = useCallback(() => {
      onSelectNode(null);
    }, [onSelectNode]);

    // Get node color for minimap
    const nodeColor = useCallback((node: Node) => {
      const nodeData = tree.nodes[node.id];
      if (!nodeData) return '#BBDEFB';
      
      switch (nodeData.type) {
        case 'outcome':
          return '#FFF9C4';
        case 'opportunity':
          return '#BBDEFB';
        case 'solution':
          return '#C8E6C9';
        case 'sub-opportunity':
          return '#E1BEE7';
        default:
          return '#BBDEFB';
      }
    }, [tree.nodes]);

    return (
      <div ref={containerRef} className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onMoveEnd={handleMoveEnd}
          onPaneClick={handlePaneClick}
          onNodeDragStop={handleNodeDragStop}
          nodesDraggable={layoutMode === 'manual'}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-canvas"
        >
          <Background color="#e5e5e5" gap={20} />
          <Controls 
            showZoom={false}
            showFitView={false}
            showInteractive={false}
            className="hidden"
          />
          <MiniMap
            nodeColor={nodeColor}
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-white !border !border-gray-200 !rounded-lg !shadow-md"
          />
        </ReactFlow>
      </div>
    );
  }
);

// Wrapper component that provides ReactFlow context
const OSTCanvas = forwardRef<OSTCanvasHandle, OSTCanvasProps>(
  function OSTCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <OSTCanvasInner {...props} ref={ref} />
      </ReactFlowProvider>
    );
  }
);

export default OSTCanvas;

