import { useEffect, useRef, useCallback, useState } from 'react';
import { TreeState } from '../types';

const SESSIONS_KEY = 'ost-sessions';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const MAX_SESSIONS = 5;

export interface Session {
  id: string;
  savedAt: string;
  title: string;
  tree: {
    rootId: string;
    nodes: TreeState['nodes'];
  };
}

interface SessionsData {
  sessions: Session[];
  activeSessionId: string | null;
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all sessions from localStorage
export function getSessions(): SessionsData {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (!saved) {
      return { sessions: [], activeSessionId: null };
    }
    const data = JSON.parse(saved) as SessionsData;
    // Migration: convert old 'name' field to 'title' if needed
    data.sessions = data.sessions.map(s => ({
      ...s,
      title: s.title || (s as unknown as { name?: string }).name || 'Untitled',
    }));
    return data;
  } catch {
    return { sessions: [], activeSessionId: null };
  }
}

// Save sessions to localStorage
function saveSessions(data: SessionsData): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save sessions:', error);
  }
}

// Get the latest session
export function getLatestSession(): Session | null {
  const { sessions } = getSessions();
  if (sessions.length === 0) return null;
  // Sort by savedAt descending and return first
  const sorted = [...sessions].sort((a, b) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  return sorted[0];
}

// Get a specific session by ID
export function getSessionById(id: string): Session | null {
  const { sessions } = getSessions();
  return sessions.find(s => s.id === id) || null;
}

// Delete a session
export function deleteSession(id: string): void {
  const data = getSessions();
  data.sessions = data.sessions.filter(s => s.id !== id);
  if (data.activeSessionId === id) {
    data.activeSessionId = data.sessions[0]?.id || null;
  }
  saveSessions(data);
}

// Clear all sessions
export function clearAllSessions(): void {
  saveSessions({ sessions: [], activeSessionId: null });
}

// Set active session ID
export function setActiveSessionId(id: string | null): void {
  const data = getSessions();
  data.activeSessionId = id;
  saveSessions(data);
}

// Format date for display
export function formatSaveDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return 'Unknown date';
  }
}

// Get session that would be removed if a new one is added
export function getSessionToRemove(): Session | null {
  const { sessions } = getSessions();
  if (sessions.length < MAX_SESSIONS) return null;
  
  // Sort by savedAt and get the oldest
  const sorted = [...sessions].sort((a, b) => 
    new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
  );
  return sorted[0];
}

// Check if adding a new session would exceed limit
export function wouldExceedLimit(currentSessionId: string | null): boolean {
  const { sessions } = getSessions();
  // If we're updating an existing session, no problem
  if (currentSessionId && sessions.some(s => s.id === currentSessionId)) {
    return false;
  }
  // If adding new, check if at limit
  return sessions.length >= MAX_SESSIONS;
}

export function useAutoSave(
  tree: TreeState, 
  enabled: boolean = true,
  title: string = 'Untitled'
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pendingSessionToRemove, setPendingSessionToRemove] = useState<Session | null>(null);
  const treeRef = useRef(tree);
  const titleRef = useRef(title);
  // Track if we're pending a new session creation (to skip initialization)
  const pendingNewSessionRef = useRef(false);
  
  // Keep refs updated
  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Initialize or get current session ID
  useEffect(() => {
    if (!enabled) return;
    
    // Skip initialization if we're about to create a new session
    if (pendingNewSessionRef.current) {
      return;
    }
    
    const data = getSessions();
    if (data.activeSessionId) {
      setCurrentSessionId(data.activeSessionId);
    } else if (data.sessions.length > 0) {
      // Use the most recent session
      const latest = getLatestSession();
      if (latest) {
        setCurrentSessionId(latest.id);
        setActiveSessionId(latest.id);
      }
    }
  }, [enabled]);
  
  // Clear current session (used when loading shared trees)
  const clearCurrentSession = useCallback(() => {
    setCurrentSessionId(null);
    pendingNewSessionRef.current = true;
  }, []);

  const saveTree = useCallback((createNew: boolean = false, forceRemove: boolean = false): string | null => {
    if (!enabled) return null;
    
    try {
      const data = getSessions();
      const now = new Date().toISOString();
      
      let sessionId = currentSessionId;
      const isNewSession = createNew || !sessionId || !data.sessions.some(s => s.id === sessionId);
      
      // Check if we need to remove a session
      if (isNewSession && data.sessions.length >= MAX_SESSIONS && !forceRemove) {
        // Get the oldest session that would be removed
        const sorted = [...data.sessions].sort((a, b) => 
          new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
        );
        setPendingSessionToRemove(sorted[0]);
        return null; // Don't save yet, wait for user decision
      }
      
      // Create new session if needed
      if (isNewSession) {
        sessionId = generateSessionId();
        setCurrentSessionId(sessionId);
      }
      
      const newSession: Session = {
        id: sessionId!,
        savedAt: now,
        title: titleRef.current || 'Untitled',
        tree: {
          rootId: treeRef.current.rootId,
          nodes: treeRef.current.nodes,
        },
      };
      
      // Find and update existing session or add new one
      const existingIndex = data.sessions.findIndex(s => s.id === sessionId);
      if (existingIndex >= 0) {
        data.sessions[existingIndex] = newSession;
      } else {
        data.sessions.unshift(newSession);
      }
      
      // Keep only MAX_SESSIONS
      if (data.sessions.length > MAX_SESSIONS) {
        // Sort by savedAt and keep the most recent
        data.sessions.sort((a, b) => 
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        data.sessions = data.sessions.slice(0, MAX_SESSIONS);
      }
      
      data.activeSessionId = sessionId;
      saveSessions(data);
      setLastSaved(new Date());
      setPendingSessionToRemove(null);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to autosave:', error);
      return null;
    }
  }, [enabled, currentSessionId]);

  // Create a new session (for "New" button)
  const createNewSession = useCallback((forceRemove: boolean = false) => {
    const result = saveTree(true, forceRemove);
    // Clear the pending flag after creating the session
    pendingNewSessionRef.current = false;
    return result;
  }, [saveTree]);

  // Switch to a different session
  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    setActiveSessionId(sessionId);
  }, []);

  // Dismiss the pending session removal (cancel save)
  const dismissPendingRemoval = useCallback(() => {
    setPendingSessionToRemove(null);
  }, []);

  // Confirm removal and proceed with save
  const confirmRemoval = useCallback(() => {
    saveTree(true, true);
  }, [saveTree]);

  // Update title for current session
  const updateSessionTitle = useCallback((newTitle: string) => {
    if (!currentSessionId) return;
    
    const data = getSessions();
    const sessionIndex = data.sessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex >= 0) {
      data.sessions[sessionIndex] = {
        ...data.sessions[sessionIndex],
        title: newTitle,
      };
      saveSessions(data);
    }
  }, [currentSessionId]);

  // Set up autosave interval
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => saveTree(false), AUTOSAVE_INTERVAL);
    
    // Also save on first mount (after a brief delay to let tree initialize)
    const timeoutId = setTimeout(() => saveTree(false), 1000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [enabled, saveTree]);

  // Save before page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      // Force save on unload, removing oldest if needed
      saveTree(false, true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, saveTree]);

  return {
    lastSaved,
    currentSessionId,
    pendingSessionToRemove,
    saveNow: () => saveTree(false),
    createNewSession,
    switchSession,
    getSessions,
    deleteSession,
    dismissPendingRemoval,
    confirmRemoval,
    updateSessionTitle,
    clearCurrentSession,
  };
}
