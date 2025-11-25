import { Maximize, Minus, Plus, Move, LayoutGrid } from 'lucide-react';

interface FooterProps {
  zoom: number;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  lastSaved?: Date | null;
  layoutMode: 'auto' | 'manual';
  onToggleLayoutMode: () => void;
}

export default function Footer({
  zoom,
  onFitView,
  onZoomIn,
  onZoomOut,
  lastSaved,
  layoutMode,
  onToggleLayoutMode,
}: FooterProps) {
  const zoomPercent = Math.round(zoom * 100);

  const formatLastSaved = (date: Date | null | undefined) => {
    if (!date) return null;
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'Saved just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `Saved ${mins}m ago`;
    } else {
      return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <footer className="flex items-center justify-between h-10 px-4 bg-white border-t border-gray-200 z-20">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFitView}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          title="Fit to screen"
        >
          <Maximize size={14} />
          Fit
        </button>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onZoomOut}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Zoom out"
          >
            <Minus size={14} />
          </button>
          
          <div className="w-16 text-center text-xs font-medium text-gray-600">
            {zoomPercent}%
          </div>
          
          <button
            onClick={onZoomIn}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Zoom in"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Layout mode toggle */}
        <div className="flex items-center gap-1 ml-4 border-l pl-4 border-gray-200">
          <button
            onClick={onToggleLayoutMode}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
              layoutMode === 'auto'
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
            title="Auto layout - positions are calculated automatically"
          >
            <LayoutGrid size={14} />
            Auto
          </button>
          <button
            onClick={onToggleLayoutMode}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
              layoutMode === 'manual'
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
            title="Manual layout - drag nodes to position them"
          >
            <Move size={14} />
            Manual
          </button>
        </div>
      </div>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          {formatLastSaved(lastSaved)}
        </div>
      )}

      {/* Spacer for mini-map */}
      <div className="w-24" />
    </footer>
  );
}

