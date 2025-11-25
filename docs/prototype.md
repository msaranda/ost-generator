# OST Builder - Opportunity Solution Tree Visualization Tool

## Project Overview

A client-side web application for creating, editing, and visualizing Opportunity Solution Trees (OSTs). Users can build hierarchical trees of sticky notes, export as JSON or JPG, and import previously saved work.

## Tech Stack Requirements

- **Framework:** React (with hooks)
- **Styling:** Tailwind CSS
- **Diagram Layout:** React Flow or custom D3.js tree layout
- **Export:** 
  - JSON: Native JavaScript
  - JPG: html2canvas library
- **File Handling:** FileReader API (import), download blob (export)
- **State Management:** React useState/useReducer
- **No Backend:** 100% client-side, localStorage for auto-save

## Core Features

### 1. Tree Structure
- **Root Node (Outcome):** Single top-level node, always visible
- **Opportunity Nodes:** Children of root
- **Solution Nodes:** Children of opportunities
- **Sub-opportunity Nodes:** Children of opportunities (optional depth)
- **Unlimited nesting depth** (but recommend 4 levels max for usability)

### 2. Node Types & Appearance
```javascript
// Node data structure
{
  id: "unique-uuid",
  type: "outcome" | "opportunity" | "solution" | "sub-opportunity",
  content: "Node text content",
  parentId: "parent-node-id" | null,
  children: ["child-id-1", "child-id-2"],
  position: { x: number, y: number }, // optional for manual layout
  color: "#hex-color" // sticky note color
}
```

**Visual Design:**
- **Outcome node:** Large yellow sticky (200x150px), bold text
- **Opportunity nodes:** Medium blue stickies (180x120px)
- **Solution nodes:** Small green stickies (160x100px)
- **Sub-opportunity nodes:** Medium purple stickies (180x120px)

All nodes have:
- Drop shadow effect
- Rounded corners (8px)
- Editable text area (click to edit, contenteditable)
- Delete button (X icon, top-right, appears on hover)
- Add child button (+ icon, bottom-center)
- Draggable (optional, for manual positioning)

### 3. Layout Algorithm

**Auto Layout (Primary Mode):**
- Tree flows top-to-bottom
- Root at top center
- Each level distributed horizontally with equal spacing
- Vertical spacing: 150px between levels
- Horizontal spacing: 200px between siblings
- Center-align children under parent
- Recalculate on add/delete/edit

**Manual Mode (Toggle):**
- Disable auto-layout
- Allow drag-and-drop positioning
- Save positions in node data

### 4. Connections (Arrows)

- SVG paths connecting parent to children
- Start: Bottom-center of parent node
- End: Top-center of child node
- Style: 2px solid gray line with arrowhead
- Smooth curves (cubic bezier) not straight lines

### 5. User Interactions

#### Add Node
- Click `+` button on any node
- Creates child node with default text "New [node-type]"
- Auto-focuses text for immediate editing
- Updates layout

#### Edit Node
- Click anywhere on sticky note text
- Text becomes editable (contenteditable or textarea)
- Save on blur or Enter key
- Cancel on Escape key

#### Delete Node
- Hover node → X button appears
- Click X → Confirmation modal: "Delete this node and all children?"
- On confirm: remove node and all descendants
- Update layout

#### Navigate
- Pan canvas with mouse drag (when not on node)
- Zoom with mouse wheel or pinch
- Fit-to-screen button (reset view to show entire tree)
- Mini-map (optional, bottom-right corner)

### 6. Export Features

#### Export to JSON
```javascript
// File structure
{
  version: "1.0",
  created: "ISO-8601-timestamp",
  modified: "ISO-8601-timestamp",
  tree: {
    rootId: "root-node-id",
    nodes: {
      "node-id-1": { /* node object */ },
      "node-id-2": { /* node object */ }
    }
  }
}
```
- Button: "Export JSON"
- Downloads file: `ost-[timestamp].json`
- Pretty-printed, human-readable

#### Export to JPG
- Button: "Export Image"
- Captures entire canvas (all visible nodes)
- Uses html2canvas to render
- Downloads file: `ost-[timestamp].jpg`
- Resolution: 300 DPI equivalent
- White background (not transparent)

### 7. Import Feature

