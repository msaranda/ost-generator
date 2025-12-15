import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { TreeState } from '../types';
import CodeMirrorEditor from './CodeMirrorEditor';
import { useTextEditor } from '../hooks/useTextEditor';
import { useTreeSerializer } from '../hooks/useTreeSerializer';
import NodePreviewWindow from './NodePreviewWindow';

interface TextEditorPanelProps {
  tree: TreeState;
  isVisible: boolean;
  isReadOnly: boolean;
  onTreeUpdate: (tree: TreeState) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
  onRecalculateLayout: () => void;
  canvasRef?: React.RefObject<{ panToNode: (nodeId: string) => void; zoomToNode: (nodeId: string) => void }>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200; // Increased from 600 to allow larger editor width
const DEFAULT_WIDTH = 400;



export default function TextEditorPanel({
  tree,
  isVisible,
  isReadOnly,
  onTreeUpdate,
  selectedNodeId,
  onSelectNode,
  onClose,
  onRecalculateLayout,
  canvasRef,
  isFullscreen = false,
  onToggleFullscreen,
}: TextEditorPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [nodeLineMap, setNodeLineMap] = useState<Record<string, number>>({});
  
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Text editor hook - handles text changes and parsing
  const {
    textContent,
    setTextContent,
    validationErrors,
    isParsing,
    cursorPosition,
    setCursorPosition,
    handleTextChange,
    nodeLineMap: parsedNodeLineMap,
  } = useTextEditor({
    tree,
    onTreeUpdate: (newTree) => {
      // Update tree state
      onTreeUpdate(newTree);
      // Trigger layout recalculation after text updates
      onRecalculateLayout();
    },
    isReadOnly,
  });

  // Tree serializer hook - handles tree changes to text
  const { nodeLineMap: serializedNodeLineMap } = useTreeSerializer({
    tree,
    onTextUpdate: (text) => {
      setTextContent(text);
    },
  });

  // Update node line map - prefer parsed map if available, otherwise use serialized
  const prevParsedRef = useRef<string>('');
  const prevSerializedRef = useRef<string>('');
  
  useEffect(() => {
    const parsedKeys = Object.keys(parsedNodeLineMap);
    const serializedKeys = Object.keys(serializedNodeLineMap);
    
    if (parsedKeys.length > 0) {
      // Only update if the content actually changed
      const parsedStr = JSON.stringify(parsedNodeLineMap);
      if (parsedStr !== prevParsedRef.current) {
        prevParsedRef.current = parsedStr;
        setNodeLineMap(parsedNodeLineMap);
      }
    } else if (serializedKeys.length > 0) {
      // Only update if the content actually changed
      const serializedStr = JSON.stringify(serializedNodeLineMap);
      if (serializedStr !== prevSerializedRef.current) {
        prevSerializedRef.current = serializedStr;
        setNodeLineMap(serializedNodeLineMap);
      }
    }
  }, [parsedNodeLineMap, serializedNodeLineMap]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startXRef.current;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + deltaX));
    setWidth(newWidth);
  }, [isResizing]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Set up resize listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Handle cursor position change
  const handleCursorChange = useCallback((position: { line: number; column: number }) => {
    setCursorPosition(position);
  }, [setCursorPosition]);

  // Calculate selected line from selectedNodeId
  const selectedLine = selectedNodeId && nodeLineMap[selectedNodeId] 
    ? nodeLineMap[selectedNodeId] 
    : null;

  // Calculate selected line range (including metadata and description lines, but NOT children)
  const selectedLineRange = useMemo(() => {
    if (!selectedNodeId || !nodeLineMap[selectedNodeId] || !textContent) {
      return null;
    }

    const startLine = nodeLineMap[selectedNodeId];
    const lines = textContent.split('\n');
    if (startLine < 1 || startLine > lines.length) {
      return null;
    }

    const startLineText = lines[startLine - 1];
    const startIndent = (startLineText.match(/^( *)/)?.[1] || '').length;

    // Find the end line by looking for the first line that is NOT part of this node:
    // - Child node (has node prefix at higher indent)
    // - Sibling node (has node prefix at same or lower indent)
    // - Empty line followed by a node
    let endLine = startLine;
    
    // Note: startLine is 1-indexed, but lines array is 0-indexed
    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1; // Convert to 1-indexed for comparison
      const indent = (line.match(/^( *)/)?.[1] || '').length;
      const trimmed = line.trim();
      
      // Handle empty lines
      if (trimmed === '') {
        // Look ahead to see if next non-empty line is a node
        let foundNextNode = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.trim() === '') continue;
          
          const nextIndent = (nextLine.match(/^( *)/)?.[1] || '').length;
          const { nodeType } = parseLine(nextLine);
          
          // If next line is a node (child, sibling, or any node), the empty line is a separator - stop before it
          if (nodeType) {
            return { start: startLine, end: lineNumber - 1 };
          }
          // Next line is continuation/metadata - include the empty line
          break;
        }
        // No node found after empty line, include it
        endLine = lineNumber;
        continue;
      }

      // Check if this line is a node
      const { nodeType } = parseLine(line);
      
      if (nodeType) {
        // This is a node line
        if (lineNumber === startLine) {
          // This is the start line itself - include it
          endLine = lineNumber;
        } else if (indent > startIndent) {
          // Child node - stop before it (don't include children)
          break;
        } else {
          // Sibling node (same or lower indent) - stop before it
          break;
        }
      } else {
        // Not a node line - could be metadata, description, or continuation
        // Include it if it's more indented than start (metadata/description)
        // or if it's continuation at same indent
        if (indent > startIndent) {
          // Metadata or description line - include it
          endLine = lineNumber;
        } else if (indent === startIndent) {
          // Continuation line at same indent - include it
          endLine = lineNumber;
        } else {
          // Less indent without node prefix - shouldn't happen, but stop to be safe
          break;
        }
      }
    }

    return { start: startLine, end: endLine };
  }, [selectedNodeId, nodeLineMap, textContent]);

  // Helper function to parse line (extract prefix and node type)
  function parseLine(line: string): { prefix: string; content: string; nodeType: string | null } {
    const trimmed = line.trim();
    const prefixes = ['O:', 'OUTCOME:', 'OP:', 'OPP:', 'S:', 'SOL:', 'SU:', 'SUB:'];
    
    for (const prefix of prefixes) {
      if (trimmed.startsWith(prefix)) {
        return { prefix, content: trimmed.substring(prefix.length).trim(), nodeType: prefix };
      }
    }
    
    return { prefix: '', content: trimmed, nodeType: null };
  }

  // Helper function to find the node ID for a given line number
  // This handles both direct node lines and metadata/description lines
  const findNodeForLine = useCallback((lineNumber: number): string | null => {
    // First, check if this line is directly mapped to a node
    const directNodeId = Object.keys(nodeLineMap).find(id => nodeLineMap[id] === lineNumber);
    if (directNodeId) {
      return directNodeId;
    }

    // If not, this is likely a metadata/description line
    // Find the most recent node before this line that could be its parent
    // We need to check the text content to determine the correct parent based on indentation
    const lines = textContent.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) {
      return null;
    }

    const clickedLine = lines[lineNumber - 1];
    const clickedIndent = (clickedLine.match(/^( *)/)?.[1] || '').length;

    // Find the most recent node before this line
    // The parent node should be at a lower indent level
    let closestNodeId: string | null = null;
    let closestLine = 0;

    for (const [nodeId, nodeLine] of Object.entries(nodeLineMap)) {
      if (nodeLine < lineNumber && nodeLine > closestLine) {
        // Check if this node could be the parent (its indent should be less than clicked line)
        const nodeLineText = lines[nodeLine - 1];
        const nodeIndent = (nodeLineText.match(/^( *)/)?.[1] || '').length;
        
        // The clicked line should be indented more than the node (metadata/description)
        // or at the same level (shouldn't happen, but handle it)
        if (clickedIndent > nodeIndent || (clickedIndent === nodeIndent && nodeLine === lineNumber - 1)) {
          closestLine = nodeLine;
          closestNodeId = nodeId;
        }
      }
    }

    return closestNodeId;
  }, [nodeLineMap, textContent]);

  // Handle line click - select corresponding node
  const handleLineClick = useCallback((line: number) => {
    // Find node ID for this line (handles metadata/description lines too)
    const nodeId = findNodeForLine(line);
    if (nodeId) {
      onSelectNode(nodeId);
      // Pan and zoom visual canvas to center the selected node
      if (canvasRef?.current) {
        canvasRef.current.zoomToNode(nodeId);
      }
    }
  }, [findNodeForLine, onSelectNode, canvasRef]);

  if (!isVisible) return null;

  const errorCount = validationErrors.length;

  return (
    <aside
      ref={panelRef}
      className={`flex flex-col bg-white border-r border-gray-200 shadow-lg ${
        isFullscreen 
          ? 'fixed inset-0 z-50' 
          : 'h-full'
      }`}
      style={isFullscreen ? {} : { width: `${width}px` }}
      role="complementary"
      aria-label="Text editor panel"
    >
      {/* Panel Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800" id="text-editor-title">Text Editor</h2>
        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={16} aria-hidden="true" />
              ) : (
                <Maximize2 size={16} aria-hidden="true" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Close text editor panel"
            title="Close text editor"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Text Editor */}
      <main 
        className="flex-1 overflow-auto" 
        role="main"
        aria-labelledby="text-editor-title"
      >
        <CodeMirrorEditor
          value={textContent}
          onChange={handleTextChange}
          onCursorChange={handleCursorChange}
          selectedLine={selectedLine}
          selectedLineRange={selectedLineRange}
          diagnostics={validationErrors}
          readOnly={isReadOnly}
          onLineClick={handleLineClick}
        />
      </main>

      {/* ARIA live region for error announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {isParsing ? (
          'Parsing tree structure'
        ) : errorCount > 0 ? (
          `${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'} found`
        ) : (
          'No validation errors'
        )}
      </div>

      {/* Panel Footer */}
      <footer 
        className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50"
        role="status"
        aria-label="Editor status"
      >
        <div className="text-xs text-gray-600">
          {isParsing ? (
            <span className="text-blue-600 font-medium" aria-label="Parsing in progress">Parsing...</span>
          ) : errorCount > 0 ? (
            <span className="text-red-600 font-medium" aria-label={`${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}`}>
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          ) : (
            <span className="text-green-600 font-medium" aria-label="No validation errors">No errors</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isReadOnly && (
            <div className="text-xs text-amber-600 font-medium" role="status" aria-label="Editor is in read-only mode">Read-only</div>
          )}
          <div className="text-xs text-gray-500" aria-label={`Cursor position: Line ${cursorPosition.line}, Column ${cursorPosition.column}`}>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </div>
        </div>
      </footer>

      {/* Resize Handle - hidden in fullscreen mode */}
      {!isFullscreen && (
        <button
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors focus:outline-none focus:bg-blue-500 focus:w-2 ${
            isResizing ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onMouseDown={handleResizeStart}
          style={{ touchAction: 'none' }}
          aria-label="Resize text editor panel. Use left and right arrow keys to adjust width."
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          type="button"
          onKeyDown={(e) => {
            // Allow keyboard resizing with arrow keys
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setWidth(prev => Math.max(MIN_WIDTH, prev - 10));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setWidth(prev => Math.min(MAX_WIDTH, prev + 10));
            }
          }}
        />
      )}

      {/* Node Preview Window - only shown in fullscreen mode */}
      {isFullscreen && (
        <NodePreviewWindow
          selectedNodeId={selectedNodeId}
          tree={tree}
          cursorLine={cursorPosition.line}
          nodeLineMap={nodeLineMap}
          isReadOnly={isReadOnly}
        />
      )}
    </aside>
  );
}
