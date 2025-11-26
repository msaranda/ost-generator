import { useState, useCallback, useRef, useEffect } from 'react';
import { TreeState } from '../types';
import { parseText, ValidationError } from '../utils/textParser';

export interface CursorPosition {
  line: number;
  column: number;
}

export interface UseTextEditorReturn {
  textContent: string;
  setTextContent: (content: string) => void;
  validationErrors: ValidationError[];
  isParsing: boolean;
  cursorPosition: CursorPosition;
  setCursorPosition: (pos: CursorPosition) => void;
  handleTextChange: (newText: string) => void;
  nodeLineMap: Record<string, number>;
}

interface UseTextEditorOptions {
  tree?: TreeState;
  onTreeUpdate: (tree: TreeState) => void;
  isReadOnly: boolean;
  debounceMs?: number;
}

/**
 * Custom hook for managing text editor state and parsing logic
 * 
 * Manages text content state, implements debounced parsing (300ms),
 * tracks cursor position, handles validation errors from parser,
 * and coordinates text changes with tree updates.
 */
export function useTextEditor({
  onTreeUpdate,
  isReadOnly,
  debounceMs = 300,
}: UseTextEditorOptions): UseTextEditorReturn {
  const [textContent, setTextContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 0 });
  const [nodeLineMap, setNodeLineMap] = useState<Record<string, number>>({});

  // Refs to manage debouncing and prevent parsing loops
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSerializingRef = useRef(false);
  const lastParsedTextRef = useRef('');

  /**
   * Parse text and update tree state
   */
  const parseAndUpdateTree = useCallback((text: string) => {
    // Skip if text hasn't changed
    if (text === lastParsedTextRef.current) {
      return;
    }

    setIsParsing(true);
    lastParsedTextRef.current = text;

    const result = parseText(text);

    if (result.success && result.tree) {
      // Clear validation errors
      setValidationErrors([]);
      
      // Update node line map
      setNodeLineMap(result.nodeLineMap || {});
      
      // Update tree state
      onTreeUpdate(result.tree);
    } else {
      // Set validation errors without updating tree
      setValidationErrors(result.errors);
    }

    setIsParsing(false);
  }, [onTreeUpdate]);

  /**
   * Handle text changes with debounced parsing
   */
  const handleTextChange = useCallback((newText: string) => {
    // Don't process changes in read-only mode
    if (isReadOnly) {
      return;
    }

    // Don't process if this is a serialization update
    if (isSerializingRef.current) {
      return;
    }

    // Update text content immediately for responsive UI
    setTextContent(newText);

    // Clear existing timeout
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }

    // Set new timeout for debounced parsing
    parseTimeoutRef.current = setTimeout(() => {
      parseAndUpdateTree(newText);
    }, debounceMs);
  }, [isReadOnly, debounceMs, parseAndUpdateTree]);

  /**
   * Update text content directly (used by serializer)
   */
  const setTextContentDirect = useCallback((content: string) => {
    isSerializingRef.current = true;
    setTextContent(content);
    lastParsedTextRef.current = content;
    setValidationErrors([]);
    
    // Reset flag after a short delay to allow React to process the update
    setTimeout(() => {
      isSerializingRef.current = false;
    }, 0);
  }, []);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, []);

  return {
    textContent,
    setTextContent: setTextContentDirect,
    validationErrors,
    isParsing,
    cursorPosition,
    setCursorPosition,
    handleTextChange,
    nodeLineMap,
  };
}
