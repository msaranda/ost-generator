'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { EditorState, Extension, RangeSetBuilder } from '@codemirror/state';
import { ValidationError } from '../utils/textParser';

/**
 * Syntax highlighting extension for OST node prefixes
 * Highlights node type prefixes with their corresponding colors:
 * - O:, OUTCOME: → yellow (#F9A825)
 * - OP:, OPP: → blue (#1976D2)
 * - S:, SOL: → green (#388E3C)
 * - SU:, SUB: → purple (#7B1FA2)
 */
function syntaxHighlightingExtension(): Extension {
  // Define decoration marks for each node type
  const outcomeMark = Decoration.mark({ class: 'cm-ost-outcome' });
  const opportunityMark = Decoration.mark({ class: 'cm-ost-opportunity' });
  const solutionMark = Decoration.mark({ class: 'cm-ost-solution' });
  const subOpportunityMark = Decoration.mark({ class: 'cm-ost-sub-opportunity' });

  // Regex patterns for each prefix type
  const patterns = [
    { regex: /^(\s*)(OUTCOME:|O:)/g, mark: outcomeMark },
    { regex: /^(\s*)(OPP:|OP:)/g, mark: opportunityMark },
    { regex: /^(\s*)(SOL:|S:)/g, mark: solutionMark },
    { regex: /^(\s*)(SUB:|SU:)/g, mark: subOpportunityMark },
  ];

  const viewPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;

        for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
          const line = doc.line(lineNum);
          const lineText = line.text;

          // Check each pattern
          for (const { regex, mark } of patterns) {
            // Reset regex state
            regex.lastIndex = 0;
            const match = regex.exec(lineText);

            if (match) {
              // match[1] is the whitespace, match[2] is the prefix
              const prefixStart = line.from + match[1].length;
              const prefixEnd = prefixStart + match[2].length;
              builder.add(prefixStart, prefixEnd, mark);
              break; // Only match one prefix per line
            }
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  // Define CSS styles for the highlighting
  const theme = EditorView.theme({
    '.cm-ost-outcome': {
      color: '#F9A825',
      fontWeight: 'bold',
    },
    '.cm-ost-opportunity': {
      color: '#1976D2',
      fontWeight: 'bold',
    },
    '.cm-ost-solution': {
      color: '#388E3C',
      fontWeight: 'bold',
    },
    '.cm-ost-sub-opportunity': {
      color: '#7B1FA2',
      fontWeight: 'bold',
    },
  });

  return [viewPlugin, theme];
}

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
        syntaxHighlightingExtension(),
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
        syntaxHighlightingExtension(),
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
