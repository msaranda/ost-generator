'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { ValidationError } from '../utils/textParser';

interface CodeMirrorEditorProps {
  // Input: text document
  value: string;
  
  // Input: validation errors from parser
  diagnostics: ValidationError[];
  
  // Input: selected line for highlighting
  selectedLine: number | null;
  
  // Input: configuration
  readOnly?: boolean;
  
  // Output: text changes
  onChange: (value: string) => void;
  
  // Output: cursor position changes
  onCursorChange?: (position: { line: number; column: number }) => void;
  
  // Output: line clicks for selection sync
  onLineClick?: (line: number) => void;
}

export default function CodeMirrorEditor({
  value,
  diagnostics,
  selectedLine,
  readOnly = false,
  onChange,
  onCursorChange,
  onLineClick,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize editor only on client
  useEffect(() => {
    if (!isClient || !editorRef.current) return;
    
    // Create initial editor state
    const startState = EditorState.create({
      doc: value,
      extensions: [
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
          
          // Track cursor position changes
          if (update.selectionSet && onCursorChange) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const column = pos - line.from;
            onCursorChange({ line: line.number, column });
          }
        }),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
      ],
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup function
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [isClient]); // Only run on mount

  // Update editor when value changes externally
  useEffect(() => {
    if (!viewRef.current || !isClient) return;
    
    const currentValue = viewRef.current.state.doc.toString();
    if (currentValue !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value, isClient]);

  // Update read-only mode
  useEffect(() => {
    if (!viewRef.current || !isClient) return;
    
    // Recreate the editor with new read-only state
    const currentValue = viewRef.current.state.doc.toString();
    const currentSelection = viewRef.current.state.selection;
    
    const newState = EditorState.create({
      doc: currentValue,
      selection: currentSelection,
      extensions: [
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
          
          if (update.selectionSet && onCursorChange) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const column = pos - line.from;
            onCursorChange({ line: line.number, column });
          }
        }),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
      ],
    });
    
    viewRef.current.setState(newState);
  }, [readOnly, isClient, onChange, onCursorChange]);

  // Server-side: render placeholder
  if (!isClient) {
    return (
      <div 
        ref={editorRef} 
        className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-500 text-sm"
      >
        Loading editor...
      </div>
    );
  }

  // Client-side: render editor container
  return <div ref={editorRef} className="w-full h-full" />;
}
