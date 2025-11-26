import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nodeContent: string;
  childCount: number;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  nodeContent,
  childCount,
}: DeleteConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    handleClose();
  }, [onConfirm, handleClose]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  // Handle keyboard events: ENTER to confirm, ESCAPE to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
      // Note: ESCAPE is handled globally in useKeyboardShortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleConfirm]);

  if (!isOpen) return null;

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
          <h2 className="text-lg font-semibold text-gray-800">Delete Node</h2>
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
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="font-medium text-gray-800">
                Delete this node{childCount > 0 ? ' and all children?' : '?'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                "{nodeContent.length > 50 ? nodeContent.slice(0, 50) + '...' : nodeContent}"
              </p>
              {childCount > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  This will also delete {childCount} child node{childCount > 1 ? 's' : ''}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

