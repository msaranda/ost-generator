Use **Prefix + Indentation** but add typing shortcuts:

### Full Format (Display):
```
OUTCOME: Reduce churn in teams scaling past 30 employees
OPP: Complexity-Scale Mismatch
  SOL: Adaptive UI
```

### Shorthand (Typing):
```
O: Reduce churn in teams scaling past 30 employees
OP: Complexity-Scale Mismatch
  S: Adaptive UI
```

**Auto-expand on save:**
- User types `O:` → Display shows `OUTCOME:`
- User types `OP:` → Display shows `OPP:`
- User types `S:` → Display shows `SOL:`
- User types `SU:` → Display shows `SUB:`

**Best of both worlds:** Fast typing + Clear reading

---

## Multi-line Content Support

For longer node text:
```
OUTCOME: Reduce churn in teams scaling past 30 employees

OPP: Complexity-Scale Mismatch
  "Affordable tools don't scale, scalable tools are too complex"
  
  SOL: Adaptive UI with Progressive Disclosure
    Auto-hide advanced features until team hits size thresholds.
    At 5-15 people: show simple kanban.
    At 30+: reveal dependencies, portfolio views, advanced filters.
```

**Rules:**
- Text in quotes after node = description/context
- Indented continuation lines = multi-line content
- Blank line = end of node

---

## Real-time Sync Implementation
```
┌─────────────────────────────────────────────────┐
│  [Text Editor]           │  [Visual Tree]       │
│                          │                      │
│  O: Reduce churn...      │      [Sticky]        │
│  OP: Complexity...       │        ├─[Sticky]    │
│    S: Adaptive UI        │        │  └─[Sticky] │
│    S: Scale-Trigger...   │        │  └─[Sticky] │
│                          │                      │
└─────────────────────────────────────────────────┘
         ↕ Real-time bidirectional sync
```

**How it works:**
1. User types in text editor
2. On each keystroke (debounced 300ms):
   - Parse text to tree structure
   - Update visual tree nodes
   - Maintain cursor position
3. User clicks visual tree:
   - Highlight corresponding text line
   - Allow editing inline
   - Update text on blur

---

## Advanced Features

### Collapsed Sections
```
OUTCOME: Reduce churn...

OPP: Complexity-Scale Mismatch [+]  ← Click to expand
  
OPP: Missing Cross-Team Visibility
  SOL: Cross-Team Dependency Map
  SOL: Automatic Executive Briefing
```

### Metadata Tags
```
OPP: Complexity-Scale Mismatch #priority:high #owner:sarah

  SOL: Adaptive UI #effort:medium #impact:high
```

### Comments
```
OUTCOME: Reduce churn in teams scaling past 30 employees

// This is our primary goal from the Series A funding

OPP: Complexity-Scale Mismatch
  SOL: Adaptive UI  // User research validated this approach

### Text Editor Mode

**Format:** Prefix + Indentation
- `O:` or `OUTCOME:` = root node
- `OP:` or `OPP:` = opportunity
- `S:` or `SOL:` = solution
- `SU:` or `SUB:` = sub-opportunity
- 2 spaces per indentation level
- Blank lines ignored

**Real-time Parsing:**
- Debounce: 300ms after last keystroke
- Parse line-by-line to build tree structure
- Update visual tree without losing zoom/pan
- Highlight syntax errors inline (red underline)

**Bidirectional Sync:**
- Text edit → updates visual
- Visual edit → updates text
- Cursor position preserved
- Undo/redo works in both views

**Editor Features:**
- Syntax highlighting (color-code node types)
- Auto-complete (type `OP` + Tab → expands to `OPP: `)
- Auto-indent (Enter after node adds 2 spaces)
- Fold/unfold sections
- Line numbers
- Validation indicators (✓ or ✗ per line)