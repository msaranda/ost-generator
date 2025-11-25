# OST Builder

A client-side web application for creating, editing, and visualizing Opportunity Solution Trees.

## Features

- **Tree Structure**: Create hierarchical trees with Outcome, Opportunity, Solution, and Sub-opportunity nodes
- **Visual Design**: Color-coded sticky notes with smooth bezier curve connections
- **Auto-Layout**: Automatic tree positioning with hierarchical layout
- **Manual Mode**: Drag-and-drop node positioning when auto-layout is disabled
- **Import/Export**: Save and load trees as JSON files
- **Image Export**: Export your tree as a high-resolution JPG image
- **Auto-Save**: Automatic saving to localStorage every 30 seconds
- **Undo/Redo**: Full history support with Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z
- **Mini-Map**: Overview navigation in the bottom-right corner
- **Keyboard Shortcuts**: Tab (add child), Delete, Escape, Ctrl+S (export)

## Usage

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Keyboard Shortcuts

- `Tab` - Add child to selected node
- `Delete` - Delete selected node
- `Escape` - Deselect node / Cancel edit
- `Ctrl/Cmd + S` - Export JSON
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Double-click` - Edit node text

## Tech Stack

- React 18 + TypeScript
- React Flow for diagram rendering
- Tailwind CSS for styling
- html2canvas for image export
- Vite for development/build

