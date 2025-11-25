import { useEffect, useRef, useCallback, useState } from 'react';
import { TreeState, ExportData } from '../types';

const AUTOSAVE_KEY = 'ost-autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

interface AutoSaveData extends ExportData {
  savedAt: string;
}

// Check if there's a saved tree in localStorage
export function getAutosave(): AutoSaveData | null {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as AutoSaveData;
  } catch {
    return null;
  }
}

// Clear autosave from localStorage
export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Ignore errors
  }
}

// Format date for display
export function formatSaveDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return 'Unknown date';
  }
}

export function useAutoSave(tree: TreeState, enabled: boolean = true) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const treeRef = useRef(tree);
  
  // Keep ref updated
  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  const saveTree = useCallback(() => {
    try {
      const data: AutoSaveData = {
        version: '1.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        tree: {
          rootId: treeRef.current.rootId,
          nodes: treeRef.current.nodes,
        },
      };
      
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to autosave:', error);
    }
  }, []);

  // Set up autosave interval
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(saveTree, AUTOSAVE_INTERVAL);
    
    // Also save on first mount
    saveTree();

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, saveTree]);

  // Save before page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      saveTree();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, saveTree]);

  return {
    lastSaved,
    saveNow: saveTree,
    clearSave: clearAutosave,
  };
}

