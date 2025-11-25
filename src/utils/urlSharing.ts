import pako from 'pako';
import { TreeState } from '../types';

// Data structure for URL encoding (excludes session-specific UI state)
interface ShareableTreeData {
  rootId: string;
  nodes: TreeState['nodes'];
}

/**
 * Compress and encode tree data into a URL-safe string
 */
export function encodeTreeData(tree: TreeState): string {
  try {
    // Only encode the tree structure, not session-specific state
    const shareableData: ShareableTreeData = {
      rootId: tree.rootId,
      nodes: tree.nodes,
    };

    // 1. Convert to JSON string
    const json = JSON.stringify(shareableData);

    // 2. Compress using gzip (pako.deflate)
    const compressed = pako.deflate(json, { level: 9 });

    // 3. Convert to base64
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)));

    // 4. Make URL-safe (replace characters that break URLs)
    const urlSafe = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // Remove padding

    return urlSafe;
  } catch (error) {
    console.error('Error encoding tree data:', error);
    throw new Error('Failed to encode tree data');
  }
}

/**
 * Decode and decompress tree data from URL string
 */
export function decodeTreeData(encodedData: string): ShareableTreeData {
  try {
    // 1. Reverse URL-safe encoding
    let base64 = encodedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // 2. Add padding back if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // 3. Decode from base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. Decompress using pako
    const decompressed = pako.inflate(bytes, { to: 'string' });

    // 5. Parse JSON back to object
    const treeData = JSON.parse(decompressed) as ShareableTreeData;

    return treeData;
  } catch (error) {
    console.error('Error decoding tree data:', error);
    throw new Error('Failed to decode tree data. The URL may be corrupted.');
  }
}

/**
 * Generate a shareable URL for the current tree
 */
export function generateShareableUrl(tree: TreeState): string {
  const encoded = encodeTreeData(tree);
  const baseUrl = window.location.origin + window.location.pathname;
  const fullUrl = `${baseUrl}?tree=${encoded}`;

  // Warn if URL is very long
  if (fullUrl.length > 2000) {
    console.warn(`URL is ${fullUrl.length} characters. May not work in all contexts.`);
  }

  if (fullUrl.length > 100000) {
    throw new Error('Tree data is too large for URL sharing.');
  }

  return fullUrl;
}

/**
 * Check if current URL contains shared tree data
 */
export function hasSharedTree(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('tree');
}

/**
 * Load tree data from current URL if present
 * Returns a TreeState with selectedNodeId set to null
 */
export function loadTreeFromUrl(): TreeState | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('tree');

  if (!encoded) {
    return null;
  }

  try {
    const shareableData = decodeTreeData(encoded);
    // Convert to full TreeState with null selectedNodeId
    return {
      rootId: shareableData.rootId,
      nodes: shareableData.nodes,
      selectedNodeId: null,
    };
  } catch (error) {
    console.error('Failed to load tree from URL:', error);
    throw error;
  }
}

/**
 * Clear the tree parameter from the URL without page reload
 */
export function clearTreeFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('tree');
  window.history.replaceState({}, '', url.pathname + url.search);
}

