'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
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
 * Scrollbar theme extension
 * Ensures vertical scrollbar is visible
 */
function scrollbarTheme(): Extension {
  return EditorView.theme({
    '.cm-scroller': {
      overflowY: 'auto',
    },
    '.cm-scroller::-webkit-scrollbar': {
      width: '12px',
    },
    '.cm-scroller::-webkit-scrollbar-track': {
      backgroundColor: '#f1f1f1',
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
      backgroundColor: '#c1c1c1',
      borderRadius: '6px',
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#a8a8a8',
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
 * Line selection highlighting extension
 * Implements line highlighting based on selectedLine prop:
 * - Highlights the selected line with a distinct background color
 * - Scrolls to make the selected line visible
 * - Updates highlighting when selectedLine prop changes
 * - Clears highlighting when selectedLine is null
 */

// State effect for updating selected line
const setSelectedLineEffect = StateEffect.define<number | null>();

// State field to store current selected line
const selectedLineState = StateField.define<number | null>({
  create: () => null,
  update(selectedLine, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSelectedLineEffect)) {
        return effect.value;
      }
    }
    return selectedLine;
  },
});

function lineSelectionExtension(): Extension {
  // View plugin for line highlighting
  const highlightPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.state.field(selectedLineState) !== update.startState.field(selectedLineState)) {
          this.decorations = this.buildDecorations(update.view);
          
          // Scroll to selected line when it changes (defer to avoid update conflicts)
          const selectedLine = update.state.field(selectedLineState);
          if (selectedLine !== null) {
            // Use setTimeout to defer scrolling until after the current update cycle
            setTimeout(() => this.scrollToLine(update.view, selectedLine), 0);
          }
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const selectedLine = view.state.field(selectedLineState);
        const doc = view.state.doc;

        if (selectedLine !== null && selectedLine >= 1 && selectedLine <= doc.lines) {
          try {
            const line = doc.line(selectedLine);
            const lineMark = Decoration.line({
              class: 'cm-selected-line',
            });
            builder.add(line.from, line.from, lineMark);
          } catch (e) {
            console.warn('Invalid selected line:', selectedLine, e);
          }
        }

        return builder.finish();
      }

      scrollToLine(view: EditorView, lineNumber: number) {
        try {
          const doc = view.state.doc;
          if (lineNumber >= 1 && lineNumber <= doc.lines) {
            const line = doc.line(lineNumber);
            view.dispatch({
              effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
            });
          }
        } catch (e) {
          console.warn('Failed to scroll to line:', lineNumber, e);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  // Theme for selected line
  const theme = EditorView.theme({
    '.cm-selected-line': {
      backgroundColor: '#E3F2FD !important',
    },
  });

  return [selectedLineState, highlightPlugin, theme];
}

/**
 * Keyboard shortcuts extension for standard editor commands
 * Implements standard keyboard shortcuts:
 * - Cmd/Ctrl+Z for undo (CodeMirror default)
 * - Cmd/Ctrl+Shift+Z for redo (CodeMirror default)
 * - Cmd/Ctrl+A for select all (CodeMirror default)
 * - Cmd/Ctrl+F for find (CodeMirror search extension)
 * - Alt/Option+Arrow for word navigation (macOS-style)
 * - Shift+Alt/Option+Arrow for word selection
 * Ensures shortcuts don't interfere with app shortcuts
 */
function keyboardShortcutsExtension(): Extension {
  // Word navigation commands - move by word boundaries
  const moveWordLeft = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    const pos = selection.main.head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const offset = pos - line.from;
    
    // Find word boundary to the left
    if (offset === 0) return false;
    
    const beforeCursor = lineText.substring(0, offset);
    // Find the start of the current word or previous word
    // Match: word characters followed by optional whitespace at the end
    const wordMatch = beforeCursor.match(/\S+\s*$/);
    let newOffset = 0;
    
    if (wordMatch) {
      // Move to start of current/previous word
      newOffset = beforeCursor.length - wordMatch[0].length;
    } else {
      // No word found, move to start of line
      newOffset = 0;
    }
    
    if (newOffset < offset) {
      view.dispatch({
        selection: { anchor: line.from + newOffset },
        scrollIntoView: true,
      });
      return true;
    }
    return false;
  };

  const moveWordRight = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    const pos = selection.main.head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const offset = pos - line.from;
    
    // Find word boundary to the right
    let newOffset = offset;
    if (newOffset < lineText.length) {
      const afterCursor = lineText.substring(offset);
      const wordMatch = afterCursor.match(/^\S+\s*/);
      if (wordMatch) {
        newOffset = offset + wordMatch[0].length;
      } else {
        // Skip whitespace to next word
        const spaceMatch = afterCursor.match(/^\s+/);
        if (spaceMatch) {
          const afterSpace = lineText.substring(offset + spaceMatch[0].length);
          const nextWordMatch = afterSpace.match(/^\S+\s*/);
          if (nextWordMatch) {
            newOffset = offset + spaceMatch[0].length + nextWordMatch[0].length;
          } else {
            newOffset = line.length;
          }
        } else {
          newOffset = line.length;
        }
      }
    }
    
    if (newOffset > offset) {
      view.dispatch({
        selection: { anchor: line.from + newOffset },
        scrollIntoView: true,
      });
      return true;
    }
    return false;
  };

  const selectWordLeft = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    const anchor = selection.main.anchor;
    const head = selection.main.head;
    const pos = head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const offset = pos - line.from;
    
    // Find word boundary to the left
    let newOffset = offset;
    if (newOffset > 0) {
      const beforeCursor = lineText.substring(0, offset);
      const wordMatch = beforeCursor.match(/\S+\s*$/);
      if (wordMatch) {
        newOffset = beforeCursor.length - wordMatch[0].length;
      } else {
        newOffset = 0;
      }
    }
    
    if (newOffset < offset) {
      view.dispatch({
        selection: { anchor, head: line.from + newOffset },
        scrollIntoView: true,
      });
      return true;
    }
    return false;
  };

  const selectWordRight = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    const anchor = selection.main.anchor;
    const head = selection.main.head;
    const pos = head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const offset = pos - line.from;
    
    // Find word boundary to the right
    let newOffset = offset;
    if (newOffset < lineText.length) {
      const afterCursor = lineText.substring(offset);
      const wordMatch = afterCursor.match(/^\S+\s*/);
      if (wordMatch) {
        newOffset = offset + wordMatch[0].length;
      } else {
        const spaceMatch = afterCursor.match(/^\s+/);
        if (spaceMatch) {
          const afterSpace = lineText.substring(offset + spaceMatch[0].length);
          const nextWordMatch = afterSpace.match(/^\S+\s*/);
          if (nextWordMatch) {
            newOffset = offset + spaceMatch[0].length + nextWordMatch[0].length;
          } else {
            newOffset = line.length;
          }
        } else {
          newOffset = line.length;
        }
      }
    }
    
    if (newOffset > offset) {
      view.dispatch({
        selection: { anchor, head: line.from + newOffset },
        scrollIntoView: true,
      });
      return true;
    }
    return false;
  };

  return [
    // History support (enables undo/redo)
    history(),
    
    // Default keymap includes Cmd/Ctrl+A for select all and other basic shortcuts
    keymap.of(defaultKeymap),
    
    // History keymap includes Cmd/Ctrl+Z for undo and Cmd/Ctrl+Shift+Z for redo
    keymap.of(historyKeymap),
    
    // Search keymap includes Cmd/Ctrl+F for find
    keymap.of(searchKeymap),
    
    // Word navigation keymaps (macOS-style: Alt/Option+Arrow)
    keymap.of([
      { key: 'Alt-ArrowLeft', run: moveWordLeft },
      { key: 'Alt-ArrowRight', run: moveWordRight },
      { key: 'Shift-Alt-ArrowLeft', run: selectWordLeft },
      { key: 'Shift-Alt-ArrowRight', run: selectWordRight },
    ]),
    
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

// Text change operation for transactions
interface TextChange {
  from: number;
  to: number;
  insert: string;
}

// Imperative handle interface for external text updates
export interface CodeMirrorEditorHandle {
  // Apply external text changes via transactions
  applyTransaction: (changes: TextChange[], preserveCursor?: boolean) => void;
  
  // Get current cursor position
  getCursorPosition: () => { line: number; column: number } | null;
  
  // Set cursor position
  setCursorPosition: (line: number, column: number) => void;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(function CodeMirrorEditor({
  value,
  diagnostics,
  selectedLine,
  readOnly = false,
  onChange,
  onCursorChange,
  onLineClick,
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Expose imperative handle for external text updates
  useImperativeHandle(ref, () => ({
    applyTransaction: (changes: TextChange[], preserveCursor = true) => {
      if (!viewRef.current) return;
      
      const view = viewRef.current;
      const currentPos = view.state.selection.main.head;
      
      // Calculate new cursor position if preserving cursor
      let newSelection = undefined;
      if (preserveCursor) {
        let newPos = currentPos;
        for (const change of changes) {
          if (change.from <= currentPos) {
            const lengthDiff = change.insert.length - (change.to - change.from);
            if (change.to <= currentPos) {
              // Change is before cursor, adjust position
              newPos += lengthDiff;
            } else {
              // Change overlaps cursor, place cursor at end of insertion
              newPos = change.from + change.insert.length;
            }
          }
        }
        
        // Ensure position is within document bounds after changes
        const newDocLength = view.state.doc.length + changes.reduce((acc, change) => 
          acc + change.insert.length - (change.to - change.from), 0);
        newPos = Math.max(0, Math.min(newPos, newDocLength));
        
        newSelection = { anchor: newPos };
      }
      
      // Apply changes and cursor position in a single transaction
      view.dispatch({
        changes: changes,
        selection: newSelection,
        userEvent: 'external.update', // Mark as external update for undo grouping
      });
    },
    
    getCursorPosition: () => {
      if (!viewRef.current) return null;
      
      const pos = viewRef.current.state.selection.main.head;
      const line = viewRef.current.state.doc.lineAt(pos);
      const column = pos - line.from;
      
      return { line: line.number, column };
    },
    
    setCursorPosition: (line: number, column: number) => {
      if (!viewRef.current) return;
      
      const view = viewRef.current;
      const doc = view.state.doc;
      
      try {
        // Validate line number
        if (line < 1 || line > doc.lines) return;
        
        const docLine = doc.line(line);
        
        // Validate column (clamp to line length)
        const clampedColumn = Math.max(0, Math.min(column, docLine.length));
        const pos = docLine.from + clampedColumn;
        
        view.dispatch({
          selection: { anchor: pos },
          scrollIntoView: true,
        });
      } catch (e) {
        console.warn('Failed to set cursor position:', { line, column }, e);
      }
    },
  }), []);



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
        EditorView.lineWrapping, // Enable word wrap at window edge
        lineNumbers(),
        lineNumbersTheme(),
        scrollbarTheme(), // Ensure visible scrollbar
        foldingExtension(),
        syntaxHighlightingExtension(),
        diagnosticsExtension(),
        indentationExtension(),
        autocompleteExtension(),
        lineSelectionExtension(),
        keyboardShortcutsExtension(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
          
          // Track cursor position changes - emit on any selection change
          if (update.selectionSet && onCursorChange) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const column = pos - line.from;
            onCursorChange({ line: line.number, column });
          }
        }),
        // Handle line clicks for selection sync
        EditorView.domEventHandlers({
          click: (event, view) => {
            if (onLineClick) {
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
              if (pos !== null) {
                const line = view.state.doc.lineAt(pos);
                onLineClick(line.number);
              }
            }
            return false; // Don't prevent default click behavior
          },
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

  // Update selected line when it changes
  useEffect(() => {
    if (!viewRef.current || !isClient) return;
    
    viewRef.current.dispatch({
      effects: setSelectedLineEffect.of(selectedLine),
    });
  }, [selectedLine, isClient]);

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
});

export default CodeMirrorEditor;
