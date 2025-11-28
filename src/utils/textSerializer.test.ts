import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { serializeTree } from './textSerializer';
import { TreeState, OSTNode, NodeType } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Feature: code-editor-modernization, Property 18: Serializer remains pure
 * Validates: Requirements 13.4
 * 
 * For any two calls to serializeTree with the same tree structure, 
 * the output should be identical (referential transparency)
 */
describe('Property 18: Serializer remains pure', () => {
  // Helper to create a valid node
  function createNode(
    type: NodeType,
    content: string,
    parentId: string | null = null,
    children: string[] = []
  ): OSTNode {
    return {
      id: uuidv4(),
      type,
      content,
      parentId,
      children,
      position: { x: 0, y: 0 },
      color: '#FFFFFF',
    };
  }

  it('should return identical results for the same tree structure (referential transparency)', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary tree structures
        fc.record({
          outcomeContent: fc.string({ minLength: 1, maxLength: 50 }),
          opportunities: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 50 }),
              solutions: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }),
            }),
            { maxLength: 3 }
          ),
        }),
        (treeData) => {
          // Build a tree structure
          const rootNode = createNode('outcome', treeData.outcomeContent);
          const nodes: Record<string, OSTNode> = {
            [rootNode.id]: rootNode,
          };

          for (const opp of treeData.opportunities) {
            const oppNode = createNode('opportunity', opp.content, rootNode.id);
            nodes[oppNode.id] = oppNode;
            rootNode.children.push(oppNode.id);

            for (const sol of opp.solutions) {
              const solNode = createNode('solution', sol, oppNode.id);
              nodes[solNode.id] = solNode;
              oppNode.children.push(solNode.id);
            }
          }

          const tree: TreeState = {
            rootId: rootNode.id,
            nodes,
            selectedNodeId: null,
          };

          // Call serializeTree twice with the same tree
          const result1 = serializeTree(tree);
          const result2 = serializeTree(tree);

          // Results should be identical
          expect(result1.text).toBe(result2.text);
          expect(result1.nodeLineMap).toEqual(result2.nodeLineMap);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  it('should return identical results with different serialization options', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.boolean(),
        fc.boolean(),
        (content, useShorthand, preserveDescriptions) => {
          // Create a simple tree
          const rootNode = createNode('outcome', content);
          const tree: TreeState = {
            rootId: rootNode.id,
            nodes: { [rootNode.id]: rootNode },
            selectedNodeId: null,
          };

          const options = { useShorthand, preserveDescriptions };

          // Call serializeTree twice with the same options
          const result1 = serializeTree(tree, options);
          const result2 = serializeTree(tree, options);

          // Results should be identical
          expect(result1.text).toBe(result2.text);
          expect(result1.nodeLineMap).toEqual(result2.nodeLineMap);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return identical results for trees with descriptions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (content, description) => {
          // Create a tree with description
          const rootNode = createNode('outcome', content);
          rootNode.description = description;
          
          const tree: TreeState = {
            rootId: rootNode.id,
            nodes: { [rootNode.id]: rootNode },
            selectedNodeId: null,
          };

          // Call serializeTree twice
          const result1 = serializeTree(tree);
          const result2 = serializeTree(tree);

          // Results should be identical
          expect(result1.text).toBe(result2.text);
          expect(result1.nodeLineMap).toEqual(result2.nodeLineMap);
        }
      ),
      { numRuns: 100 }
    );
  });
});
