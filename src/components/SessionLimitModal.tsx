import { useState, useEffect } from 'react';
import { AlertTriangle, Download, Trash2, X } from 'lucide-react';
import { Session, formatSaveDate } from '../hooks/useAutoSave';
import { exportSessionToJSON } from '../utils/exportHandlers';

interface SessionLimitModalProps {
  isOpen: boolean;
  sessionToRemove: Session | null;
  onDownloadAndRemove: () => void;
  onRemove: () => void;
  onCancel: () => void;
}

export default function SessionLimitModal({
  isOpen,
  sessionToRemove,
  onDownloadAndRemove,
  onRemove,
  onCancel,
}: SessionLimitModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onCancel, 200);
  };

  const handleDownloadAndRemove = () => {
    if (sessionToRemove) {
      exportSessionToJSON(sessionToRemove);
    }
    setIsVisible(false);
    setTimeout(onDownloadAndRemove, 200);
  };

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(onRemove, 200);
  };

  if (!isOpen || !sessionToRemove) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-opacity duration-200
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`
          relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4
          transform transition-all duration-200
          ${isVisible ? 'scale-100' : 'scale-95'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Session Limit Reached</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">
                You've reached the limit of 5 saved sessions
              </p>
              <p className="text-sm text-gray-600 mt-1">
                To save your current work, the oldest session will be removed:
              </p>
              
              {/* Session to remove preview */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-800 truncate">
                  {sessionToRemove.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last saved: {formatSaveDate(sessionToRemove.savedAt)}
                </p>
              </div>
              
              <p className="text-sm text-gray-500 mt-3">
                You can download this session before removing it.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleDownloadAndRemove}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Download & Remove
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Just Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

