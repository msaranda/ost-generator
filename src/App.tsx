import { useState, useCallback, useRef, useEffect } from 'react';
import { useOSTTree } from './hooks/useOSTTree';
import { useAutoSave, getAutosave, clearAutosave } from './hooks/useAutoSave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { validateTreeJSON, parseValidatedData } from './utils/validation';
import { exportToJSON, exportToJPG, readJSONFile } from './utils/exportHandlers';
import { hasSharedTree, loadTreeFromUrl, clearTreeFromUrl } from './utils/urlSharing';
import { ExportData, ValidationResult, TreeState } from './types';

import Header from './components/Header';
import Footer from './components/Footer';
import OSTCanvas, { OSTCanvasHandle } from './components/OSTCanvas';
import ImportModal from './components/ImportModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import RestoreModal from './components/RestoreModal';

function App() {
  // Tree state management
  const {
    tree,
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    importTree,
    moveNode,
    recalculateLayout,
    undo,
    redo,
  } = useOSTTree();

  // UI state
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'manual'>('auto');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [pendingImportData, setPendingImportData] = useState<ExportData | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreSavedAt, setRestoreSavedAt] = useState('');
  const [pendingRestoreTree, setPendingRestoreTree] = useState<TreeState | null>(null);

  // Refs
  const canvasRef = useRef<OSTCanvasHandle>(null);
  const hasCheckedInitialLoad = useRef(false);

  // Auto-save
  const { lastSaved } = useAutoSave(tree);

  // Check for shared tree in URL or autosave on mount (runs only once)
  useEffect(() => {
    // Guard to prevent multiple runs
    if (hasCheckedInitialLoad.current) return;
    hasCheckedInitialLoad.current = true;

    // Priority: URL tree > autosave > default tree
    if (hasSharedTree()) {
      try {
        const sharedTree = loadTreeFromUrl();
        if (sharedTree) {
          importTree(sharedTree);
          // Clear both URL parameter and autosave when loading shared tree
          clearTreeFromUrl();
          clearAutosave();
          return; // Skip autosave check if URL tree was loaded
        }
      } catch (error) {
        console.error('Failed to load shared tree from URL:', error);
        alert('Unable to load shared tree. The link may be corrupted.');
        clearTreeFromUrl();
      }
    }

    // Fall back to autosave if no URL tree
    const autosave = getAutosave();
    if (autosave && autosave.savedAt) {
      setRestoreSavedAt(autosave.savedAt);
      setPendingRestoreTree({
        rootId: autosave.tree.rootId,
        nodes: autosave.tree.nodes,
        selectedNodeId: null,
      });
      setShowRestoreModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle restore
  const handleRestore = useCallback(() => {
    if (pendingRestoreTree) {
      importTree(pendingRestoreTree);
      setPendingRestoreTree(null);
    }
  }, [pendingRestoreTree, importTree]);

  const handleDiscardRestore = useCallback(() => {
    clearAutosave();
    setPendingRestoreTree(null);
    setShowRestoreModal(false);
  }, []);

  // Handle import
  const handleImport = useCallback(async (file: File) => {
    try {
      const data = await readJSONFile(file);
      const validation = validateTreeJSON(data);
      
      setImportFileName(file.name);
      setImportValidation(validation);
      
      if (validation.valid) {
        setPendingImportData(data as ExportData);
      } else {
        setPendingImportData(null);
      }
      
      setShowImportModal(true);
    } catch (error) {
      setImportFileName(file.name);
      setImportValidation({
        valid: false,
        errors: [{ code: 'PARSE_ERROR', message: (error as Error).message }],
      });
      setPendingImportData(null);
      setShowImportModal(true);
    }
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (pendingImportData) {
      const treeState = parseValidatedData(pendingImportData);
      importTree(treeState);
      setPendingImportData(null);
    }
  }, [pendingImportData, importTree]);

  // Handle export
  const handleExportJSON = useCallback(() => {
    exportToJSON(tree);
  }, [tree]);

  const handleExportImage = useCallback(async () => {
    const canvasElement = canvasRef.current?.getCanvasElement();
    if (!canvasElement) return;

    setIsExporting(true);
    try {
      await exportToJPG(canvasElement, tree.nodes);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [tree.nodes]);

  // Handle delete with confirmation
  const handleRequestDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeleteId) {
      deleteNode(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, deleteNode]);

  // Get delete modal data
  const deleteNodeData = pendingDeleteId ? tree.nodes[pendingDeleteId] : null;
  const deleteChildCount = deleteNodeData
    ? countDescendants(pendingDeleteId!, tree.nodes)
    : 0;

  // Zoom controls
  const handleFitView = useCallback(() => {
    canvasRef.current?.fitView();
  }, []);

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  // Layout mode toggle
  const handleToggleLayoutMode = useCallback(() => {
    setLayoutMode(prev => {
      const newMode = prev === 'auto' ? 'manual' : 'auto';
      // Recalculate layout when switching back to auto mode
      if (newMode === 'auto') {
        recalculateLayout();
      }
      return newMode;
    });
  }, [recalculateLayout]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAddChild: tree.selectedNodeId
      ? () => addNode(tree.selectedNodeId!)
      : undefined,
    onDelete: tree.selectedNodeId
      ? () => handleRequestDelete(tree.selectedNodeId!)
      : undefined,
    onEscape: () => {
      selectNode(null);
      setIsEditing(false);
    },
    onSave: handleExportJSON,
    onUndo: undo,
    onRedo: redo,
    selectedNodeId: tree.selectedNodeId,
    isEditing,
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas">
      <Header
        onImport={handleImport}
        onExportJSON={handleExportJSON}
        onExportImage={handleExportImage}
        isExporting={isExporting}
        treeData={tree}
      />

      <main className="flex-1 relative overflow-hidden">
        <OSTCanvas
          ref={canvasRef}
          tree={tree}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onAddChild={addNode}
          onSelectNode={selectNode}
          onRequestDelete={handleRequestDelete}
          onMoveNode={moveNode}
          zoom={zoom}
          onZoomChange={setZoom}
          layoutMode={layoutMode}
        />
      </main>

      <Footer
        zoom={zoom}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        lastSaved={lastSaved}
        layoutMode={layoutMode}
        onToggleLayoutMode={handleToggleLayoutMode}
      />

      {/* Modals */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleConfirmImport}
        validationResult={importValidation}
        fileName={importFileName}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteId(null);
        }}
        onConfirm={handleConfirmDelete}
        nodeContent={deleteNodeData?.content || ''}
        childCount={deleteChildCount}
      />

      <RestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onRestore={handleRestore}
        onDiscard={handleDiscardRestore}
        savedAt={restoreSavedAt}
      />
    </div>
  );
}

// Helper function to count descendants
function countDescendants(
  nodeId: string,
  nodes: Record<string, { children: string[] }>
): number {
  const node = nodes[nodeId];
  if (!node) return 0;

  let count = node.children.length;
  for (const childId of node.children) {
    count += countDescendants(childId, nodes);
  }
  return count;
}

export default App;

