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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:54',message:'parseAndUpdateTree called',data:{textLength:text.length,lastParsedLength:lastParsedTextRef.current.length,isEqual:text===lastParsedTextRef.current,isSerializing:isSerializingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // CRITICAL: Don't skip if serializer is active - this text might be user input that needs parsing
    // even if serializer has updated lastParsedTextRef in the meantime
    // Skip only if text truly matches AND we're not in the middle of a serialization
    if (text === lastParsedTextRef.current && !isSerializingRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:60',message:'parseAndUpdateTree skipped (text unchanged and not serializing)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:70',message:'parseAndUpdateTree calling onTreeUpdate',data:{nodeCount:Object.keys(result.tree.nodes).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:85',message:'handleTextChange called',data:{newTextLength:newText.length,isReadOnly,isSerializing:isSerializingRef.current,lastParsedLength:lastParsedTextRef.current.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Don't process changes in read-only mode
    if (isReadOnly) {
      return;
    }

    // Don't process if this is a serialization update
    if (isSerializingRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:93',message:'handleTextChange blocked by isSerializing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    // Update text content immediately for responsive UI
    setTextContent(newText);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:120',message:'setTextContent called',data:{newTextLength:newText.length,newTextStart:newText.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Clear existing timeout
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }

    // Set new timeout for debounced parsing
    // CRITICAL: Capture newText in closure to ensure we parse the user's actual input
    // even if serializer overwrites textContent before timeout fires
    parseTimeoutRef.current = setTimeout(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:123',message:'parseTimeout firing',data:{newTextLength:newText.length,lastParsedLength:lastParsedTextRef.current.length,willParse:newText!==lastParsedTextRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      parseAndUpdateTree(newText);
    }, debounceMs);
  }, [isReadOnly, debounceMs, parseAndUpdateTree]);

  /**
   * Update text content directly (used by serializer)
   */
  const setTextContentDirect = useCallback((content: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:113',message:'setTextContentDirect called (serializer)',data:{contentLength:content.length,currentTextLength:lastParsedTextRef.current.length,contentMatchesLastParsed:content===lastParsedTextRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    isSerializingRef.current = true;
    setTextContent(content);
    // CRITICAL: Only update lastParsedTextRef if this serializer update represents
    // content that was already successfully parsed. This prevents the serializer
    // from blocking parsing of user edits that happen after the serializer runs.
    // We update lastParsedTextRef here to mark that this content is "in sync" with the tree,
    // but if the user edits it afterward, parsing will still happen because handleTextChange
    // will be called with different content.
    lastParsedTextRef.current = content;
    setValidationErrors([]);
    
    // Reset flag after a short delay to allow React to process the update
    setTimeout(() => {
      isSerializingRef.current = false;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6effda24-82ac-4bf0-b7cc-4645b8b009a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTextEditor.ts:121',message:'isSerializing flag reset to false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
