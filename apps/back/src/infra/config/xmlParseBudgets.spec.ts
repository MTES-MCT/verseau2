import { ConfigService } from '@nestjs/config';
import { DEFAULT_XML_PARSE_BUDGETS } from '@lib/parser';
import { getDepotXmlParseBudgets } from '@lib/dossier';
import { resolveXmlParseBudgets } from './xmlParseBudgets';

describe('resolveXmlParseBudgets', () => {
  it('returns all defaults when overrides are absent', () => {
    expect(resolveXmlParseBudgets(new ConfigService({}))).toEqual(DEFAULT_XML_PARSE_BUDGETS);
  });

  it.each(['', ' ', 'invalid', '0', '-1', '1.5', 'Infinity', 'NaN', '9007199254740992'])(
    'retains bounded defaults for invalid override %j',
    (value) => {
      const budgets = resolveXmlParseBudgets(
        new ConfigService({
          XML_PARSE_MAX_ELEMENTS: value,
          XML_PARSE_MAX_DEPTH: value,
          XML_PARSE_MAX_TEXT_LENGTH: value,
        }),
      );
      expect(budgets).toEqual(DEFAULT_XML_PARSE_BUDGETS);
      expect(getDepotXmlParseBudgets.response.parse(budgets)).toEqual(budgets);
    },
  );

  it.each([
    ['2500000', '80', '12000000'],
    ['10', '2', '100'],
  ])('honors both raised and lowered overrides (%s, %s, %s)', (elements, depth, text) => {
    const budgets = resolveXmlParseBudgets(
      new ConfigService({
        XML_PARSE_MAX_ELEMENTS: elements,
        XML_PARSE_MAX_DEPTH: depth,
        XML_PARSE_MAX_TEXT_LENGTH: text,
      }),
    );
    expect(budgets).toEqual({ maxElements: Number(elements), maxDepth: Number(depth), maxTextLength: Number(text) });
    expect(getDepotXmlParseBudgets.response.parse(budgets)).toEqual(budgets);
  });

  it('keeps other budgets when only one is overridden', () => {
    expect(resolveXmlParseBudgets(new ConfigService({ XML_PARSE_MAX_DEPTH: '80' }))).toEqual({
      ...DEFAULT_XML_PARSE_BUDGETS,
      maxDepth: 80,
    });
  });
});
