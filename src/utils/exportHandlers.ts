import html2canvas from 'html2canvas';
import { TreeState, ExportData, OSTNode, NODE_SIZES, NodeType } from '../types';

// Export tree to JSON format
export function exportToJSON(tree: TreeState): void {
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
  link.download = `ost-${Date.now()}.json`;
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

    // Get the current transform
    const originalTransform = viewport.style.transform;
    
    // Calculate new transform to show all nodes
    viewport.style.transform = `translate(${-bbox.minX + padding}px, ${-bbox.minY + padding}px) scale(1)`;

    // Wait for next frame to ensure transform is applied
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Capture with html2canvas
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2,
      useCORS: true,
      logging: false,
    });

    // Restore original transform
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

