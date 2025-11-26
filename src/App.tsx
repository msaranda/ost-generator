import { useState, useCallback, useRef, useEffect } from 'react';
import { useOSTTree } from './hooks/useOSTTree';
import { useAutoSave, getLatestSession, getSessions, Session } from './hooks/useAutoSave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { validateTreeJSON, parseValidatedData } from './utils/validation';
import { exportToJSON, exportToJPG, readJSONFile } from './utils/exportHandlers';
import { hasSharedTree, loadTreeFromUrl, clearTreeFromUrl } from './utils/urlSharing';
import { ExportData, ValidationResult } from './types';

import Header from './components/Header';
import Footer from './components/Footer';
import OSTCanvas, { OSTCanvasHandle } from './components/OSTCanvas';
import ImportModal from './components/ImportModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import SessionLimitModal from './components/SessionLimitModal';

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
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [title, setTitle] = useState('Untitled');
  const [triggerEditNodeId, setTriggerEditNodeId] = useState<string | null>(null);

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [pendingImportData, setPendingImportData] = useState<ExportData | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<OSTCanvasHandle>(null);
  const hasCheckedInitialLoad = useRef(false);

  // Auto-save (disabled in read-only mode)
  const { 
    lastSaved, 
    currentSessionId,
    pendingSessionToRemove,
    createNewSession,
    switchSession,
    dismissPendingRemoval,
    confirmRemoval,
    updateSessionTitle,
    saveNow,
    clearCurrentSession,
  } = useAutoSave(tree, !isReadOnly, title);

  // Handle text saved in node - trigger immediate save
  const handleTextSaved = useCallback(() => {
    if (!isReadOnly) {
      saveNow();
    }
  }, [isReadOnly, saveNow]);

  // Check for shared tree in URL or auto-restore latest session on mount
  useEffect(() => {
    // Guard to prevent multiple runs
    if (hasCheckedInitialLoad.current) return;
    hasCheckedInitialLoad.current = true;

    // Priority: URL tree (read-only) > latest session > default tree
    if (hasSharedTree()) {
      try {
        const sharedTree = loadTreeFromUrl();
        if (sharedTree) {
          importTree(sharedTree);
          setIsReadOnly(true);
          setTitle('Shared Tree');
          // Clear URL parameter but don't touch saved sessions
          clearTreeFromUrl();
          return;
        }
      } catch (error) {
        console.error('Failed to load shared tree from URL:', error);
        alert('Unable to load shared tree. The link may be corrupted.');
        clearTreeFromUrl();
      }
    }

    // Auto-restore latest session (no modal)
    const latestSession = getLatestSession();
    if (latestSession) {
      importTree({
        rootId: latestSession.tree.rootId,
        nodes: latestSession.tree.nodes,
        selectedNodeId: null,
      });
      setTitle(latestSession.title || 'Untitled');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    updateSessionTitle(newTitle);
  }, [updateSessionTitle]);

  // Handle creating a new tree
  const handleNewTree = useCallback(() => {
    // Exit read-only mode if active
    if (isReadOnly) {
      setIsReadOnly(false);
    }
    // Create a fresh default tree
    importTree({
      rootId: 'root',
      nodes: {
        root: {
          id: 'root',
          type: 'outcome',
          content: 'Your outcome here',
          parentId: null,
          children: [],
          position: { x: 0, y: 0 },
          color: '#FFF9C4',
        },
      },
      selectedNodeId: null,
    });
    setTitle('Untitled');
    // Create a new session for it
    setTimeout(() => createNewSession(true), 100);
  }, [isReadOnly, importTree, createNewSession]);

  // Handle switching sessions
  const handleSessionSelect = useCallback((session: Session) => {
    // Exit read-only mode if active
    if (isReadOnly) {
      setIsReadOnly(false);
    }
    importTree({
      rootId: session.tree.rootId,
      nodes: session.tree.nodes,
      selectedNodeId: null,
    });
    setTitle(session.title || 'Untitled');
    switchSession(session.id);
  }, [isReadOnly, importTree, switchSession]);

  // Handle editing a shared tree (save as new session)
  const handleEditSharedTree = useCallback(() => {
    // Clear current session to prevent initialization effect from restoring old session
    clearCurrentSession();
    setIsReadOnly(false);
    setTitle('Shared Tree (Copy)');
    // Create a new session for this shared tree
    setTimeout(() => createNewSession(true), 100);
  }, [clearCurrentSession, createNewSession]);

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
      // Exit read-only mode when importing
      if (isReadOnly) {
        setIsReadOnly(false);
      }
      const treeState = parseValidatedData(pendingImportData);
      importTree(treeState);
      setPendingImportData(null);
      // Use filename as title
      const importedTitle = importFileName.replace(/\.json$/i, '') || 'Imported Tree';
      setTitle(importedTitle);
      // Create a new session for imported data
      setTimeout(() => createNewSession(true), 100);
    }
  }, [pendingImportData, importTree, isReadOnly, createNewSession, importFileName]);

  // Handle export
  const handleExportJSON = useCallback(() => {
    exportToJSON(tree, title);
  }, [tree, title]);

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
    if (isReadOnly) return;
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  }, [isReadOnly]);

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

  // Handle entering edit mode from keyboard
  const handleEnterEditMode = useCallback(() => {
    if (!isReadOnly && tree.selectedNodeId) {
      setTriggerEditNodeId(tree.selectedNodeId);
    }
  }, [isReadOnly, tree.selectedNodeId]);

  // Clear triggerEditNodeId after it's been consumed
  const handleClearTriggerEdit = useCallback(() => {
    setTriggerEditNodeId(null);
  }, []);

  // Track if any modal is open
  const hasOpenModal = showImportModal || showDeleteModal || !!pendingSessionToRemove;

  // Handle closing the active modal
  const handleCloseModal = useCallback(() => {
    if (showImportModal) {
      setShowImportModal(false);
    } else if (showDeleteModal) {
      setShowDeleteModal(false);
      setPendingDeleteId(null);
    } else if (pendingSessionToRemove) {
      dismissPendingRemoval();
    }
  }, [showImportModal, showDeleteModal, pendingSessionToRemove, dismissPendingRemoval]);

  // Get nearest node to cursor for arrow key navigation
  const getNearestNodeToCursor = useCallback(() => {
    return canvasRef.current?.getNearestNodeToCursor() || null;
  }, []);

  // Keyboard shortcuts (disabled in read-only mode for mutations)
  useKeyboardShortcuts({
    onAddChild: (!isReadOnly && tree.selectedNodeId)
      ? () => addNode(tree.selectedNodeId!)
      : undefined,
    onDelete: (!isReadOnly && tree.selectedNodeId)
      ? () => handleRequestDelete(tree.selectedNodeId!)
      : undefined,
    onEscape: () => {
      selectNode(null);
      setIsEditing(false);
    },
    onSave: handleExportJSON,
    onUndo: isReadOnly ? undefined : undo,
    onRedo: isReadOnly ? undefined : redo,
    onEnterEdit: handleEnterEditMode,
    onSelectNode: selectNode,
    onCloseModal: handleCloseModal,
    hasOpenModal,
    getNearestNodeToCursor,
    tree,
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
        isReadOnly={isReadOnly}
        onNewTree={handleNewTree}
        sessions={getSessions().sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        title={title}
        onTitleChange={handleTitleChange}
        lastSaved={lastSaved}
        onEditSharedTree={isReadOnly ? handleEditSharedTree : undefined}
      />

      <main className="flex-1 relative overflow-hidden">
        <OSTCanvas
          ref={canvasRef}
          tree={tree}
          onUpdateNode={isReadOnly ? () => {} : updateNode}
          onDeleteNode={isReadOnly ? () => {} : deleteNode}
          onAddChild={isReadOnly ? () => {} : addNode}
          onSelectNode={selectNode}
          onRequestDelete={handleRequestDelete}
          onMoveNode={isReadOnly ? () => {} : moveNode}
          onEditingChange={setIsEditing}
          onTextSaved={handleTextSaved}
          zoom={zoom}
          onZoomChange={setZoom}
          layoutMode={layoutMode}
          isReadOnly={isReadOnly}
          triggerEditNodeId={triggerEditNodeId}
          onClearTriggerEdit={handleClearTriggerEdit}
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
        isReadOnly={isReadOnly}
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

      <SessionLimitModal
        isOpen={!!pendingSessionToRemove}
        sessionToRemove={pendingSessionToRemove}
        onDownloadAndRemove={confirmRemoval}
        onRemove={confirmRemoval}
        onCancel={dismissPendingRemoval}
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
