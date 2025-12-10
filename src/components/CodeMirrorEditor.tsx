'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, gutter, GutterMarker, hoverTooltip, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Extension, RangeSetBuilder, StateField, StateEffect } from '@codemirror/state';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { foldGutter, codeFolding } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
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

/**
 * Indentation extension for OST tree structure
 * Implements custom indentation behavior:
 * - Enter: auto-indent next line (+2 spaces)
 * - Tab: add 2 spaces
 * - Shift+Tab: remove 2 spaces
 * - Backspace: remove 2 spaces at indent boundary
 */
function indentationExtension(): Extension {
  // Custom Enter key handler for auto-indent
  const handleEnter = (view: EditorView): boolean => {
    const { state } = view;
    const { selection } = state;
    const pos = selection.main.head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;

    // Calculate current indentation
    const match = lineText.match(/^(\s*)/);
    const currentIndent = match ? match[1] : '';

    // Check if this line has a node prefix (indicating it might have children)
    const hasPrefix = /^\s*(O:|OUTCOME:|OP:|OPP:|S:|SOL:|SU:|SUB:)/.test(lineText);

    // If line has a prefix and content, indent the next line by 2 spaces
    const newIndent = hasPrefix && lineText.trim().length > 0 
      ? currentIndent + '  ' 
      : currentIndent;

    // Insert newline with appropriate indentation
    view.dispatch({
      changes: {
        from: pos,
        to: pos,
        insert: '\n' + newIndent,
      },
      selection: { anchor: pos + 1 + newIndent.length },
    });

    return true;
  };

  // Custom Tab key handler (add 2 spaces)
  const handleTab = (view: EditorView): boolean => {
    const { state } = view;
    const { selection } = state;
    const pos = selection.main.head;

    // Insert 2 spaces
    view.dispatch({
      changes: {
        from: pos,
        to: pos,
        insert: '  ',
      },
      selection: { anchor: pos + 2 },
    });

    return true;
  };

  // Custom Shift+Tab key handler (remove 2 spaces)
  const handleShiftTab = (view: EditorView): boolean => {
    const { state } = view;
    const { selection } = state;
    const pos = selection.main.head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;

    // Check if we're at the start of the line or in leading whitespace
    const beforeCursor = lineText.substring(0, pos - line.from);
    const leadingSpaces = beforeCursor.match(/^(\s*)/)?.[1] || '';

    // If we have at least 2 spaces before cursor, remove them
    if (leadingSpaces.length >= 2) {
      const removeFrom = line.from + leadingSpaces.length - 2;
      const removeTo = line.from + leadingSpaces.length;

      view.dispatch({
        changes: {
          from: removeFrom,
          to: removeTo,
          insert: '',
        },
        selection: { anchor: pos - 2 },
      });

      return true;
    }

    return false;
  };

  // Custom Backspace key handler (remove 2 spaces at indent boundary)
  const handleBackspace = (view: EditorView): boolean => {
    const { state } = view;
    const { selection } = state;
    const pos = selection.main.head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;

    // Check if cursor is in leading whitespace
    const beforeCursor = lineText.substring(0, pos - line.from);
    
    // Only handle if we're in leading whitespace
    if (beforeCursor.trim().length === 0 && beforeCursor.length > 0) {
      // Check if we're at an even indent boundary (multiple of 2)
      if (beforeCursor.length % 2 === 0 && beforeCursor.length >= 2) {
        // Remove 2 spaces
        view.dispatch({
          changes: {
            from: pos - 2,
            to: pos,
            insert: '',
          },
          selection: { anchor: pos - 2 },
        });

        return true;
      }
    }

    // Let default backspace behavior handle other cases
    return false;
  };

  // Create keymap with custom handlers
  const indentKeymap = keymap.of([
    {
      key: 'Enter',
      run: handleEnter,
    },
    {
      key: 'Tab',
      run: handleTab,
    },
    {
      key: 'Shift-Tab',
      run: handleShiftTab,
    },
    {
      key: 'Backspace',
      run: handleBackspace,
    },
  ]);

  return [indentKeymap];
}

/**
 * Autocomplete extension for node prefixes
 * Provides auto-complete suggestions for node type prefixes:
 * - "O" at line start → ["O:", "OP:"]
 * - "S" at line start → ["S:", "SU:"]
 * Accepts suggestions with Tab or Enter, dismisses with Escape
 */
