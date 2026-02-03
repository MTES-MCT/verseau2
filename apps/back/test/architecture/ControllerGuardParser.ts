import * as fs from 'fs';
import {
  extractMethodName,
  findMethodSignatureIndex,
  findLastMethodBoundary,
  hasDecoratorInRange,
} from './TypeScriptSourceHelper';

export interface Endpoint {
  methodName: string;
  /** Character index of the HTTP decorator (@Get, @Post, etc.) in the source file */
  index: number;
}

/** Regex pattern to match @UseGuards decorator */
const USE_GUARDS_PATTERN = /@UseGuards\s*\(/m;

/**
 * Parses a NestJS controller source file to extract guard and endpoint information.
 */
export class ControllerGuardParser {
  private readonly sourceCode: string;

  constructor(filePath: string) {
    this.sourceCode = fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Checks whether the controller class has a @UseGuards decorator at class level.
   * Handles @UseGuards placed before or after @Controller.
   */
  hasClassLevelGuard(): boolean {
    const classDeclarationMatch = this.sourceCode.match(/([\s\S]*?)export\s+class\s+\w+/m);
    const classDecorators = classDeclarationMatch ? classDeclarationMatch[1] : '';
    return /@Controller\s*\(/m.test(classDecorators) && USE_GUARDS_PATTERN.test(classDecorators);
  }

  /**
   * Extracts all HTTP endpoints from the controller with their method names.
   *
   * Method names are identified by looking for the first lowercase identifier after
   * the HTTP decorator, which distinguishes them from decorator names (uppercase).
   */
  findEndpoints(): Endpoint[] {
    const endpointRegex = /@(Get|Post|Put|Patch|Delete|Options|Head|All)\s*\([^)]*\)/g;
    const endpoints: Endpoint[] = [];

    let match: RegExpExecArray | null;
    while ((match = endpointRegex.exec(this.sourceCode)) !== null) {
      const decoratorEndIndex = match.index + match[0].length;
      endpoints.push({
        methodName: extractMethodName(this.sourceCode, decoratorEndIndex),
        index: match.index,
      });
    }

    return endpoints;
  }

  /**
   * Checks whether an endpoint has a @UseGuards decorator in its decorator block.
   *
   * The decorator block spans from the previous method boundary (last `}` or `{`)
   * to the method signature. This covers @UseGuards placed before or after the
   * HTTP decorator (e.g. both `@UseGuards() @Get()` and `@Get() @UseGuards()`).
   */
  endpointHasGuard(endpoint: Endpoint): boolean {
    const lastMethodBoundary = findLastMethodBoundary(this.sourceCode, endpoint.index);
    const methodSigIndex = findMethodSignatureIndex(this.sourceCode, endpoint.index);

    return hasDecoratorInRange(this.sourceCode, USE_GUARDS_PATTERN, lastMethodBoundary + 1, methodSigIndex);
  }
}
