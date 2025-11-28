## 1. Core decision: stop being an editor vendor

**Rule:**
You should **not** own low-level editor concerns (caret, selection, IME, undo/redo, selection painting, copy/paste, text layout).

**Pattern:**

* Replace any **homegrown `<textarea>` or `contentEditable` editor** with a **battle-tested code editor engine**.
* Candidate engines (pick one):

  * **CodeMirror 6** (lightweight, modular, great for custom DSLs)
  * **Monaco Editor** (VS Code’s editor, heavier but extremely mature)

Your project then owns:

* Your **domain-specific behavior** (DSL semantics, tree model, validations)
* **Integration glue** (how text ↔ parser ↔ visual tree ↔ diagnostics connect)

The editor engine owns:

* Text model
* Selection/caret
* Undo/redo history
* Keyboard navigation
* Rendering and scrolling

---

## 2. Treat the editor as a black-box “Text Model Service”

**Rule:**
Conceptually treat the editor as a **service with a well-defined API**, not as a DOM component you poke at.

**Pattern:**

* Define a small, stable contract around your editor component, e.g.:

  * **Inputs:**

    * `textDocument` (string)
    * `diagnostics` (errors/warnings from your parser)
    * optionally configuration flags (read-only, theme, etc.)

  * **Outputs (events):**

    * `onTextDocumentChange(newText)`
    * `onCursorChange(position/range)`
    * maybe `onSelectionChange(range)`

* Everything else (tree, visualization, validation) uses this contract to communicate with the editor, **not its internals**.

Practical effect: you can swap your current “buggy textarea” with CodeMirror/Monaco **behind the same interface**, with minimal surface area change to the rest of the app.

---

## 3. Single source of truth for text

**Rule:**
There must be **exactly one place** that is the source of truth for the text document at any time.

There are two viable patterns:

1. **Editor-centric**:

   * The editor’s internal model is primary.
   * The rest of the app subscribes to changes via `onTextDocumentChange`.
2. **App-state-centric**:

   * The app’s state holds the string.
   * The editor is a controlled-ish component that reflects this value.

**Recommendation:**
Start with **editor-centric** for simplicity and robust UX:

* Let the editor engine manage its own internal state and undo history.
* When the editor reports changes, you:

  * feed the text into your parser
  * derive tree + diagnostics
  * push diagnostics back into the editor as a *separate* input.

Avoid constantly re-setting the entire document from outside, as it may disturb caret/undo behavior.

---

## 4. Separate concerns: parsing vs. presentation vs. editing

You already have a working parser – great. Keep it **fully independent** from any editor.

**Rules:**

* The **parser** should:

  * take `string → { tree, diagnostics }`
  * know nothing about React, Next.js, or any editor library.
* The **editor** should:

  * know nothing about tree semantics beyond “these ranges have diagnostics / decorations”.
* The **visual tree view** should:

  * read the parsed `tree`
  * not directly mutate the editor DOM; instead, request text changes via an API (see §5).

This gives you a clean pipeline:

```text
Editor text → Parser → Tree + Diagnostics
Tree → Visual View
Diagnostics → Editor decorations/gutters
Visual edits → Text patches → Editor transactions
```

This separation is what allows you to swap in a robust editor engine without rewiring your whole app.

---

## 5. Bidirectional sync via text patches, not DOM hacks

**Rule:**
All modifications to the document (including visual edits) should be expressed as **text operations**, not DOM operations.

**Pattern:**

* Visual tree actions (e.g. “rename node”, “insert child node”) are **pure operations on the DSL text**:

  * “Replace line N from X to Y”
  * “Insert line after M with content Z”
  * “Indent block from lines A–B by 2 spaces”
* These become **atomic edits** applied through the editor engine’s API (e.g. transaction / model change).
* Because they flow through the editor’s text model:

  * Undo/redo includes them
  * Caret/selection behavior is consistent
  * IME / clipboard stay intact

What you **don’t** do:

* Directly manipulate `innerHTML` or DOM nodes the editor creates.
* Try to manually move the caret by poking at DOM ranges.

Let the editor engine interpret your operations on its text model.

---

## 6. Diagnostics and highlighting: data flow pattern

You want:

* inline red underlines for syntax errors
* per-line ✓/✗
* color-coded prefixes (`O:`, `OP:`, `S:`, `SU:`)

**Rules / patterns:**

