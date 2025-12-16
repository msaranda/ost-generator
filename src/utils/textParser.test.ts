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
              expect(node1.metadata).toEqual(node2.metadata);
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

  it('should parse metadata fields correctly', () => {
    const text = `O: Reduce customer churn
  OP: Users struggle with feature discovery
    Evidence: 65% of churned users never used key features
    Supporting Data: Average feature adoption: 23%
    Problem: Users can't find features
    S: Guided onboarding flow`;

    const result = parseText(text);
    
    expect(result.success).toBe(true);
    if (result.tree) {
      const nodes = Object.values(result.tree.nodes);
      const opportunityNode = nodes.find(n => n.type === 'opportunity');
      
      expect(opportunityNode).toBeDefined();
      expect(opportunityNode?.metadata).toBeDefined();
      expect(opportunityNode?.metadata?.['Evidence']).toEqual(['65% of churned users never used key features']);
      expect(opportunityNode?.metadata?.['Supporting Data']).toEqual(['Average feature adoption: 23%']);
      expect(opportunityNode?.metadata?.['Problem']).toEqual(['Users can\'t find features']);
    }
  });

  it('should handle multiple instances of the same metadata type', () => {
    const text = `O: Test outcome
  OP: Test opportunity
    Evidence: First evidence
    Evidence: Second evidence
    Evidence: Third evidence`;

    const result = parseText(text);
    
    expect(result.success).toBe(true);
    if (result.tree) {
      const nodes = Object.values(result.tree.nodes);
      const opportunityNode = nodes.find(n => n.type === 'opportunity');
      
      expect(opportunityNode).toBeDefined();
      expect(opportunityNode?.metadata?.['Evidence']).toEqual([
        'First evidence',
        'Second evidence',
        'Third evidence'
      ]);
    }
  });

  it('should distinguish between metadata and quoted descriptions', () => {
    const text = `O: Test outcome
  OP: Test opportunity
    Evidence: This is evidence
    "This is a quoted description"
    Problem: This is a problem`;

    const result = parseText(text);
    
    expect(result.success).toBe(true);
    if (result.tree) {
      const nodes = Object.values(result.tree.nodes);
      const opportunityNode = nodes.find(n => n.type === 'opportunity');
      
      expect(opportunityNode).toBeDefined();
      expect(opportunityNode?.metadata?.['Evidence']).toEqual(['This is evidence']);
      expect(opportunityNode?.metadata?.['Problem']).toEqual(['This is a problem']);
      expect(opportunityNode?.description).toBe('This is a quoted description');
    }
  });

  it('should parse sub-notes as children, not metadata', () => {
    const text = `O: Test outcome
  OP: Test opportunity
    Evidence: This is evidence
    SU: This is a sub-opportunity
      Problem: Sub-opportunity problem
      S: This is a solution`;

    const result = parseText(text);
    
    expect(result.success).toBe(true);
    if (result.tree) {
      const nodes = Object.values(result.tree.nodes);
      const opportunityNode = nodes.find(n => n.type === 'opportunity');
      const subOpportunityNode = nodes.find(n => n.type === 'sub-opportunity');
      const solutionNode = nodes.find(n => n.type === 'solution');
      
      expect(opportunityNode).toBeDefined();
      expect(opportunityNode?.metadata?.['Evidence']).toEqual(['This is evidence']);
      // Sub-opportunity should be a child, not metadata
      expect(opportunityNode?.children.length).toBeGreaterThan(0);
      expect(opportunityNode?.children).toContain(subOpportunityNode?.id);
      expect(subOpportunityNode).toBeDefined();
      expect(subOpportunityNode?.content).toBe('This is a sub-opportunity');
      expect(subOpportunityNode?.parentId).toBe(opportunityNode?.id);
      // Sub-opportunity should have its own metadata
      expect(subOpportunityNode?.metadata?.['Problem']).toEqual(['Sub-opportunity problem']);
      // Solution should be a child of sub-opportunity
      expect(solutionNode).toBeDefined();
      expect(solutionNode?.parentId).toBe(subOpportunityNode?.id);
      expect(subOpportunityNode?.children).toContain(solutionNode?.id);
    }
  });
});
