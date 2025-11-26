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
  onLineClick?: (line: number) => void;
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

// Auto-complete suggestions
const AUTOCOMPLETE_SUGGESTIONS: Record<string, string[]> = {
  'O': ['O:', 'OP:'],
  'S': ['S:', 'SU:'],
};

const ALL_PREFIXES = ['O:', 'OP:', 'S:', 'SU:'];

export default function TextEditor({
  content,
  onChange,
  onCursorChange,
  selectedLine,
  validationErrors,
  isReadOnly,
  foldedLines,
  onToggleFold,
  onLineClick,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [autocompleteState, setAutocompleteState] = useState<{
    visible: boolean;
    suggestions: string[];
    selectedIndex: number;
    position: { top: number; left: number };
    triggerText: string;
  } | null>(null);

  // Calculate line numbers and handle folding
  const lines = content.split('\n');
  
  // Calculate which lines should be visible based on folding
  const getVisibleLines = useCallback(() => {
    const visibleLines: Array<{ lineNumber: number; content: string; foldedCount?: number }> = [];
    let skipUntilIndent = -1;
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const indent = line.match(/^( *)/)?.[1].length || 0;
      
      // If we're skipping folded content
      if (skipUntilIndent >= 0) {
        if (indent > skipUntilIndent) {
          // Still inside folded section, skip this line
          return;
        } else {
          // Exited folded section
          skipUntilIndent = -1;
        }
      }
      
      // Check if this line is folded
      if (foldedLines.has(lineNumber)) {
        // Count how many lines are folded
        let foldedCount = 0;
        const currentIndent = indent;
        
        for (let i = index + 1; i < lines.length; i++) {
          const nextLineIndent = lines[i].match(/^( *)/)?.[1].length || 0;
          if (nextLineIndent > currentIndent) {
            foldedCount++;
          } else {
            break;
          }
        }
        
        visibleLines.push({ lineNumber, content: line, foldedCount });
        skipUntilIndent = currentIndent;
      } else {
        visibleLines.push({ lineNumber, content: line });
      }
    });
    
    return visibleLines;
  }, [lines, foldedLines]);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    onChange(e.target.value);
    
    // Check for auto-complete trigger
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLineText = textBeforeCursor.substring(currentLineStart);
    
    // Check if we're at the start of a line (only whitespace before cursor on current line)
    const trimmedLine = currentLineText.trimStart();
    const isAtLineStart = currentLineText === trimmedLine;
    
    if (isAtLineStart && trimmedLine.length > 0 && trimmedLine.length <= 2) {
      // Check if the text matches a trigger
      const firstChar = trimmedLine[0].toUpperCase();
      if (AUTOCOMPLETE_SUGGESTIONS[firstChar]) {
        const suggestions = AUTOCOMPLETE_SUGGESTIONS[firstChar];
        
        // Calculate position for dropdown
        const rect = textarea.getBoundingClientRect();
        const lineHeight = 22.4; // 14px * 1.6
        const linesBeforeCursor = textBeforeCursor.split('\n').length - 1;
        const scrollTop = textarea.scrollTop;
        
        setAutocompleteState({
          visible: true,
          suggestions,
          selectedIndex: 0,
          position: {
            top: rect.top + (linesBeforeCursor * lineHeight) - scrollTop + lineHeight,
            left: rect.left + 72 + (currentLineText.length * 8.4), // Account for gutter and character width
          },
          triggerText: trimmedLine,
        });
        return;
      }
    }
    
    // Hide autocomplete if conditions not met
    setAutocompleteState(null);
  }, [isReadOnly, onChange]);

  // Handle keyboard events for autocomplete and indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Handle autocomplete if visible
    if (autocompleteState?.visible) {
      const { suggestions, selectedIndex } = autocompleteState;
      
      // Handle Tab or Enter to accept suggestion
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selectedSuggestion = suggestions[selectedIndex];
        
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
        const textAfterCursor = textarea.value.substring(cursorPos);
        const beforeLine = textarea.value.substring(0, currentLineStart);
        const currentLineText = textBeforeCursor.substring(currentLineStart);
        const indent = currentLineText.match(/^( *)/)?.[1] || '';
        
        // Replace the trigger text with the selected suggestion
        const newValue = beforeLine + indent + selectedSuggestion + ' ' + textAfterCursor;
        onChange(newValue);
        
        // Set cursor position after the inserted text
        setTimeout(() => {
          const newCursorPos = currentLineStart + indent.length + selectedSuggestion.length + 1;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
        
        setAutocompleteState(null);
        return;
      }
      
      // Handle Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocompleteState(null);
        return;
      }
      
      // Handle arrow keys to navigate suggestions
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteState(prev => prev ? {
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % suggestions.length,
        } : null);
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteState(prev => prev ? {
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + suggestions.length) % suggestions.length,
        } : null);
        return;
      }
    }
    
    // Handle automatic indentation
    const cursorPos = textarea.selectionStart;
    const cursorEnd = textarea.selectionEnd;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorEnd);
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLineText = textBeforeCursor.substring(currentLineStart);
    
    // Handle Enter - auto-indent new line
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Get current line indentation
      const currentIndent = currentLineText.match(/^( *)/)?.[1] || '';
      
      // Check if current line has a node prefix (indicating it might have children)
      const hasPrefix = ALL_PREFIXES.some(prefix => currentLineText.trim().startsWith(prefix));
      
      // Add 2 spaces if current line has a prefix, otherwise maintain same indentation
      const newIndent = hasPrefix ? currentIndent + '  ' : currentIndent;
      
      const newValue = textBeforeCursor + '\n' + newIndent + textAfterCursor;
      onChange(newValue);
      
      // Set cursor position after the indentation
      setTimeout(() => {
        const newCursorPos = cursorPos + 1 + newIndent.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
      
      return;
    }
    
    // Handle Tab - add 2 spaces
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      const newValue = textBeforeCursor + '  ' + textAfterCursor;
      onChange(newValue);
      
      // Set cursor position after the spaces
      setTimeout(() => {
        const newCursorPos = cursorPos + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
      
      return;
    }
    
    // Handle Shift+Tab - remove 2 spaces
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      
      // Check if there are spaces to remove at the start of the line
      const spacesAtStart = currentLineText.match(/^( {1,2})/)?.[1] || '';
      
      if (spacesAtStart.length > 0) {
        const spacesToRemove = Math.min(2, spacesAtStart.length);
        const beforeLine = textarea.value.substring(0, currentLineStart);
        const afterLine = textarea.value.substring(cursorPos);
        const newLineText = currentLineText.substring(spacesToRemove);
        
        const newValue = beforeLine + newLineText + afterLine;
        onChange(newValue);
        
        // Adjust cursor position
        setTimeout(() => {
          const newCursorPos = Math.max(currentLineStart, cursorPos - spacesToRemove);
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
      
      return;
    }
    
    // Handle Backspace - remove 2 spaces if at indentation boundary
    if (e.key === 'Backspace') {
      // Check if cursor is right after indentation (only spaces before cursor on line)
      const textBeforeCursorOnLine = currentLineText.substring(0, cursorPos - currentLineStart);
      const isAfterIndent = /^ +$/.test(textBeforeCursorOnLine) && textBeforeCursorOnLine.length % 2 === 0;
      
      if (isAfterIndent && textBeforeCursorOnLine.length >= 2) {
        e.preventDefault();
        
        // Remove 2 spaces
        const beforeLine = textarea.value.substring(0, currentLineStart);
        const newLineText = currentLineText.substring(2);
        const afterLine = textarea.value.substring(cursorPos);
        
        const newValue = beforeLine + newLineText + afterLine;
        onChange(newValue);
        
        // Adjust cursor position
        setTimeout(() => {
          const newCursorPos = cursorPos - 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
        
        return;
      }
    }
  }, [autocompleteState, onChange]);

  // Handle paste to maintain indentation
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea || isReadOnly) return;
    
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const cursorPos = textarea.selectionStart;
    const cursorEnd = textarea.selectionEnd;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorEnd);
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLineText = textBeforeCursor.substring(currentLineStart);
    
    // Get current indentation
    const currentIndent = currentLineText.match(/^( *)/)?.[1] || '';
    
    // Process pasted text to maintain indentation
    const pastedLines = pastedText.split('\n');
    const processedLines = pastedLines.map((line, index) => {
      if (index === 0) {
        // First line - paste as is
        return line;
      } else {
        // Subsequent lines - add current indentation
        return currentIndent + line;
      }
    });
    
    const processedText = processedLines.join('\n');
    const newValue = textBeforeCursor + processedText + textAfterCursor;
    onChange(newValue);
    
    // Set cursor position after pasted text
    setTimeout(() => {
      const newCursorPos = cursorPos + processedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
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

  // Handle line click for selection synchronization
  const handleClick = useCallback(() => {
    if (!textareaRef.current || !onLineClick) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    
    onLineClick(line);
  }, [onLineClick]);

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

  // Handle click for line selection
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('click', handleClick);

    return () => {
      textarea.removeEventListener('click', handleClick);
    };
  }, [handleClick]);

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
  const renderHighlightedLine = useCallback((line: string, lineNumber: number, foldedCount?: number) => {
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
          {/* Folded line count indicator */}
          {foldedCount !== undefined && foldedCount > 0 && (
            <span className="ml-2 text-xs text-gray-400 italic">
              ... ({foldedCount} {foldedCount === 1 ? 'line' : 'lines'} folded)
            </span>
          )}
        </div>
      </div>
    );
  }, [selectedLine, foldedLines, hasChildren, onToggleFold, getLineError]);

  const visibleLines = getVisibleLines();

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Syntax highlighted overlay */}
      <div className="absolute inset-0 overflow-auto pointer-events-none z-10">
        <div className="min-h-full">
          {visibleLines.map(({ lineNumber, content, foldedCount }) => 
            renderHighlightedLine(content, lineNumber, foldedCount)
          )}
        </div>
      </div>

      {/* Actual textarea (invisible but functional) */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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

      {/* Autocomplete dropdown */}
      {autocompleteState?.visible && (
        <div
          className="fixed z-40 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${autocompleteState.position.top}px`,
            left: `${autocompleteState.position.left}px`,
            minWidth: '120px',
          }}
        >
          {autocompleteState.suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-3 py-2 text-sm font-mono cursor-pointer ${
                index === autocompleteState.selectedIndex
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                const textarea = textareaRef.current;
                if (!textarea) return;
                
                const cursorPos = textarea.selectionStart;
                const textBeforeCursor = textarea.value.substring(0, cursorPos);
                const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
                const textAfterCursor = textarea.value.substring(cursorPos);
                const beforeLine = textarea.value.substring(0, currentLineStart);
                const currentLineText = textBeforeCursor.substring(currentLineStart);
                const indent = currentLineText.match(/^( *)/)?.[1] || '';
                
                // Replace the trigger text with the selected suggestion
                const newValue = beforeLine + indent + suggestion + ' ' + textAfterCursor;
                onChange(newValue);
                
                // Set cursor position after the inserted text
                setTimeout(() => {
                  const newCursorPos = currentLineStart + indent.length + suggestion.length + 1;
                  textarea.setSelectionRange(newCursorPos, newCursorPos);
                  textarea.focus();
                }, 0);
                
                setAutocompleteState(null);
              }}
              onMouseEnter={() => {
                setAutocompleteState(prev => prev ? { ...prev, selectedIndex: index } : null);
              }}
            >
              <span style={{ color: PREFIX_COLORS[suggestion] || '#212121', fontWeight: 600 }}>
                {suggestion}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
