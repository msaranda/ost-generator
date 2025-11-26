import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { ValidationResult } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResult: ValidationResult | null;
  fileName: string;
}

export default function ImportModal({
  isOpen,
  onClose,
  onConfirm,
  validationResult,
  fileName,
}: ImportModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  const isValid = validationResult?.valid ?? false;

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (isValid) {
      onConfirm();
      handleClose();
    }
  }, [isValid, onConfirm, handleClose]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  // Handle keyboard events: ENTER to confirm (if valid), ESCAPE to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isValid) {
        e.preventDefault();
        handleConfirm();
      }
      // Note: ESCAPE is handled globally in useKeyboardShortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValid, handleConfirm]);

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
          <h2 className="text-lg font-semibold text-gray-800">Import Tree</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {isValid ? (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  File is valid
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{fileName}</span> is ready to import.
                  This will replace your current tree.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  Invalid file
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  The file cannot be imported due to the following errors:
                </p>
                <ul className="mt-2 space-y-1">
                  {validationResult?.errors.map((error, index) => (
                    <li
                      key={index}
                      className="text-sm text-red-600 flex items-start gap-2"
                    >
                      <span className="text-red-400">•</span>
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {isValid && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

