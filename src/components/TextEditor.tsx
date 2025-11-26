import { useRef, useCallback, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { ValidationError } from '../utils/textParser';

interface CursorPosition {
  line: number;
  column: number;
}

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange: (position: CursorPosition) => void;
  selectedLine: number | null;
  validationErrors: ValidationError[];
  isReadOnly: boolean;
  foldedLines: Set<number>;
  onToggleFold: (line: number) => void;
}

// Prefix colors for syntax highlighting
const PREFIX_COLORS: Record<string, string> = {
  'O:': '#F9A825',
  'OUTCOME:': '#F9A825',
  'OP:': '#1976D2',
  'OPP:': '#1976D2',
  'S:': '#388E3C',
  'SOL:': '#388E3C',
  'SU:': '#7B1FA2',
  'SUB:': '#7B1FA2',
};

// Error type icons and colors
const ERROR_STYLES: Record<ValidationError['type'], { icon: typeof AlertCircle; color: string; bgColor: string }> = {
  'syntax': { icon: AlertCircle, color: '#DC2626', bgColor: '#FEE2E2' },
  'prefix': { icon: AlertCircle, color: '#DC2626', bgColor: '#FEE2E2' },
  'hierarchy': { icon: AlertCircle, color: '#DC2626', bgColor: '#FEE2E2' },
  'indentation': { icon: AlertTriangle, color: '#F59E0B', bgColor: '#FEF3C7' },
};

export default function TextEditor({
  content,
  onChange,
  onCursorChange,
  selectedLine,
  validationErrors,
  isReadOnly,
  foldedLines,
  onToggleFold,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate line numbers and handle folding
  const lines = content.split('\n');

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    onChange(e.target.value);
  }, [isReadOnly, onChange]);

  // Handle cursor position updates
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length;
    
    onCursorChange({ line, column });
  }, [onCursorChange]);

  // Update cursor position on selection change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('selectionchange', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('selectionchange', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Check if a line has children (for fold indicators)
  const hasChildren = useCallback((lineIndex: number): boolean => {
    if (lineIndex >= lines.length - 1) return false;
    
    const currentLine = lines[lineIndex];
    const nextLine = lines[lineIndex + 1];
    
    const currentIndent = currentLine.match(/^( *)/)?.[1].length || 0;
    const nextIndent = nextLine.match(/^( *)/)?.[1].length || 0;
    
    return nextIndent > currentIndent;
  }, [lines]);

  // Get error for a specific line
  const getLineError = useCallback((lineNumber: number): ValidationError | undefined => {
    return validationErrors.find(error => error.line === lineNumber);
  }, [validationErrors]);

  // State for tooltip
  const [hoveredError, setHoveredError] = useState<{ error: ValidationError; lineNumber: number } | null>(null);

  // Render syntax-highlighted line
  const renderHighlightedLine = useCallback((line: string, lineNumber: number) => {
    const trimmed = line.trim();
    let prefix = '';
    let content = trimmed;
    let prefixColor = '#212121';
    let hasInvalidPrefix = false;

    // Find matching prefix
    for (const [p, color] of Object.entries(PREFIX_COLORS)) {
      if (trimmed.startsWith(p)) {
        prefix = p;
        content = trimmed.substring(p.length).trim();
        prefixColor = color;
        break;
      }
    }

    // Check if line has content but no valid prefix
    if (trimmed && !prefix) {
      hasInvalidPrefix = true;
    }

    const indent = line.match(/^( *)/)?.[1] || '';
    const error = getLineError(lineNumber);
    const isSelected = selectedLine === lineNumber;
    const errorStyle = error ? ERROR_STYLES[error.type] : null;
    const ErrorIcon = errorStyle?.icon;

    return (
      <div
        key={lineNumber}
        className={`flex items-start font-mono text-sm leading-relaxed ${
          isSelected ? 'bg-blue-50' : error ? 'bg-red-50/30' : ''
        }`}
        style={{ minHeight: '1.6em' }}
      >
        {/* Line number gutter */}
        <div className="flex items-center justify-end w-16 px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 select-none flex-shrink-0">
          {/* Error indicator */}
          {error && ErrorIcon && (
            <div
              className="relative mr-1 cursor-help"
              onMouseEnter={() => setHoveredError({ error, lineNumber })}
              onMouseLeave={() => setHoveredError(null)}
            >
              <ErrorIcon size={14} style={{ color: errorStyle.color }} />
            </div>
          )}
          {/* Fold indicator */}
          {!error && hasChildren(lineNumber - 1) && (
            <button
              onClick={() => onToggleFold(lineNumber)}
              className="mr-1 text-gray-400 hover:text-gray-600"
            >
              {foldedLines.has(lineNumber) ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
            </button>
          )}
          <span>{lineNumber}</span>
        </div>

        {/* Line content */}
        <div className="flex-1 px-3 py-0.5 relative">
          <span style={{ whiteSpace: 'pre' }}>{indent}</span>
          {prefix && (
            <span 
              style={{ 
                color: prefixColor, 
                fontWeight: 600,
                textDecoration: error?.type === 'prefix' ? 'underline wavy' : 'none',
                textDecorationColor: '#DC2626',
              }}
            >
              {prefix}
            </span>
          )}
          {hasInvalidPrefix && trimmed && (
            <span 
              className="text-gray-800"
              style={{ 
                textDecoration: 'underline wavy',
                textDecorationColor: '#DC2626',
              }}
            >
              {trimmed}
            </span>
          )}
          {!hasInvalidPrefix && content && (
            <span className="text-gray-800"> {content}</span>
          )}
        </div>
      </div>
    );
  }, [selectedLine, foldedLines, hasChildren, onToggleFold, getLineError]);

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Syntax highlighted overlay */}
      <div className="absolute inset-0 overflow-auto pointer-events-none z-10">
        <div className="min-h-full">
          {lines.map((line, index) => renderHighlightedLine(line, index + 1))}
        </div>
      </div>

      {/* Actual textarea (invisible but functional) */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        readOnly={isReadOnly}
        className="absolute inset-0 w-full h-full font-mono text-sm leading-relaxed resize-none outline-none bg-transparent text-transparent caret-gray-800 z-20 px-3 py-0.5"
        style={{
          paddingLeft: '4.5rem', // Account for line number gutter (increased for error icons)
          lineHeight: '1.6',
          caretColor: '#1F2937',
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
      />

      {/* Error tooltip */}
      {hoveredError && (
        <div
          className="absolute z-30 px-3 py-2 text-xs text-white rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            backgroundColor: ERROR_STYLES[hoveredError.error.type].color,
            top: `${(hoveredError.lineNumber - 1) * 1.6 + 2}em`,
            left: '5rem',
          }}
        >
          <div className="font-semibold mb-1 capitalize">{hoveredError.error.type} Error</div>
          <div>{hoveredError.error.message}</div>
        </div>
      )}
    </div>
  );
}
