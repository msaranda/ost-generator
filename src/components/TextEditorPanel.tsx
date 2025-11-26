import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { TreeState } from '../types';
import { ValidationError } from '../utils/textParser';
import TextEditor from './TextEditor';

interface TextEditorPanelProps {
  tree: TreeState;
  isVisible: boolean;
  isReadOnly: boolean;
  onTreeUpdate: (tree: TreeState) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;

export default function TextEditorPanel({
  isVisible,
  isReadOnly,
  onClose,
}: TextEditorPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [validationErrors] = useState<ValidationError[]>([]);
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set());
  
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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

  // Handle text change
  const handleTextChange = useCallback((content: string) => {
    setTextContent(content);
    // Parsing will be handled by parent component or hook
  }, []);

  // Handle cursor position change
  const handleCursorChange = useCallback((_position: { line: number; column: number }) => {
    // Track cursor position for future features
  }, []);

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
      <div className="flex-1 overflow-hidden">
        <TextEditor
          content={textContent}
          onChange={handleTextChange}
          onCursorChange={handleCursorChange}
          selectedLine={null}
          validationErrors={validationErrors}
          isReadOnly={isReadOnly}
          foldedLines={foldedLines}
          onToggleFold={handleToggleFold}
        />
      </div>

      {/* Panel Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          {errorCount > 0 ? (
            <span className="text-red-600 font-medium">
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          ) : (
            <span className="text-green-600 font-medium">No errors</span>
          )}
        </div>
        {isReadOnly && (
          <div className="text-xs text-amber-600 font-medium">Read-only</div>
        )}
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