- Button: "Import JSON"
- Opens file picker (accept: .json)
- Validates JSON structure
- If valid: replaces current tree (with confirmation)
- If invalid: shows error message
- Preserves manual positions if they exist

### 8. Auto-Save

- Save to localStorage every 30 seconds
- Key: `ost-autosave`
- On page load: check for autosave, offer to restore
- "Clear autosave" button in settings

### 9. UI Layout
```
┌─────────────────────────────────────────────────┐
│  OST Builder             [Import] [Export ▼]   │  ← Header
├─────────────────────────────────────────────────┤
│                                                 │
│                                                 │
│              [Canvas with Tree]                 │
│                                                 │
│                                                 │
│                                                 │
│  [Fit] [Zoom: 100%]           [Mini-map]       │  ← Footer
└─────────────────────────────────────────────────┘
```

**Header:**
- Title: "OST Builder"
- Import button
- Export dropdown: "Export JSON" | "Export Image"
- Help icon (shows keyboard shortcuts)

**Canvas:**
- Infinite scrollable area
- Grid background (subtle, optional)
- Nodes and connections rendered here

**Footer:**
- Fit to screen button
- Zoom level indicator
- Mini-map (optional)

### 10. Keyboard Shortcuts

- `Tab` on node: Create child
- `Delete` on focused node: Delete node
- `Escape`: Deselect node
- `Ctrl/Cmd + S`: Export JSON
- `Ctrl/Cmd + Z`: Undo (bonus feature)
- `Space + Drag`: Pan canvas

### 11. Initial State

On first load, create default tree:
```
Outcome: "Your outcome here"
├─ Opportunity: "Opportunity 1"
│  └─ Solution: "Solution 1.1"
└─ Opportunity: "Opportunity 2"
   └─ Solution: "Solution 2.1"
```

User can edit/delete/extend from there.

## Technical Implementation Details

### Recommended Libraries
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "reactflow": "^11.10.0",  // OR use custom layout
    "html2canvas": "^1.4.1",
    "uuid": "^9.0.0",
    "lucide-react": "^0.300.0"  // for icons
  }
}
```

### Component Structure
```
src/
├── components/
│   ├── OSTCanvas.jsx          // Main canvas container
│   ├── StickyNote.jsx         // Individual node component
│   ├── ConnectionLine.jsx     // SVG path between nodes
│   ├── Header.jsx             // Top bar with actions
│   ├── Footer.jsx             // Bottom controls
│   ├── ExportModal.jsx        // Export options
│   ├── ImportModal.jsx        // Import with validation
│   └── MiniMap.jsx            // Optional mini-map
├── hooks/
│   ├── useOSTTree.js          // Tree state management
│   ├── useAutoLayout.js       // Layout calculation
│   └── useAutoSave.js         // LocalStorage persistence
├── utils/
│   ├── treeLayout.js          // Algorithm for positioning
│   ├── exportHandlers.js      // JSON + JPG export logic
│   └── validation.js          // JSON schema validation
├── App.jsx
└── index.jsx
```

### State Management Pattern
```javascript
// Main state shape
{
  tree: {
    rootId: string,
    nodes: Map<id, Node>,
    selectedNodeId: string | null
  },
  ui: {
    zoom: number,
    pan: { x: number, y: number },
    layoutMode: 'auto' | 'manual'
  }
}

// Key actions
- addNode(parentId, type)
- updateNode(id, content)
- deleteNode(id)
- selectNode(id)
- exportTree(format)
- importTree(jsonData)
```

### Layout Algorithm Pseudocode
```javascript
function calculateTreeLayout(rootId, nodes) {
  // 1. Build tree structure from flat node map
  const root = buildTree(rootId, nodes);
  
  // 2. Calculate width of each subtree (post-order traversal)
  const widths = calculateSubtreeWidths(root);
  
  // 3. Position nodes (pre-order traversal)
  const LEVEL_HEIGHT = 150;
  const NODE_SPACING = 200;
  
  function positionNode(node, x, y, level) {
    node.position = { x, y: level * LEVEL_HEIGHT };
    
    if (node.children.length === 0) return;
    
    const totalWidth = node.children.reduce(
      (sum, child) => sum + widths[child.id], 0
    );
    
    let currentX = x - totalWidth / 2;
    
    node.children.forEach(child => {
      const childWidth = widths[child.id];
      positionNode(child, currentX + childWidth / 2, y, level + 1);
      currentX += childWidth;
    });
  }
  
  positionNode(root, 0, 0, 0);
  return nodes; // with updated positions
}
```

### Export JPG Implementation
```javascript
import html2canvas from 'html2canvas';

