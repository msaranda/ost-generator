import { useState, useRef } from 'react';
import { Upload, Download, ChevronDown, HelpCircle, Image, Share2, Check, AlertCircle } from 'lucide-react';
import { TreeState } from '../types';
import { generateShareableUrl } from '../utils/urlSharing';

interface HeaderProps {
  onImport: (file: File) => void;
  onExportJSON: () => void;
  onExportImage: () => void;
  isExporting?: boolean;
  treeData: TreeState;
}

export default function Header({
  onImport,
  onExportJSON,
  onExportImage,
  isExporting = false,
  treeData,
}: HeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Reset input
      e.target.value = '';
    }
  };

  const shortcuts = [
    { key: 'Tab', action: 'Add child to selected node' },
    { key: 'Delete', action: 'Delete selected node' },
    { key: 'Escape', action: 'Deselect node / Cancel edit' },
    { key: 'Ctrl/⌘ + S', action: 'Export JSON' },
    { key: 'Ctrl/⌘ + Z', action: 'Undo' },
    { key: 'Ctrl/⌘ + Shift + Z', action: 'Redo' },
    { key: 'Double-click', action: 'Edit node text' },
  ];

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 shadow-sm z-20">
      {/* Logo/Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">O</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800">OST Builder</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
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
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Upload size={16} />
          Import
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export'}
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
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            shareStatus === 'copied'
              ? 'bg-green-600 text-white'
              : shareStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
          title="Copy shareable link"
        >
          {shareStatus === 'copied' ? (
            <>
              <Check size={16} />
              Copied!
            </>
          ) : shareStatus === 'error' ? (
            <>
              <AlertCircle size={16} />
              Failed
            </>
          ) : (
            <>
              <Share2 size={16} />
              Share
            </>
          )}
        </button>

        {/* Help */}
        <div className="relative">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Keyboard shortcuts"
          >
            <HelpCircle size={20} />
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
  );
}

