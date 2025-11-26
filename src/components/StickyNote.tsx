import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { X, Plus } from 'lucide-react';
import { OSTNode, NODE_SIZES, NodeType } from '../types';
import { getNodeTypeLabel } from '../utils/nodeTypes';

interface StickyNoteData extends OSTNode {
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onSelect: (id: string | null) => void;
  onEditingChange: (isEditing: boolean) => void;
  onTextSaved?: () => void;
  isSelected: boolean;
  isReadOnly?: boolean;
  shouldTriggerEdit?: boolean;
  onClearTriggerEdit?: () => void;
}

const StickyNote = memo(({ data, selected }: NodeProps<StickyNoteData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content);
  const [originalContent, setOriginalContent] = useState(data.content);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const size = NODE_SIZES[data.type as NodeType] || NODE_SIZES.opportunity;
  const isRoot = data.parentId === null;
  const isReadOnly = data.isReadOnly ?? false;

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update edit content when data changes
  useEffect(() => {
    if (!isEditing) {
      setEditContent(data.content);
    }
  }, [data.content, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Handle trigger edit from keyboard shortcut (Enter key)
  useEffect(() => {
    if (data.shouldTriggerEdit && !isReadOnly && !isEditing) {
      setOriginalContent(data.content); // Store original before editing
      setIsEditing(true);
      data.onEditingChange(true);
      // Clear the trigger after handling
      if (data.onClearTriggerEdit) {
        data.onClearTriggerEdit();
      }
    }
  }, [data.shouldTriggerEdit, isReadOnly, isEditing, data]);

  // Handle text change with debounced save
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditContent(newContent);
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save - save after 500ms of no typing
    saveTimeoutRef.current = setTimeout(() => {
      if (newContent.trim() !== data.content && data.onTextSaved) {
        data.onUpdate(data.id, newContent.trim() || data.content);
        data.onTextSaved();
      }
    }, 500);
  }, [data]);

  const handleBlur = useCallback(() => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    setIsEditing(false);
    data.onEditingChange(false);
    if (editContent.trim() !== data.content) {
      data.onUpdate(data.id, editContent.trim() || data.content);
      // Notify parent that text was saved
      if (data.onTextSaved) {
        data.onTextSaved();
      }
    }
  }, [editContent, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop propagation for all keyboard events in textarea to prevent global shortcuts
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Clear any pending debounced save to prevent saving intermediate changes
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Revert to original content (before editing started)
      setEditContent(originalContent);
      setIsEditing(false);
      data.onEditingChange(false);
    }
  }, [handleBlur, data, originalContent]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRoot && !isReadOnly) {
      data.onDelete(data.id);
    }
  }, [data, isRoot, isReadOnly]);

  const handleAddChild = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly) {
      data.onAddChild(data.id);
    }
  }, [data, isReadOnly]);

  // Handle click on label area - only selects the node
  const handleLabelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSelect(data.id);
  }, [data]);

  // Handle click on content area - enters edit mode (if not read-only)
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSelect(data.id);
    if (!isReadOnly && !isEditing) {
      setOriginalContent(data.content); // Store original before editing
      setIsEditing(true);
      data.onEditingChange(true);
    }
  }, [data, isReadOnly, isEditing]);

  // Get styling based on node type
  const getBackgroundColor = () => {
    switch (data.type) {
      case 'outcome':
        return 'bg-[#FFF9C4]';
      case 'opportunity':
        return 'bg-[#BBDEFB]';
      case 'solution':
        return 'bg-[#C8E6C9]';
      case 'sub-opportunity':
        return 'bg-[#E1BEE7]';
      default:
        return 'bg-[#BBDEFB]';
    }
  };

  const getBorderColor = () => {
    if (selected || data.isSelected) {
      return 'ring-2 ring-blue-500 ring-offset-2';
    }
    return '';
  };

  return (
    <div
      className={`
        relative cursor-default flex flex-col
        ${getBackgroundColor()}
        ${getBorderColor()}
        rounded-lg shadow-md
        transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5
        ${isEditing ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        width: size.width,
        height: size.height,
        minWidth: size.width,
        minHeight: size.height,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection handles */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
        />
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Delete button */}
      {isHovered && !isRoot && !isReadOnly && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors z-10"
          title="Delete node"
        >
          <X size={14} />
        </button>
      )}

      {/* Add child button */}
      {isHovered && !isReadOnly && (
        <button
          onClick={handleAddChild}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 p-1 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors z-10"
          title="Add child node"
        >
          <Plus size={14} />
        </button>
      )}

      {/* Node type label - clicking selects node only */}
      <div 
        className="px-3 pt-2 pb-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={handleLabelClick}
      >
        {getNodeTypeLabel(data.type as NodeType)}
      </div>

      {/* Content area - clicking enters edit mode */}
      <div 
        className={`flex-1 flex items-center justify-center px-3 pb-3 ${isReadOnly ? 'cursor-default' : 'cursor-text'}`}
        onClick={handleContentClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={`
              w-full h-full resize-none bg-transparent
              text-center text-sm leading-snug
              focus:outline-none
              ${data.type === 'outcome' ? 'font-semibold text-base' : ''}
            `}
            placeholder="Enter text..."
          />
        ) : (
          <p
            className={`
              text-center text-sm leading-snug break-words overflow-hidden
              ${data.type === 'outcome' ? 'font-semibold text-base' : ''}
            `}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: data.type === 'outcome' ? 5 : 4,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.content}
          </p>
        )}
      </div>
    </div>
  );
});

StickyNote.displayName = 'StickyNote';

export default StickyNote;

