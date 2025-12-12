import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { TreeState } from '../types';
import CodeMirrorEditor from './CodeMirrorEditor';
import { useTextEditor } from '../hooks/useTextEditor';
import { useTreeSerializer } from '../hooks/useTreeSerializer';

interface TextEditorPanelProps {
  tree: TreeState;
  isVisible: boolean;
  isReadOnly: boolean;
  onTreeUpdate: (tree: TreeState) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
  onRecalculateLayout: () => void;
  canvasRef?: React.RefObject<{ panToNode: (nodeId: string) => void }>;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 600;
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
  useEffect(() => {
    if (Object.keys(parsedNodeLineMap).length > 0) {
      setNodeLineMap(parsedNodeLineMap);
    } else if (Object.keys(serializedNodeLineMap).length > 0) {
      setNodeLineMap(serializedNodeLineMap);
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

  // Handle line click - select corresponding node
  const handleLineClick = useCallback((line: number) => {
    // Find node ID for this line
    const nodeId = Object.keys(nodeLineMap).find(id => nodeLineMap[id] === line);
    if (nodeId) {
      onSelectNode(nodeId);
      // Pan visual canvas to center the selected node
      if (canvasRef?.current) {
        canvasRef.current.panToNode(nodeId);
      }
    }
  }, [nodeLineMap, onSelectNode, canvasRef]);

  if (!isVisible) return null;

  const errorCount = validationErrors.length;

  return (
    <aside
      ref={panelRef}
      className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg"
      style={{ width: `${width}px` }}
      role="complementary"
      aria-label="Text editor panel"
    >
      {/* Panel Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800" id="text-editor-title">Text Editor</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label="Close text editor panel"
          title="Close text editor"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {/* Text Editor */}
      <main 
        className="flex-1 overflow-hidden" 
        role="main"
        aria-labelledby="text-editor-title"
      >
        <CodeMirrorEditor
          value={textContent}
          onChange={handleTextChange}
          onCursorChange={handleCursorChange}
          selectedLine={selectedLine}
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

      {/* Resize Handle */}
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
    </aside>
  );
}
