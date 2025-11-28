import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import CodeMirrorEditor from './CodeMirrorEditor';

/**
 * Feature: code-editor-modernization, Property 1: Syntax highlighting applies correct colors to all prefix types
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 * 
 * For any line containing a node prefix (O:, OUTCOME:, OP:, OPP:, S:, SOL:, SU:, SUB:), 
 * the editor should apply the correct color decoration: yellow (#F9A825) for outcomes, 
 * blue (#1976D2) for opportunities, green (#388E3C) for solutions, 
 * and purple (#7B1FA2) for sub-opportunities
 */
describe('Property 1: Syntax highlighting applies correct colors to all prefix types', () => {
  it('should apply correct color classes to all prefix types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test cases with different prefix types
        fc.record({
          prefix: fc.oneof(
            fc.constant('O:'),
            fc.constant('OUTCOME:'),
            fc.constant('OP:'),
            fc.constant('OPP:'),
            fc.constant('S:'),
            fc.constant('SOL:'),
            fc.constant('SU:'),
            fc.constant('SUB:')
          ),
          indentation: fc.integer({ min: 0, max: 10 }).map(n => '  '.repeat(n)),
          content: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ prefix, indentation, content }) => {
          const text = `${indentation}${prefix} ${content}`;
          const onChange = vi.fn();

          const { container } = render(
            <CodeMirrorEditor
              value={text}
              diagnostics={[]}
              selectedLine={null}
              onChange={onChange}
            />
          );

          // Wait for CodeMirror to initialize and render
          await waitFor(() => {
            const editorContent = container.querySelector('.cm-content');
            expect(editorContent).toBeTruthy();
          }, { timeout: 2000 });

          // Determine expected class based on prefix
          let expectedClass: string;
          if (prefix === 'O:' || prefix === 'OUTCOME:') {
            expectedClass = 'cm-ost-outcome';
          } else if (prefix === 'OP:' || prefix === 'OPP:') {
            expectedClass = 'cm-ost-opportunity';
          } else if (prefix === 'S:' || prefix === 'SOL:') {
            expectedClass = 'cm-ost-solution';
          } else if (prefix === 'SU:' || prefix === 'SUB:') {
            expectedClass = 'cm-ost-sub-opportunity';
          } else {
            throw new Error(`Unexpected prefix: ${prefix}`);
          }

          // Check that the correct decoration class is applied
          await waitFor(() => {
            const decoratedElement = container.querySelector(`.${expectedClass}`);
            expect(decoratedElement).toBeTruthy();
            expect(decoratedElement?.textContent).toBe(prefix);
          }, { timeout: 2000 });
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  it('should apply correct colors to multiple lines with different prefixes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a tree structure with multiple node types
        fc.record({
          outcome: fc.string({ minLength: 1, maxLength: 30 }),
          opportunities: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 30 }),
              solutions: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 2 }),
            }),
            { minLength: 1, maxLength: 2 }
          ),
        }),
        async (treeData) => {
          // Build text with all prefix types
          let text = `O: ${treeData.outcome}\n`;
          
          for (const opp of treeData.opportunities) {
            text += `  OP: ${opp.content}\n`;
            for (const sol of opp.solutions) {
              text += `    S: ${sol}\n`;
            }
          }

          const onChange = vi.fn();

          const { container } = render(
            <CodeMirrorEditor
              value={text}
              diagnostics={[]}
              selectedLine={null}
              onChange={onChange}
            />
          );

          // Wait for CodeMirror to initialize
          await waitFor(() => {
            const editorContent = container.querySelector('.cm-content');
            expect(editorContent).toBeTruthy();
          }, { timeout: 2000 });

          // Check that all prefix types have their decorations
          await waitFor(() => {
            const outcomeElements = container.querySelectorAll('.cm-ost-outcome');
            const opportunityElements = container.querySelectorAll('.cm-ost-opportunity');
            const solutionElements = container.querySelectorAll('.cm-ost-solution');

            // Should have at least one of each type
            expect(outcomeElements.length).toBeGreaterThan(0);
            expect(opportunityElements.length).toBe(treeData.opportunities.length);
            
            const totalSolutions = treeData.opportunities.reduce(
              (sum, opp) => sum + opp.solutions.length, 
              0
            );
            expect(solutionElements.length).toBe(totalSolutions);
          }, { timeout: 2000 });
        }
      ),
      { numRuns: 50 } // Fewer runs for more complex test
    );
  });
});
