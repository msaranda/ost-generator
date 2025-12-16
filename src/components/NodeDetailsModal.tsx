import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { OSTNode } from '../types';

interface NodeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: OSTNode | null;
}

export default function NodeDetailsModal({
  isOpen,
  onClose,
  node,
}: NodeDetailsModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 100);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  // Handle keyboard events: ESCAPE to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !node) return null;

  const hasDescription = !!node.description;
  const hasMetadata = !!node.metadata && Object.keys(node.metadata).length > 0;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-opacity duration-100
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal - compact, focused design */}
      <div
        className={`
          relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[75vh] overflow-hidden
          transform transition-all duration-100
          ${isVisible ? 'scale-100' : 'scale-95'}
        `}
      >
        {/* Compact header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 truncate flex-1 pr-2">{node.content}</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            aria-label="Close (ESC)"
            title="Close (ESC)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content - compact, focused on user content */}
        <div className="overflow-y-auto px-3 py-2.5 max-h-[calc(75vh-45px)]">
          {/* Description */}
          {hasDescription && (
            <div className="mb-2.5">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {node.description}
              </p>
            </div>
          )}

          {/* Metadata - compact badges */}
          {hasMetadata && node.metadata && (
            <div className={hasDescription ? 'pt-2.5 border-t border-gray-100' : ''}>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(node.metadata).flatMap(([fieldName, values]) =>
                  values.map((value, idx) => (
                    <span
                      key={`${fieldName}-${idx}`}
                      className="inline-block px-2 py-1 text-xs text-gray-700 bg-gray-50 rounded border border-gray-200"
                    >
                      <span className="text-gray-500 font-bold">{fieldName}:</span> {value}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

