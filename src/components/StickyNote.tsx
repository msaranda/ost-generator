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
  isSelected: boolean;
}

const StickyNote = memo(({ data, selected }: NodeProps<StickyNoteData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const size = NODE_SIZES[data.type as NodeType] || NODE_SIZES.opportunity;
  const isRoot = data.parentId === null;

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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editContent.trim() !== data.content) {
      data.onUpdate(data.id, editContent.trim() || data.content);
    }
  }, [editContent, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditContent(data.content);
      setIsEditing(false);
    }
  }, [handleBlur, data.content]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRoot) {
      data.onDelete(data.id);
    }
  }, [data, isRoot]);

  const handleAddChild = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onAddChild(data.id);
  }, [data]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSelect(data.id);
  }, [data]);

  // Handle click on text content to start editing
  const handleTextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

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
        relative cursor-default
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
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
      {isHovered && !isRoot && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors z-10"
          title="Delete node"
        >
          <X size={14} />
        </button>
      )}

      {/* Add child button */}
      {isHovered && (
        <button
          onClick={handleAddChild}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 p-1 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors z-10"
          title="Add child node"
        >
          <Plus size={14} />
        </button>
      )}

      {/* Node type label */}
      <div className="absolute top-2 left-3 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        {getNodeTypeLabel(data.type as NodeType)}
      </div>

      {/* Content */}
      <div className="flex items-center justify-center h-full px-3 pt-5 pb-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
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
            onClick={handleTextClick}
            className={`
              text-center text-sm leading-snug break-words overflow-hidden cursor-text
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

