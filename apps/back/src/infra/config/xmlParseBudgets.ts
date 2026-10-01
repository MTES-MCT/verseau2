import type { ConfigService } from '@nestjs/config';
import { DEFAULT_XML_PARSE_BUDGETS, type XmlParseBudgets } from '@lib/parser';

/** The same effective policy applies to every worker parse and the browser recap. */
export function resolveXmlParseBudgets(config: ConfigService): XmlParseBudgets {
  const positiveInt = (key: string, fallback: number): number => {
    const value = Number(config.get<string | number>(key));
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  };

  return {
    maxElements: positiveInt('XML_PARSE_MAX_ELEMENTS', DEFAULT_XML_PARSE_BUDGETS.maxElements),
    maxDepth: positiveInt('XML_PARSE_MAX_DEPTH', DEFAULT_XML_PARSE_BUDGETS.maxDepth),
    maxTextLength: positiveInt('XML_PARSE_MAX_TEXT_LENGTH', DEFAULT_XML_PARSE_BUDGETS.maxTextLength),
  };
}
