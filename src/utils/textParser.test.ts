import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseText } from './textParser';

/**
 * Feature: code-editor-modernization, Property 17: Parser remains pure
 * Validates: Requirements 13.1
 * 
 * For any two calls to parseText with the same input string, 
 * the output should be identical (referential transparency)
 */
describe('Property 17: Parser remains pure', () => {
  it('should return identical results for the same input (referential transparency)', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary text input
        fc.string(),
        (text) => {
          // Call parseText twice with the same input
          const result1 = parseText(text);
          const result2 = parseText(text);

          // Results should be identical
          expect(result1.success).toBe(result2.success);
          expect(result1.errors).toEqual(result2.errors);
          
          // If successful, tree structures should be identical
          if (result1.success && result2.success && result1.tree && result2.tree) {
            expect(result1.tree.rootId).toBe(result2.tree.rootId);
            expect(Object.keys(result1.tree.nodes).length).toBe(
              Object.keys(result2.tree.nodes).length
            );
            
            // Check that all nodes have the same structure (excluding IDs which are random)
            for (const nodeId in result1.tree.nodes) {
              const node1 = result1.tree.nodes[nodeId];
              const node2 = result2.tree.nodes[nodeId];
              
              expect(node2).toBeDefined();
              expect(node1.type).toBe(node2.type);
              expect(node1.content).toBe(node2.content);
              expect(node1.description).toBe(node2.description);
              expect(node1.children.length).toBe(node2.children.length);
            }
          }
          
          // Node line maps should be identical
          if (result1.nodeLineMap && result2.nodeLineMap) {
            expect(Object.keys(result1.nodeLineMap).length).toBe(
              Object.keys(result2.nodeLineMap).length
            );
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  it('should return identical results for valid OST tree text', () => {
    fc.assert(
      fc.property(
        // Generate valid OST tree structures
        fc.record({
          outcome: fc.string({ minLength: 1, maxLength: 50 }),
          opportunities: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 50 }),
              solutions: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }),
            }),
            { maxLength: 3 }
          ),
        }),
        (treeData) => {
          // Build valid OST text
          let text = `O: ${treeData.outcome}\n`;
          
          for (const opp of treeData.opportunities) {
            text += `  OP: ${opp.content}\n`;
            for (const sol of opp.solutions) {
              text += `    S: ${sol}\n`;
            }
          }

          // Call parseText twice
          const result1 = parseText(text);
          const result2 = parseText(text);

          // Results should be identical
          expect(result1.success).toBe(result2.success);
          expect(result1.errors).toEqual(result2.errors);
          
          if (result1.tree && result2.tree) {
            // Both should have the same number of nodes
            expect(Object.keys(result1.tree.nodes).length).toBe(
              Object.keys(result2.tree.nodes).length
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