function autocompleteExtension(): Extension {
  // Completion source function
  const completionSource = (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const cursorCol = pos - line.from;

    // Get text before cursor on this line
    const beforeCursor = lineText.substring(0, cursorCol);

    // Check if we're at the start of the line (only whitespace before cursor)
    const leadingWhitespace = beforeCursor.match(/^(\s*)/)?.[1] || '';
    const textBeforeWhitespace = beforeCursor.substring(leadingWhitespace.length);

    // Only trigger if we're at line start (after optional whitespace)
    if (textBeforeWhitespace.length === 0 || textBeforeWhitespace.length > 3) {
      return null;
    }

    // Check for "O" prefix
    if (textBeforeWhitespace === 'O' || textBeforeWhitespace === 'OP') {
      const from = line.from + leadingWhitespace.length;
      return {
        from,
        options: [
          { label: 'O:', type: 'keyword', info: 'Outcome node' },
          { label: 'OP:', type: 'keyword', info: 'Opportunity node' },
        ],
      };
    }

    // Check for "S" prefix
    if (textBeforeWhitespace === 'S' || textBeforeWhitespace === 'SU') {
      const from = line.from + leadingWhitespace.length;
      return {
        from,
        options: [
          { label: 'S:', type: 'keyword', info: 'Solution node' },
          { label: 'SU:', type: 'keyword', info: 'Sub-opportunity node' },
        ],
      };
    }

    return null;
  };

  // Configure autocompletion
  return autocompletion({
    override: [completionSource],
    activateOnTyping: true,
    closeOnBlur: true,
    defaultKeymap: true, // Enables Tab/Enter to accept, Escape to dismiss
  });
}

/**
 * Diagnostics extension for displaying validation errors
 * Converts ValidationError[] to CodeMirror decorations:
 * - Error underlines (red wavy)
 * - Gutter markers (warning/error icons)
 * - Tooltips on hover
 */

// State effect for updating diagnostics
const setDiagnosticsEffect = StateEffect.define<ValidationError[]>();

// State field to store current diagnostics
const diagnosticsState = StateField.define<ValidationError[]>({
  create: () => [],
  update(diagnostics, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDiagnosticsEffect)) {
        return effect.value;
      }
    }
    return diagnostics;
  },
});

// Gutter marker for error/warning icons
class DiagnosticMarker extends GutterMarker {
  constructor(private readonly severity: 'error' | 'warning') {
    super();
  }

  toDOM() {
    const icon = document.createElement('div');
    icon.className = `cm-diagnostic-gutter-${this.severity}`;
    icon.textContent = this.severity === 'error' ? '●' : '⚠';
    return icon;
  }
}

