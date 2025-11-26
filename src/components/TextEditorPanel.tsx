import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { TreeState } from '../types';
import TextEditor from './TextEditor';
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
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;

/**
 * Helper function to find the line number for a given node ID in the text
 */
function getLineForNode(_text: string, _nodeId: string): number | null {
  // This is a simple implementation - in a real scenario, we'd need to
  // maintain a mapping between node IDs and line numbers during parsing
  // For now, we'll return null as this requires parser integration
  return null;
}

export default function TextEditorPanel({
  tree,
  isVisible,
  isReadOnly,
  onTreeUpdate,
  selectedNodeId,
  onClose,
  onRecalculateLayout,
}: TextEditorPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set());
  
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const editorScrollRef = useRef<number>(0);

  // Text editor hook - handles text changes and parsing
  const {
    textContent,
    setTextContent,
    validationErrors,
    isParsing,
    cursorPosition,
    setCursorPosition,
    handleTextChange,
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
  useTreeSerializer({
    tree,
    onTextUpdate: (text) => {
      // Preserve scroll position
      const scrollPos = editorScrollRef.current;
      setTextContent(text);
      // Restore scroll position after update
      setTimeout(() => {
        if (panelRef.current) {
          const editorElement = panelRef.current.querySelector('.text-editor-content');
          if (editorElement) {
            editorElement.scrollTop = scrollPos;
          }
        }
      }, 0);
    },
  });

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

  // Track scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    editorScrollRef.current = e.currentTarget.scrollTop;
  }, []);

  // Calculate selected line from selectedNodeId
  const selectedLine = selectedNodeId ? getLineForNode(textContent, selectedNodeId) : null;

  // Handle fold toggle
  const handleToggleFold = useCallback((line: number) => {
    setFoldedLines(prev => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }
      return next;
    });
  }, []);

  // Scroll to selected line when selection changes
  useEffect(() => {
    if (selectedLine !== null && panelRef.current) {
      const editorElement = panelRef.current.querySelector('.text-editor-content');
      if (editorElement) {
        const lineHeight = 22.4; // 14px font * 1.6 line-height
        const targetScroll = (selectedLine - 1) * lineHeight - editorElement.clientHeight / 2;
        editorElement.scrollTop = Math.max(0, targetScroll);
      }
    }
  }, [selectedLine]);

  if (!isVisible) return null;

  const errorCount = validationErrors.length;

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg"
      style={{ width: `${width}px` }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Text Editor</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title="Close text editor"
        >
          <X size={16} />
        </button>
      </div>

      {/* Text Editor */}
      <div className="flex-1 overflow-hidden" onScroll={handleScroll}>
        <TextEditor
          content={textContent}
          onChange={handleTextChange}
          onCursorChange={handleCursorChange}
          selectedLine={selectedLine}
          validationErrors={validationErrors}
          isReadOnly={isReadOnly}
          foldedLines={foldedLines}
          onToggleFold={handleToggleFold}
        />
      </div>

      {/* Panel Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          {isParsing ? (
            <span className="text-blue-600 font-medium">Parsing...</span>
          ) : errorCount > 0 ? (
            <span className="text-red-600 font-medium">
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          ) : (
            <span className="text-green-600 font-medium">No errors</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isReadOnly && (
            <div className="text-xs text-amber-600 font-medium">Read-only</div>
          )}
          <div className="text-xs text-gray-500">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-transparent'
        }`}
        onMouseDown={handleResizeStart}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