1. **Outgoing path** (Editor → Parser → Diagnostics):

   * Text changes in editor trigger a **debounced** parser call (e.g. 300 ms inactivity).
   * Parser returns a stable structure, e.g.:

     ```ts
     type Diagnostic = {
       from: number;   // character index in full document
       to: number;
       severity: "error" | "warning";
       message: string;
       line: number;
       isValidLine: boolean;
     };
     ```

2. **Incoming path** (Diagnostics → Editor decorations):

   * The editor exposes extension/config APIs for:

     * **decorations/markers** (for underlines, colored spans)
     * **gutters** (for line numbers, ✓/✗ icons)
   * Your app converts `Diagnostic[]` into the editor’s **decoration model**.
   * The editor remains in charge of how these decorations are painted on screen.

3. **Syntax highlighting**:

   * Treat syntax highlighting as **pure presentation**:

     * You decide what counts as a “prefix token”, “indentation area”, “node title” etc.
     * The editor receives lightweight rules or decorators to style them.
   * Avoid coupling syntax highlighting logic with your parser logic; both can use the same token rules, but they should not be the same component.

This pattern keeps your parser logic testable and lets the editor engine do what it’s good at (decorations, gutters, rendering performance).

---

## 7. Keyboard behavior: custom commands, not raw keydown handlers

Features like:

* `OP` + Tab → `OPP: `
* Enter → auto-indent + 2 spaces
* Custom folding shortcuts

**Rule:**
Use the editor’s **command/keymap system**, not raw DOM `keydown` listeners on the textarea.

**Patterns:**

* Define **high-level commands** in your own terms, such as:

  * `expandPrefixCommand`
  * `insertNewIndentedLineCommand`
  * `foldSectionCommand`
* Bind them to keys via the editor’s keybinding API (e.g. CodeMirror’s keymap / Monaco’s keybindings).
* Commands operate only on:

  * logical cursor position
  * current line text
  * text ranges
* They **never** manipulate DOM directly.

This gives you predictable behavior and lets the editor handle edge cases (multi-cursor, selections, IME composition).

---

## 8. Next.js-specific patterns (SSR, client-only behavior)

To avoid hydration bugs and editor breakage:

**Rules:**

1. **Editor is client-only.**

   * Use a pattern where the editor component is declared as “client component” and/or dynamically imported without SSR.
   * On the server, render a placeholder (e.g. a simple `<div>`).

2. **Do not store editor instance in global mutable variables.**

   * Keep any handle to the editor (if needed) inside React component scope.

3. **Avoid over-controlling the editor from React.**

   * Re-render React as needed, but avoid frequently replacing the editor’s entire value prop on every state change.
   * Prefer differential updates driven by editor itself (via its API).

The idea: treat the editor like a mini-application that lives inside a React component boundary.

---

## 9. Stepwise migration strategy

If your current editor is buggy, you don’t need a big-bang rewrite. Your agent can follow a gradual pattern:

1. **Introduce a new “Editor Adapter” layer**:

   * A thin wrapper component exposing your existing editor API surface:
     `value`, `onChange`, `diagnostics`, etc.
   * Internally: still uses the old textarea for now.

2. **Refactor callers to depend on the adapter interface**, not the old editor implementation.

3. **Swap the implementation behind the adapter**:

   * Replace `<textarea>` + custom selection logic with **CodeMirror or Monaco**.
   * Keep the adapter’s public API stable so the rest of the system doesn’t notice.

4. **Re-home hacks into proper extension points**:

   * Any existing logic that manipulates DOM/selection gets translated into:

     * text operations
     * editor commands
     * decoration providers
     * keymaps

This migration pattern keeps the risk under control, and your coding agent can choose whether to implement the editor in one go or in phases.

---

## 10. Summary

**High-level directive:**

> Replace the custom textarea-based editor with a mature code editor engine (CodeMirror 6 or Monaco). Treat the editor as a black-box text model and interaction engine, and move all domain-specific behavior into structured, testable layers (parser, diagnostics, commands, decorations).

**Key patterns to follow:**

1. **Editor as service** with a minimal, well-defined interface (text in/out, diagnostics in, events out).
2. **Single source of truth** for text, preferably the editor’s own model.
3. **Pure parser** independent of UI; diagnostics flow into visual decorations and gutters.
4. **Bidirectional sync** implemented via text patches/transactions, not DOM hacks.
5. **Keyboard behavior** implemented as editor commands and keymaps, not raw event listeners.
6. **Next.js-safe** usage: client-only, no SSR for the editor internals.
7. **Migration** via an adapter layer, so the rest of the codebase doesn’t depend on editor internals.
