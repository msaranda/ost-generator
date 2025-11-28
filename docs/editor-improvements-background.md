## Context: Why the Code Editor Side Panel Needs to Be Improved

### 1. Product Background

The application uses a **text-based DSL** in a side panel code editor to define a structured hierarchy of:

* Outcomes (`O:` / `OUTCOME:`)
* Opportunities (`OP:` / `OPP:`)
* Solutions (`S:` / `SOL:`)
* Sub-opportunities (`SU:` / `SUB:`)

The editor content is parsed into a **tree structure** that other parts of the UI use (e.g. a visual view, zoom/pan, validation indicators). This DSL is:

* **Indentation-based** (2 spaces per level)
* **Prefix-based** (node types defined by `O:`, `OP:`, `S:`, `SU:` etc.)
* **Line-oriented** (blank lines ignored, line-by-line parsing)

The **code editor side panel is the primary interface** for editing this text representation.

---

### 2. Current Situation (Problem Statement)

Right now, the side panel is effectively a **custom / homegrown text editor**, built on top of:

* A `<textarea>` or similar primitive
* Custom logic for:

  * text selection
  * caret movement
  * highlighting
  * undo/redo
  * keyboard handling

This approach has led to **buggy behavior**:

* **Text selection and caret issues**

  * Unexpected cursor jumps
  * Selection not matching what the user drags/extends
  * Inconsistent behavior around indentation, prefix expansions, and line breaks

* **Highlighting and decoration instability**

  * Incorrect or stale highlighting when editing
  * Visual “glitches” due to DOM manipulations
  * Potential desync between text content and displayed decorations

* **Fragile keyboard interactions**

  * Custom handlers for Tab, Enter, etc. interacting badly with browser defaults
  * Edge cases with selection + IME + undo/redo are hard to handle correctly

In short: the current implementation is trying to re-implement large parts of what a **mature code editor engine** already does, and it’s failing at the UX edge cases.

---

### 3. Why This Is a Problem

The code editor side panel is **critical** because:

1. It is the **single textual representation** of the hierarchical model.
   Bugs here mean:

   * incorrect edits
   * user frustration
   * loss of trust in the tool.

2. It is tightly connected to other features:

   * real-time parsing and tree updates
   * validation and inline errors
   * visual view sync and navigation

3. UX expectations are high:

   * Users expect the editor to feel like a modern code editor (VS Code, etc.).
   * Caret, selection, undo/redo, keyboard shortcuts should “just work”.

Continuing to maintain a custom editor implementation means:

* Constant time sink fixing selection/caret/undo bugs.
* High risk of regressions whenever new behaviors (e.g., folding, autocomplete) are added.
* Slow feature velocity in editor-related areas.

---

### 4. Constraints and Requirements (Editor Side Panel Only)

The **parser is already working** and is considered **out of scope** for this improvement. The focus is on the **editor panel** itself.

Key requirements for the editor side panel:

1. **Robust core behavior**

   * Correct text selection and caret movement
   * Reliable undo/redo
   * Stable keyboard handling (Tab, Enter, shortcuts)
   * No manual DOM hacking for selection or content

2. **Integration with existing backend logic**

   * Editor emits **plain text** to be consumed by the existing parser.
   * Parser remains **UI-agnostic** (pure function: `string → tree + diagnostics`).
   * Editor accepts **diagnostics** to show:

     * inline errors (e.g., red underline)
     * per-line validation (✓ / ✗)

3. **Support for desired features**

   * syntax-like highlighting for DSL prefixes (`O:`, `OP:`, etc.)
   * basic indentation rules (2 spaces per level)
   * helpful keyboard behavior:

     * `OP` + Tab → `OPP: `
     * Enter → auto-indent / preserve indentation
   * compatibility with folding/gutters/line numbers (now or in the future)

4. **Next.js compatibility**

   * Editor must work reliably in a **Next.js environment** (client-side only).
   * Avoid hydration issues or server-side dependencies on `window` / DOM.

---

### 5. Root Cause: Wrong Level of Abstraction

The core issue is not a specific bug but a **design problem**:

* The current implementation effectively **reimplements a code editor from scratch** using low-level browser primitives.
* This means the codebase is:

  * owning caret and selection logic
  * owning keyboard handling edge cases
  * owning rendering and decoration rules
* These are **hard problems** that dedicated editor libraries have spent years solving.

As long as the side panel is implemented this way, it will be:

* brittle
* hard to extend
* expensive to maintain

---

### 6. High-Level Direction for the Improvement

The main strategic move is:

> **Stop being an editor vendor. Replace the custom editor logic with a mature, off-the-shelf code editor engine, and treat it as a black box that manages text, selection, and rendering.**

Concretely, this means:

1. **Adopt a robust code editor engine** such as:

   * **CodeMirror 6**, or
   * **Monaco Editor (VS Code’s editor)**

2. **Define a small, stable interface** for the side panel editor:

   * Input:

     * the current text document
     * diagnostics (errors, validation info) from the parser
   * Output:

     * events when the text changes
     * events when the cursor/selection changes (if needed)

3. **Keep domain logic outside the editor engine**:

   * Parsing the DSL
   * Computing tree structures
   * Generating diagnostics
   * Mapping between tree nodes and text ranges
   * Visual tree behavior

4. **Express all visual edits as text operations**:

   * Visual tree actions (insert node, rename node, indent, etc.) should be translated into text changes applied via the editor’s API.
   * No direct DOM manipulation inside the editor.

This shift moves responsibility for caret/selection/undo/rendering from our code into a specialized, well-tested library.

---

### 7. Goals of the Refactor (From the Editor Perspective)

The desired outcomes of improving the code editor side panel are:

1. **Reliability**

   * No more random caret jumps.
   * Selection behaves as users expect.
   * Undo/redo is consistent and includes all edits, including those initiated from the visual side (when they are translated into text operations).

2. **Maintainability**

   * Editor behavior changes are done through clearly defined integration points (extensions, configuration, commands) instead of ad hoc DOM manipulations.
   * The code editor implementation can be upgraded independently of the DSL and parser.

3. **Extensibility**

   * Adding new features (folding, custom gutters, inline hints, etc.) leverages built-in editor capabilities rather than bespoke DOM code.
   * Future requirements (e.g. richer autocomplete, outline navigation) can be implemented on top of a solid foundation.

4. **User Experience**

   * The side panel feels like a modern code editor.
   * The user doesn’t need to think about the tool; they can focus on the content.

---

### 8. Non-Goals (For Clarity)

For this refactor, the following are **explicitly not goals**:

* Changing the DSL format or semantics.
* Rewriting or significantly altering the existing parser.
* Redesigning the visual tree or other non-editor UI.
* Building a custom editor engine from primitives again.

The goal is **integration and replacement of the low-level editor mechanics**, not a rewrite of the domain logic.

---

### 9. Summary for the AI Agent

You should treat this as a **modernization of the code editor side panel**:

* The current implementation is a fragile, custom-built editor.
* It incorrectly owns responsibilities that should belong to a dedicated editor engine (selection, caret, undo/redo, text rendering, keyboard handling).
* The refactor should:

  * Introduce a robust, off-the-shelf code editor component.
  * Wrap it behind a small, stable interface (text in/out + diagnostics).
  * Move all domain-specific features (parsing, DSL semantics, diagnostics, tree integration) into separate, testable layers.
  * Express all edits as text operations through the editor’s API.

The primary objective is to **eliminate the existing UX bugs and long-term maintenance burden** of the custom editor, without changing the DSL or parser, and while keeping the side panel integrated with the rest of the application’s text → tree → visual pipeline.