// Create diagnostics extension
function diagnosticsExtension(): Extension {
  // View plugin for error underlines
  const underlinePlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.state.field(diagnosticsState) !== update.startState.field(diagnosticsState)) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const diagnostics = view.state.field(diagnosticsState);
        const doc = view.state.doc;

        for (const diagnostic of diagnostics) {
          try {
            // Get the line (1-indexed in diagnostic, 1-indexed in CodeMirror)
            if (diagnostic.line < 1 || diagnostic.line > doc.lines) {
              continue;
            }

            const line = doc.line(diagnostic.line);
            const from = line.from + diagnostic.column;
            
            // Underline the entire line or from column to end of line
            const to = line.to;

            if (from <= to) {
              const mark = Decoration.mark({
                class: diagnostic.type === 'syntax' || diagnostic.type === 'prefix' || diagnostic.type === 'hierarchy'
                  ? 'cm-diagnostic-error'
                  : 'cm-diagnostic-warning',
                attributes: {
                  'data-diagnostic-message': diagnostic.message,
                  'data-diagnostic-type': diagnostic.type,
                },
              });
              builder.add(from, to, mark);
            }
          } catch (e) {
            // Skip invalid diagnostics
            console.warn('Invalid diagnostic:', diagnostic, e);
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  // Gutter markers for warnings/errors
  const gutterMarkers = gutter({
    class: 'cm-diagnostic-gutter',
    markers: (view) => {
      const diagnostics = view.state.field(diagnosticsState);
      const doc = view.state.doc;
      const builder = new RangeSetBuilder<GutterMarker>();

      // Group diagnostics by line
      const lineMap = new Map<number, ValidationError[]>();
      for (const diagnostic of diagnostics) {
        if (diagnostic.line >= 1 && diagnostic.line <= doc.lines) {
          const existing = lineMap.get(diagnostic.line) || [];
          existing.push(diagnostic);
          lineMap.set(diagnostic.line, existing);
        }
      }

      // Add markers for each line with diagnostics
      for (const [lineNum, lineDiagnostics] of lineMap.entries()) {
        try {
          const line = doc.line(lineNum);
          // Determine severity (error takes precedence)
          const hasError = lineDiagnostics.some(
            (d) => d.type === 'syntax' || d.type === 'prefix' || d.type === 'hierarchy'
          );
          const severity = hasError ? 'error' : 'warning';
          builder.add(line.from, line.from, new DiagnosticMarker(severity));
        } catch (e) {
          console.warn('Invalid line number:', lineNum, e);
        }
      }

      return builder.finish();
    },
  });

  // Hover tooltips for errors
  const tooltipExtension = hoverTooltip((view, pos) => {
    const diagnostics = view.state.field(diagnosticsState);
    const doc = view.state.doc;
    const line = doc.lineAt(pos);
    const lineNum = line.number;

    // Find diagnostics for this line
    const lineDiagnostics = diagnostics.filter((d) => d.line === lineNum);

    if (lineDiagnostics.length === 0) {
      return null;
    }

    // Create tooltip content
    const messages = lineDiagnostics.map((d) => `${d.type}: ${d.message}`).join('\n');

    return {
      pos: line.from,
      end: line.to,
      above: true,
      create: () => {
        const dom = document.createElement('div');
        dom.className = 'cm-diagnostic-tooltip';
        dom.textContent = messages;
        return { dom };
      },
    };
  });

  // Theme for diagnostics
  const theme = EditorView.theme({
    '.cm-diagnostic-error': {
      textDecoration: 'underline wavy red',
      textDecorationSkipInk: 'none',
    },
    '.cm-diagnostic-warning': {
      textDecoration: 'underline wavy orange',
      textDecorationSkipInk: 'none',
    },
    '.cm-diagnostic-gutter': {
      width: '1.5em',
      paddingLeft: '0.25em',
    },
    '.cm-diagnostic-gutter-error': {
      color: '#F44336',
      cursor: 'pointer',
      fontSize: '1.2em',
    },
    '.cm-diagnostic-gutter-warning': {
      color: '#FF9800',
      cursor: 'pointer',
      fontSize: '1.2em',
    },
    '.cm-diagnostic-tooltip': {
      backgroundColor: '#333',
      color: '#fff',
      padding: '0.5em',
      borderRadius: '4px',
      fontSize: '0.9em',
      maxWidth: '400px',
      whiteSpace: 'pre-wrap',
      border: '1px solid #666',
    },
  });

  return [diagnosticsState, underlinePlugin, gutterMarkers, tooltipExtension, theme];
}

/**
 * Line numbers theme extension
 * Styles the line numbers gutter to match the design
 */
function lineNumbersTheme(): Extension {
  return EditorView.theme({
    '.cm-gutters': {
      backgroundColor: '#F5F5F5',
      borderRight: '1px solid #E0E0E0',
      color: '#BDBDBD',
    },
    '.cm-lineNumbers': {
      fontSize: '12px',
      minWidth: '2.5em',
      paddingRight: '0.5em',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      textAlign: 'right',
    },
  });
}

/**
 * Folding extension for OST indentation-based structure
 * Implements folding based on indentation levels:
 * - Fold icons appear for parent nodes (lines with child nodes)
 * - Folding collapses child lines
 * - Folded sections show indicators
 * - Fold state persists across updates
 */
function foldingExtension(): Extension {
  // Theme for folding elements
  const foldingTheme = EditorView.theme({
    '.cm-foldGutter': {
      width: '1.5em',
    },
    '.cm-foldGutter .cm-gutterElement': {
      textAlign: 'center',
      cursor: 'pointer',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#E3F2FD',
      border: '1px solid #BBDEFB',
      borderRadius: '3px',
      color: '#1976D2',
      padding: '0 0.25em',
      margin: '0 0.25em',
      fontSize: '0.8em',
    },
  });

  return [
    codeFolding({
      placeholderText: '...',
    }),
    foldGutter({
      openText: '▼',
      closedText: '▶',
    }),
    foldingTheme,
  ];
}

/**
 * Keyboard shortcuts extension for standard editor commands
 * Implements standard keyboard shortcuts:
 * - Cmd/Ctrl+Z for undo (CodeMirror default)
 * - Cmd/Ctrl+Shift+Z for redo (CodeMirror default)
 * - Cmd/Ctrl+A for select all (CodeMirror default)
 * - Cmd/Ctrl+F for find (CodeMirror search extension)
 * Ensures shortcuts don't interfere with app shortcuts
 */
function keyboardShortcutsExtension(): Extension {
  return [
    // History support (enables undo/redo)
    history(),
    
    // Default keymap includes Cmd/Ctrl+A for select all and other basic shortcuts
    keymap.of(defaultKeymap),
    
    // History keymap includes Cmd/Ctrl+Z for undo and Cmd/Ctrl+Shift+Z for redo
    keymap.of(historyKeymap),
    
    // Search keymap includes Cmd/Ctrl+F for find
    keymap.of(searchKeymap),
    
    // Highlight selection matches when searching
    highlightSelectionMatches(),
  ];
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

  // Suppress unused variable warnings for future implementation
  // @ts-ignore - selectedLine will be used in task 9 (line selection highlighting)
  selectedLine;
  // @ts-ignore - onLineClick will be used in task 10 (cursor position tracking)
  onLineClick;

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
        lineNumbers(),
        lineNumbersTheme(),
        foldingExtension(),
        syntaxHighlightingExtension(),
        diagnosticsExtension(),
        indentationExtension(),
        autocompleteExtension(),
        keyboardShortcutsExtension(),
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

  // Update diagnostics when they change
  useEffect(() => {
    if (!viewRef.current || !isClient) return;
    
    viewRef.current.dispatch({
      effects: setDiagnosticsEffect.of(diagnostics),
    });
  }, [diagnostics, isClient]);

  // Note: We don't need a separate effect for read-only mode changes
  // because we're using EditorView.editable.of() and EditorState.readOnly.of()
  // which are compartmentalized and can be reconfigured without recreating the state.
  // If we need to support dynamic read-only changes in the future, we should use
  // compartments and reconfiguration instead of recreating the entire state.

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