async function exportToJPG(canvasElement) {
  // 1. Calculate bounding box of all nodes
  const bbox = calculateBoundingBox(nodes);
  
  // 2. Temporarily adjust canvas to fit all nodes
  const originalTransform = canvasElement.style.transform;
  canvasElement.style.transform = `translate(${-bbox.x}px, ${-bbox.y}px)`;
  
  // 3. Capture with html2canvas
  const canvas = await html2canvas(canvasElement, {
    backgroundColor: '#ffffff',
    scale: 2, // Higher resolution
    width: bbox.width,
    height: bbox.height
  });
  
  // 4. Restore original transform
  canvasElement.style.transform = originalTransform;
  
  // 5. Convert to blob and download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ost-${Date.now()}.jpg`;
    link.href = url;
    link.click();
  }, 'image/jpeg', 0.95);
}
```

## Validation & Error Handling

### JSON Import Validation
```javascript
const schema = {
  version: "string",
  tree: {
    rootId: "string",
    nodes: {
      [id]: {
        id: "string (required)",
        type: "enum: outcome|opportunity|solution|sub-opportunity",
        content: "string (required)",
        parentId: "string | null",
        children: "array of strings"
      }
    }
  }
};

// Validate:
// 1. Schema structure matches
// 2. rootId exists in nodes
// 3. All parentId references exist
// 4. All children references exist
// 5. No circular references
// 6. Only one root node (parentId === null)
```

### Error Messages

- "Invalid JSON file format"
- "This file contains circular references"
- "Missing required node properties"
- "Failed to export image - try again"
- "Autosave restored from [timestamp]"

## Styling Guidelines

### Colors
```css
:root {
  --outcome-color: #FFF9C4;    /* Light yellow */
  --opportunity-color: #BBDEFB; /* Light blue */
  --solution-color: #C8E6C9;    /* Light green */
  --sub-opp-color: #E1BEE7;     /* Light purple */
  --connection-color: #757575;  /* Gray */
  --text-color: #212121;        /* Dark gray */
  --bg-color: #FAFAFA;          /* Off-white canvas */
}
```

### Sticky Note CSS
```css
.sticky-note {
  background: var(--node-color);
  border-radius: 8px;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.15);
  padding: 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  cursor: move;
  transition: transform 0.2s, box-shadow 0.2s;
}

.sticky-note:hover {
  transform: translateY(-2px);
  box-shadow: 3px 3px 12px rgba(0,0,0,0.2);
}

.sticky-note.editing {
  outline: 2px solid #2196F3;
  cursor: text;
}
```

## Success Criteria

- [ ] Can create tree with 20+ nodes without lag
- [ ] Export JSON is valid and re-importable
- [ ] Export JPG captures all visible nodes clearly
- [ ] Autosave prevents data loss on browser close
- [ ] Intuitive UX - no tutorial needed for basic use
- [ ] Works in Chrome, Firefox, Safari (latest versions)
- [ ] Mobile responsive (view-only, editing awkward on mobile is OK)

## Non-Requirements (Out of Scope)

- ❌ Collaboration / real-time editing
- ❌ User accounts / authentication
- ❌ Cloud storage / sync
- ❌ Undo/redo (nice to have, but not required)
- ❌ Rich text formatting (bold/italic)
- ❌ Comments or annotations
- ❌ Version history
- ❌ Templates library
- ❌ Export to other formats (PDF, PNG, SVG)

## Development Phases

### Phase 1: Core (Must Have)
- Basic tree structure (add/edit/delete nodes)
- Auto-layout algorithm
- JSON export/import
- Sticky note visual design

### Phase 2: Polish (Should Have)
- JPG export
- Auto-save to localStorage
- Zoom and pan controls
- Keyboard shortcuts

### Phase 3: Enhanced (Nice to Have)
- Mini-map
- Manual positioning mode
- Undo/redo
- Custom node colors
- Grid background

## File to Give Cursor

Save as: `OST_BUILDER_SPEC.md`

---

**Now: Are you building this, or are we moving forward with solution selection for FlowCraft?**

Your 7-day clock is ticking. What's the call?