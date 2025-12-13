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
    children: string[] = [],
    metadata?: Record<string, string[]>,
    description?: string
  ): OSTNode {
    return {
      id: uuidv4(),
      type,
      content,
      parentId,
      children,
      position: { x: 0, y: 0 },
      color: '#FFFFFF',
      metadata,
      description,
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

  it('should serialize metadata fields correctly', () => {
    const rootNode = createNode('outcome', 'Test outcome');
    const oppNode = createNode('opportunity', 'Test opportunity', rootNode.id, [], {
      'Evidence': ['65% of churned users never used key features'],
      'Supporting Data': ['Average feature adoption: 23%'],
      'Problem': ['Users can\'t find features'],
    });
    
    rootNode.children.push(oppNode.id);
    
    const tree: TreeState = {
      rootId: rootNode.id,
      nodes: { [rootNode.id]: rootNode, [oppNode.id]: oppNode },
      selectedNodeId: null,
    };

    const result = serializeTree(tree);
    
    expect(result.text).toContain('Evidence: 65% of churned users never used key features');
    expect(result.text).toContain('Supporting Data: Average feature adoption: 23%');
    expect(result.text).toContain('Problem: Users can\'t find features');
  });

  it('should serialize multiple instances of the same metadata type', () => {
    const rootNode = createNode('outcome', 'Test outcome');
    const oppNode = createNode('opportunity', 'Test opportunity', rootNode.id, [], {
      'Evidence': ['First evidence', 'Second evidence', 'Third evidence'],
    });
    
    rootNode.children.push(oppNode.id);
    
    const tree: TreeState = {
      rootId: rootNode.id,
      nodes: { [rootNode.id]: rootNode, [oppNode.id]: oppNode },
      selectedNodeId: null,
    };

    const result = serializeTree(tree);
    
    const evidenceLines = result.text.split('\n').filter(line => line.includes('Evidence:'));
    expect(evidenceLines).toHaveLength(3);
    expect(evidenceLines[0]).toContain('First evidence');
    expect(evidenceLines[1]).toContain('Second evidence');
    expect(evidenceLines[2]).toContain('Third evidence');
  });

  it('should maintain correct order: content → metadata → description → children', () => {
    const rootNode = createNode('outcome', 'Test outcome');
    const oppNode = createNode(
      'opportunity',
      'Test opportunity',
      rootNode.id,
      [],
      { 'Evidence': ['Some evidence'] },
      'Quoted description'
    );
    const solNode = createNode('solution', 'Test solution', oppNode.id);
    
    rootNode.children.push(oppNode.id);
    oppNode.children.push(solNode.id);
    
    const tree: TreeState = {
      rootId: rootNode.id,
      nodes: { [rootNode.id]: rootNode, [oppNode.id]: oppNode, [solNode.id]: solNode },
      selectedNodeId: null,
    };

    const result = serializeTree(tree);
    const lines = result.text.split('\n');
    
    const oppIndex = lines.findIndex(line => line.includes('OP: Test opportunity'));
    const evidenceIndex = lines.findIndex(line => line.includes('Evidence:'));
    const descriptionIndex = lines.findIndex(line => line.includes('Quoted description'));
    const solutionIndex = lines.findIndex(line => line.includes('S: Test solution'));
    
    expect(oppIndex).toBeLessThan(evidenceIndex);
    expect(evidenceIndex).toBeLessThan(descriptionIndex);
    expect(descriptionIndex).toBeLessThan(solutionIndex);
  });
});
