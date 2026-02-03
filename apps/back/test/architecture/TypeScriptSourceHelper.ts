/**
 * Helper utilities for parsing TypeScript source code patterns.
 * Used by architecture tests to analyze controller and decorator structures.
 */

/** Pattern to match method signatures: captures method name after optional async keyword */
const METHOD_SIGNATURE_PATTERN = /\n\s*(?:async\s+)?([a-z]\w*)\s*\(/;

/**
 * Extracts the method name from source code following a given position.
 * Looks for the first lowercase identifier followed by `(` which indicates a method.
 *
 * @param sourceCode - The full source code
 * @param startIndex - Position from which to search for the method name
 * @returns The method name, or 'unknown' if not found
 */
export function extractMethodName(sourceCode: string, startIndex: number): string {
  const afterPosition = sourceCode.substring(startIndex);
  const match = afterPosition.match(METHOD_SIGNATURE_PATTERN);
  return match ? match[1] : 'unknown';
}

/**
 * Finds the character index of the method signature following a given position.
 *
 * @param sourceCode - The full source code
 * @param startIndex - Position from which to search
 * @returns The index of the method signature, or the startIndex if not found
 */
export function findMethodSignatureIndex(sourceCode: string, startIndex: number): number {
  const afterPosition = sourceCode.substring(startIndex);
  const match = afterPosition.match(METHOD_SIGNATURE_PATTERN);
  return match ? startIndex + match.index! : startIndex;
}

/**
 * Finds the last method boundary (closing or opening brace) before a given position.
 * This is used to determine the start of a decorator block.
 *
 * @param sourceCode - The full source code
 * @param endIndex - Position up to which to search
 * @returns The index of the last brace, or -1 if not found
 */
export function findLastMethodBoundary(sourceCode: string, endIndex: number): number {
  const beforePosition = sourceCode.substring(0, endIndex);
  return Math.max(beforePosition.lastIndexOf('}'), beforePosition.lastIndexOf('{'));
}

/**
 * Checks if a decorator pattern exists within a given source code range.
 *
 * @param sourceCode - The full source code
 * @param decoratorPattern - Regex pattern for the decorator (e.g., /@UseGuards\s*\(/)
 * @param startIndex - Start of the range to search
 * @param endIndex - End of the range to search
 * @returns true if the decorator is found in the range
 */
export function hasDecoratorInRange(
  sourceCode: string,
  decoratorPattern: RegExp,
  startIndex: number,
  endIndex: number,
): boolean {
  const range = sourceCode.substring(startIndex, endIndex);
  return decoratorPattern.test(range);
}
