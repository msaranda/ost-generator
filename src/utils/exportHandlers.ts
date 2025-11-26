import html2canvas from 'html2canvas';
import { TreeState, ExportData, OSTNode, NODE_SIZES, NodeType } from '../types';
import { Session } from '../hooks/useAutoSave';

// Export a session to JSON format
export function exportSessionToJSON(session: Session): void {
  const exportData: ExportData = {
    version: '1.0',
    created: session.savedAt,
    modified: session.savedAt,
    tree: session.tree,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  // Use session title for filename, sanitize it
  const sanitizedTitle = session.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  link.download = `${sanitizedTitle}-${Date.now()}.json`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}

// Export tree to JSON format
export function exportToJSON(tree: TreeState, title?: string): void {
  const exportData: ExportData = {
    version: '1.0',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    tree: {
      rootId: tree.rootId,
      nodes: tree.nodes,
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  // Use title for filename if provided
  if (title) {
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    link.download = `${sanitizedTitle}-${Date.now()}.json`;
  } else {
    link.download = `ost-${Date.now()}.json`;
  }
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}

// Calculate bounding box of all nodes for image export
function calculateBoundingBox(nodes: Record<string, OSTNode>): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const nodeList = Object.values(nodes);
  
  if (nodeList.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodeList) {
    const size = NODE_SIZES[node.type as NodeType] || NODE_SIZES.opportunity;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Export canvas to JPG image
export async function exportToJPG(
  canvasElement: HTMLElement,
  nodes: Record<string, OSTNode>
): Promise<void> {
  const bbox = calculateBoundingBox(nodes);
  const padding = 50;
  
  try {
    // Find the React Flow viewport element
    const viewport = canvasElement.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      throw new Error('Could not find React Flow viewport');
    }

    // Get the current transform to restore later
    const originalTransform = viewport.style.transform;
    
    // Create a temporary wrapper to capture
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${bbox.width + padding * 2}px;
      height: ${bbox.height + padding * 2}px;
      background: #ffffff;
      z-index: -9999;
      overflow: hidden;
    `;
    
    // Clone the viewport
    const viewportClone = viewport.cloneNode(true) as HTMLElement;
    
    // Set the transform to position nodes correctly in the capture area
    viewportClone.style.transform = `translate(${-bbox.minX + padding}px, ${-bbox.minY + padding}px) scale(1)`;
    
    wrapper.appendChild(viewportClone);
    document.body.appendChild(wrapper);

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture with html2canvas
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      foreignObjectRendering: true,
    });

    // Clean up the temporary wrapper
    document.body.removeChild(wrapper);

    // Restore original transform (should still be intact, but just in case)
    viewport.style.transform = originalTransform;

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `ost-${Date.now()}.jpg`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  } catch (error) {
    console.error('Failed to export image:', error);
    throw new Error('Failed to export image - try again');
  }
}

// Read imported JSON file
export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json);
      } catch {
        reject(new Error('Invalid JSON file format'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

