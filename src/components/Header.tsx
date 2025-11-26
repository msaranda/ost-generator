import { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, ChevronDown, HelpCircle, Image, Share2, Check, 
  AlertCircle, FilePlus, Clock, Eye, Edit3, AlertTriangle, X, Pencil, FileText
} from 'lucide-react';
import { TreeState } from '../types';
import { generateShareableUrl } from '../utils/urlSharing';
import { Session, formatSaveDate } from '../hooks/useAutoSave';

const PERSISTENCE_WARNING_KEY = 'ost-persistence-warning-dismissed';

interface HeaderProps {
  onImport: (file: File) => void;
  onExportJSON: () => void;
  onExportImage: () => void;
  isExporting?: boolean;
  treeData: TreeState;
  isReadOnly?: boolean;
  onNewTree: () => void;
  sessions: Session[];
  currentSessionId: string | null;
  onSessionSelect: (session: Session) => void;
  title: string;
  onTitleChange: (title: string) => void;
  lastSaved: Date | null;
  onEditSharedTree?: () => void;
  showTextEditor?: boolean;
  onToggleTextEditor?: () => void;
}

export default function Header({
  onImport,
  onExportJSON,
  onExportImage,
  isExporting = false,
  treeData,
  isReadOnly = false,
  onNewTree,
  sessions,
  currentSessionId,
  onSessionSelect,
  title,
  onTitleChange,
  lastSaved,
  onEditSharedTree,
  showTextEditor = false,
  onToggleTextEditor,
}: HeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const [showPersistenceWarning, setShowPersistenceWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Check if persistence warning was dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(PERSISTENCE_WARNING_KEY);
    if (!dismissed) {
      setShowPersistenceWarning(true);
    }
  }, []);

  // Show saved badge when lastSaved changes
  useEffect(() => {
    if (lastSaved && !isReadOnly) {
      setShowSavedBadge(true);
      const timer = setTimeout(() => setShowSavedBadge(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isReadOnly]);

  // Update edit title when title prop changes
  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleShare = async () => {
    try {
      const shareUrl = generateShareableUrl(treeData);
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (error) {
      console.error('Share failed:', error);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const newTitle = editTitle.trim() || 'Untitled';
    if (newTitle !== title) {
      onTitleChange(newTitle);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditingTitle(false);
    }
  };

  const dismissPersistenceWarning = () => {
    localStorage.setItem(PERSISTENCE_WARNING_KEY, 'true');
    setShowPersistenceWarning(false);
  };

  const shortcuts = [
    { key: 'A', action: 'Add child to selected node' },
    { key: 'D', action: 'Delete selected node' },
    { key: 'Enter', action: 'Edit selected node' },
    { key: '↑↓←→', action: 'Navigate between nodes' },
    { key: 'Escape', action: 'Deselect / Cancel' },
    { key: 'Ctrl/⌘ + S', action: 'Export JSON' },
    { key: 'Ctrl/⌘ + Z', action: 'Undo' },
    { key: 'Ctrl/⌘ + Shift + Z', action: 'Redo' },
  ];

  // Sort sessions by savedAt (newest first)
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return (
    <>
      {/* Persistence Warning Banner */}
      {showPersistenceWarning && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>
              Sessions are stored in your browser and may be lost. Export your work regularly to keep it safe.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportJSON}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            >
              <Download size={12} />
              Export
            </button>
            <button
              onClick={dismissPersistenceWarning}
              className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 shadow-sm z-20">
        {/* Left: Logo + Title + Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="px-2 py-1 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">OST</span>
          </div>
          
          {/* Title */}
          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle && !isReadOnly ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none px-1 min-w-[100px] max-w-[250px]"
                placeholder="Untitled"
              />
            ) : (
              <button
                onClick={() => !isReadOnly && setIsEditingTitle(true)}
                className={`group flex items-center gap-1.5 text-lg font-semibold text-gray-800 truncate max-w-[250px] ${
                  isReadOnly ? 'cursor-default' : 'hover:text-blue-600 cursor-text'
                }`}
                title={isReadOnly ? title : 'Click to edit title'}
              >
                {title || 'Untitled'}
                {!isReadOnly && (
                  <Pencil size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                )}
              </button>
            )}
            
            {/* Saved badge */}
            {showSavedBadge && !isReadOnly && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium animate-fade-in">
                <Check size={12} />
                Saved
              </div>
            )}
            
            {/* Read-only badge with Edit button */}
            {isReadOnly && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  <Eye size={12} />
                  View Only
                </div>
                {onEditSharedTree && (
                  <button
                    onClick={onEditSharedTree}
                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                    title="Save as new session and edit"
                  >
                    <Edit3 size={12} />
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Session selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSessionMenu(!showSessionMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sessions"
            >
              <Clock size={16} />
              <ChevronDown size={14} />
            </button>

            {showSessionMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSessionMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  {/* New button */}
                  <button
                    onClick={() => {
                      onNewTree();
                      setShowSessionMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-100"
                  >
                    <FilePlus size={16} />
                    New Tree
                  </button>

                  {/* Session list */}
                  {sortedSessions.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {sortedSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => {
                            onSessionSelect(session);
                            setShowSessionMenu(false);
                          }}
                          className={`flex flex-col w-full px-4 py-2.5 text-sm text-left transition-colors ${
                            session.id === currentSessionId && !isReadOnly
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium truncate">{session.title}</span>
                          <span className="text-xs text-gray-500">{formatSaveDate(session.savedAt)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No saved sessions
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Text Editor Toggle */}
          {onToggleTextEditor && (
            <button
              onClick={onToggleTextEditor}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
                showTextEditor
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title={showTextEditor ? 'Hide text editor' : 'Show text editor'}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Text</span>
            </button>
          )}

          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Import JSON"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      onExportJSON();
                      setShowExportMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={16} />
                    Export JSON
                  </button>
                  <button
                    onClick={() => {
                      onExportImage();
                      setShowExportMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Image size={16} />
                    Export Image
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
              shareStatus === 'copied'
                ? 'bg-green-600 text-white'
                : shareStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            title="Copy shareable link"
          >
            {shareStatus === 'copied' ? (
              <>
                <Check size={16} />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : shareStatus === 'error' ? (
              <>
                <AlertCircle size={16} />
                <span className="hidden sm:inline">Failed</span>
              </>
            ) : (
              <>
                <Share2 size={16} />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Help */}
          <div className="relative">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Keyboard shortcuts"
            >
              <HelpCircle size={18} />
            </button>

            {showHelp && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowHelp(false)}
                />
                <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Keyboard Shortcuts
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex justify-between text-sm"
                      >
                        <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-xs">
                          {shortcut.key}
                        </kbd>
                        <span className="text-gray-600">{shortcut.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
