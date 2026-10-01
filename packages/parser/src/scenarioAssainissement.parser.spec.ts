import { addNameTagToXml, parseScenarioAssainissementXml } from './scenarioAssainissement.parser';
import { XmlParseBudgetError, XmlParseBudgetKind, DEFAULT_XML_PARSE_BUDGETS } from './xmlParseBudgets';
import { compliantXml } from './xml/compliant';
import { compliantXmlWithNomContact } from './xml/compliantWithNomContact';
import { nonCompliantXml } from './xml/nonCompliantBadStructure';
import fs from 'fs';
import path from 'path';

describe('Sandre Parser', () => {
  it('should parse the provided XML correctly', async () => {
    const result = await parseScenarioAssainissementXml(compliantXml);

    expect(result).toBeDefined();
    expect(result.ouvrages).toHaveLength(2);
    expect(result.systemesCollecte).toHaveLength(1);

    const ouvrage1 = result.ouvrages[0];
    expect(ouvrage1.cdOuvrageDepollution).toBe('codeOuvrageDepollution1');

    const ouvrage2 = result.ouvrages[1];
    expect(ouvrage2.cdOuvrageDepollution).toBe('codeOuvrageDepollution2');
    // expect(ouvrage2.nomOuvrageDepollution).toBe('Ouvrage Test 2');

    const systeme = result.systemesCollecte[0];
    expect(systeme.cdSystemeCollecte).toBe('SANDRE_SYSTEME_1');

    const locGlobalePointMesure = ouvrage2.pointMesure[0].locGlobalePointMesure;
    expect(locGlobalePointMesure).toBe('S7');
    expect(ouvrage2.pointMesure[0].prelevement[0].analyse[0].lqAna).toBe('12.5');
  });

  it('should throw an error when the XML is not compliant', async () => {
    await expect(parseScenarioAssainissementXml(nonCompliantXml)).rejects.toThrow();
  });

  it('should read the provided XML correctly', async () => {
    const xmlPath = path.join(__dirname, 'xml', '18.6_MO_anonymized.xml');
    const xml = fs.readFileSync(xmlPath, 'utf-8');
    const result = await parseScenarioAssainissementXml(xml);
    const ouvrage1 = result.ouvrages[0];
    expect(ouvrage1.cdOuvrageDepollution).toBe('CD_OUVRAGE_1');
    expect(ouvrage1.pointMesure[0].prelevement[0].cdSupport).toBe('3');
    expect(ouvrage1.pointMesure[0].prelevement[0].analyse[0].cdParametre).toBe('1552');
    expect(ouvrage1.pointMesure[0].prelevement[0].analyse[1].cdParametre).toBe('1553');

    expect(ouvrage1.pointMesure[1].numeroPointMesure).toBe('NUM_POINT_2');
    expect(ouvrage1.pointMesure[1].locGlobalePointMesure).toBe('A4');
    expect(ouvrage1.pointMesure[1].prelevement[0].cdSupport).toBe('3');
    expect(ouvrage1.pointMesure[1].prelevement[0].analyse[0].cdParametre).toBe('1552');
    expect(ouvrage1.pointMesure[0].prelevement[1].analyse[0].cdParametre).toBe('1552');

    expect(ouvrage1.pointMesure[2].numeroPointMesure).toBe('NUM_POINT_3');
    expect(ouvrage1.pointMesure[2].locGlobalePointMesure).toBe('A6');
    expect(ouvrage1.pointMesure[2].prelevement[0].cdSupport).toBe('31');
    expect(ouvrage1.pointMesure[2].prelevement[0].analyse[0].cdParametre).toBe('1799');
    expect(ouvrage1.pointMesure[2].prelevement[1].cdSupport).toBe('31');
    expect(ouvrage1.pointMesure[2].prelevement[1].analyse[0].cdParametre).toBe('1799');

    expect(ouvrage1.pointMesure[3].numeroPointMesure).toBe('NUM_POINT_4');
    expect(ouvrage1.pointMesure[3].locGlobalePointMesure).toBe('S11');

    const locGlobalePointMesure = ouvrage1.pointMesure[0].locGlobalePointMesure;
    expect(locGlobalePointMesure).toBe('A3');
    expect(result).toBeDefined();
  });
});

describe('addNameTagToXml', () => {
  const readContactFixture = (filename: string): string =>
    fs.readFileSync(path.join(__dirname, 'xml', 'contact', filename), 'utf-8');

  describe('insertion rules', () => {
    it('should create Emetteur and Contact in an empty Scenario', () => {
      const nomContact = 'Mon nom';
      const originalXml = `
    <Scenario>
    </Scenario>`;
      const expectedXml = `
    <Scenario>
      <Emetteur>
        <Contact>
          <NomContact>${nomContact}</NomContact>
        </Contact>
      </Emetteur>
    </Scenario>`;
      const xml = addNameTagToXml(originalXml, nomContact);
      expect(xml).toEqual(expectedXml);
    });

    it('should ignore Contact and NomContact outside the direct emitter contact path', () => {
      const originalXml = `<Scenario>
  <Emetteur>
    <Other><Contact><NomContact>nested</NomContact></Contact></Other>
  </Emetteur>
  <Destinataire><Contact><NomContact>recipient</NomContact></Contact></Destinataire>
</Scenario>`;
      const expectedXml = `<Scenario>
  <Emetteur>
    <Other><Contact><NomContact>nested</NomContact></Contact></Other>
    <Contact>
      <NomContact>Sender</NomContact>
    </Contact>
  </Emetteur>
  <Destinataire><Contact><NomContact>recipient</NomContact></Contact></Destinataire>
</Scenario>`;

      expect(addNameTagToXml(originalXml, 'Sender')).toBe(expectedXml);
    });

    it('should only modify the first emitter, even when a later emitter has a name', () => {
      const originalXml = `<Scenario>
  <Emetteur/>
  <Emetteur>
    <Contact>
      <NomContact>Later</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`;
      const expectedXml = `<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
  <Emetteur>
    <Contact>
      <NomContact>Later</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`;

      expect(addNameTagToXml(originalXml, 'NOM')).toBe(expectedXml);
    });

    it('should leave well-formed XML without a Scenario or root Emetteur unchanged', () => {
      const originalXml = '<Root><!-- <Scenario/> --><Other/></Root>';

      expect(addNameTagToXml(originalXml, 'NOM')).toBe(originalXml);
    });
  });

  describe('formatting', () => {
    it('should preserve blank lines and sibling indentation when adding the NomContact tag', () => {
      const nomContact = 'Pierre Dupont';
      const originalXml = `
        <Emetteur>
            <CdIntervenant schemeAgencyID="SIRET">57202552611737</CdIntervenant>
            <NomIntervenant>Bretagne Ouest</NomIntervenant>

        </Emetteur>`;

      const expectedXml = `
        <Emetteur>
            <CdIntervenant schemeAgencyID="SIRET">57202552611737</CdIntervenant>
            <NomIntervenant>Bretagne Ouest</NomIntervenant>

            <Contact>
                <NomContact>${nomContact}</NomContact>
            </Contact>
        </Emetteur>`;

      const xml = addNameTagToXml(originalXml, nomContact);
      expect(xml).toEqual(expectedXml);
    });

    describe.each([
      { format: 'four spaces and LF', fixture: 'spaces-lf.xml', indent: '    ', lineEnding: '\n' },
      { format: 'four spaces and CRLF', fixture: 'spaces-crlf.xml', indent: '    ', lineEnding: '\r\n' },
      { format: 'tabs and LF', fixture: 'tabs-lf.xml', indent: '\t', lineEnding: '\n' },
      { format: 'tabs and CRLF', fixture: 'tabs-crlf.xml', indent: '\t', lineEnding: '\r\n' },
    ])('$format', ({ fixture, indent, lineEnding }) => {
      // Display XML with two-space nesting, then apply this case's byte format.
      const formatXml = (xml: string): string =>
        xml.replace(/^ +/gm, (spaces) => indent.repeat(spaces.length / 2)).replaceAll('\n', lineEnding);
      const expectedXml = readContactFixture(fixture);

      it('should match the expected XML fixture when Contact is missing', () => {
        const originalXml = expectedXml.replace(/^[ \t]*<Contact>[\s\S]*?<\/Contact>\r?\n/m, '');

        expect(addNameTagToXml(originalXml, 'TEST User')).toBe(expectedXml);
      });

      it('should match the expected XML fixture when NomContact is missing', () => {
        const originalXml = expectedXml.replace(/^[ \t]*<NomContact>[^<]*<\/NomContact>\r?\n/m, '');

        expect(addNameTagToXml(originalXml, 'TEST User')).toBe(expectedXml);
      });

      it('should leave existing contact values and whitespace unchanged', () => {
        expect(addNameTagToXml(expectedXml, 'Another name')).toBe(expectedXml);
      });

      it('should follow sibling indentation when inserting Emetteur before Destinataire', () => {
        const originalXml = formatXml(`<Scenario>
  <Destinataire/>
  <Destinataire></Destinataire>
</Scenario>`);
        const expected = formatXml(`<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>TEST User</NomContact>
    </Contact>
  </Emetteur>
  <Destinataire/>
  <Destinataire></Destinataire>
</Scenario>`);

        expect(addNameTagToXml(originalXml, 'TEST User')).toBe(expected);
      });

      it('should follow sibling indentation when inserting Emetteur into Scenario', () => {
        const originalXml = formatXml(`<Scenario>

  <CodeScenario>FCT_ASSAIN</CodeScenario>
</Scenario>`);
        const expected = formatXml(`<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>TEST User</NomContact>
    </Contact>
  </Emetteur>

  <CodeScenario>FCT_ASSAIN</CodeScenario>
</Scenario>`);

        expect(addNameTagToXml(originalXml, 'TEST User')).toBe(expected);
      });
    });

    it('should use the local sibling indentation when it differs from the rest of the document', () => {
      const originalXml = `<Scenario>
  <Emetteur>
      <CdIntervenant>123</CdIntervenant>
  </Emetteur>
</Scenario>`;
      const expectedXml = `<Scenario>
  <Emetteur>
      <CdIntervenant>123</CdIntervenant>
      <Contact>
          <NomContact>Sender</NomContact>
      </Contact>
  </Emetteur>
</Scenario>`;

      expect(addNameTagToXml(originalXml, 'Sender')).toBe(expectedXml);
    });

    it('should insert into compact XML without modifying unrelated content', () => {
      const originalXml = readContactFixture('compact.input.xml');
      const expectedXml = readContactFixture('compact.expected.xml');

      expect(addNameTagToXml(originalXml, 'NOM')).toBe(expectedXml);
    });
  });

  describe('XML edge cases', () => {
    it('should ignore tag-like text in comments and CDATA and retain original source bytes', () => {
      const originalXml = `<?xml version="1.0"?>
<Scenario>
  <!-- <Emetteur><Contact><NomContact>fake</NomContact></Contact></Emetteur></Scenario> -->
  <Description><![CDATA[<Emetteur><Contact><NomContact>fake</NomContact></Contact></Emetteur></Scenario>]]></Description>
  <Emetteur label='a > b &amp; 😀'>
    <Contact id='original'>
      <Tel>&#48;1</Tel>

    </Contact>
  </Emetteur>
</Scenario>`;
      const expectedXml = `<?xml version="1.0"?>
<Scenario>
  <!-- <Emetteur><Contact><NomContact>fake</NomContact></Contact></Emetteur></Scenario> -->
  <Description><![CDATA[<Emetteur><Contact><NomContact>fake</NomContact></Contact></Emetteur></Scenario>]]></Description>
  <Emetteur label='a > b &amp; 😀'>
    <Contact id='original'>
      <Tel>&#48;1</Tel>

      <NomContact>A &amp; B &lt;C&gt; ]]&gt;</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`;

      expect(addNameTagToXml(originalXml, 'A & B <C> ]]>')).toBe(expectedXml);
    });

    it.each([
      {
        parent: 'Scenario',
        originalXml: '<Scenario id="1" />',
        expectedXml: `<Scenario id="1" >
  <Emetteur>
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`,
      },
      {
        parent: 'Emetteur',
        originalXml: `<Scenario>
  <Emetteur id="1"/>
</Scenario>`,
        expectedXml: `<Scenario>
  <Emetteur id="1">
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`,
      },
      {
        parent: 'Contact',
        originalXml: readContactFixture('self-closing-contact.input.xml'),
        expectedXml: readContactFixture('self-closing-contact.expected.xml'),
      },
    ])('should expand a self-closing $parent without rewriting attributes', ({ originalXml, expectedXml }) => {
      expect(addNameTagToXml(originalXml, 'NOM')).toBe(expectedXml);
    });

    it.each([
      {
        context: 'Scenario',
        originalXml: '<s:Scenario xmlns:s="urn:sandre"/>',
        expectedXml: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <s:Contact>
      <s:NomContact>NOM</s:NomContact>
    </s:Contact>
  </s:Emetteur>
</s:Scenario>`,
      },
      {
        context: 'Emetteur',
        originalXml: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur/>
</s:Scenario>`,
        expectedXml: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <s:Contact>
      <s:NomContact>NOM</s:NomContact>
    </s:Contact>
  </s:Emetteur>
</s:Scenario>`,
      },
      {
        context: 'Contact',
        originalXml: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <c:Contact xmlns:c="urn:sandre"/>
  </s:Emetteur>
</s:Scenario>`,
        expectedXml: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <c:Contact xmlns:c="urn:sandre">
      <c:NomContact>NOM</c:NomContact>
    </c:Contact>
  </s:Emetteur>
</s:Scenario>`,
      },
    ])('should inherit the namespace prefix of $context', ({ originalXml, expectedXml }) => {
      const result = addNameTagToXml(originalXml, 'NOM');
      expect(result).toBe(expectedXml);
      expect(addNameTagToXml(result, 'Another name')).toBe(result);
    });

    it('should not treat a foreign-namespace NomContact as the sender name', () => {
      const originalXml = `<Emetteur xmlns:x="urn:other">
  <Contact>
    <x:NomContact>Other</x:NomContact>
  </Contact>
</Emetteur>`;
      const expectedXml = `<Emetteur xmlns:x="urn:other">
  <Contact>
    <x:NomContact>Other</x:NomContact>
    <NomContact>NOM</NomContact>
  </Contact>
</Emetteur>`;

      expect(addNameTagToXml(originalXml, 'NOM')).toBe(expectedXml);
    });

    it('should leave an existing self-closing NomContact unchanged', () => {
      const originalXml = '<Emetteur><Contact><NomContact/></Contact></Emetteur>';

      expect(addNameTagToXml(originalXml, 'NOM')).toBe(originalXml);
    });
  });

  describe('early stopping', () => {
    it.each([
      {
        context: 'existing NomContact',
        scenario: `<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>Existing</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`,
        expectedScenario: `<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>Existing</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`,
      },
      {
        context: 'missing NomContact',
        scenario: `<Scenario>
  <Emetteur>
    <Contact>
      <Tel>01</Tel>
    </Contact>
  </Emetteur>
</Scenario>`,
        expectedScenario: `<Scenario>
  <Emetteur>
    <Contact>
      <Tel>01</Tel>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`,
      },
      {
        context: 'self-closing Scenario',
        scenario: '<Scenario/>',
        expectedScenario: `<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`,
      },
      {
        context: 'prefixed Scenario',
        scenario: '<s:Scenario xmlns:s="urn:sandre"/>',
        expectedScenario: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <s:Contact>
      <s:NomContact>NOM</s:NomContact>
    </s:Contact>
  </s:Emetteur>
</s:Scenario>`,
      },
    ])(
      'should stop at the end of $context and leave a malformed suffix untouched',
      ({ scenario, expectedScenario }) => {
        const suffix = `
<OuvrageDepollution>&unknown;<Broken></FctAssain>`;
        const originalXml = `<FctAssain>${scenario}${suffix}`;

        expect(addNameTagToXml(originalXml, 'NOM')).toBe(`<FctAssain>${expectedScenario}${suffix}`);
      },
    );
  });

  describe('performance and security', () => {
    it.each([
      {
        context: 'unclosed Emetteur',
        xml: `<Root>
  <Emetteur>
  <Destinataire>x</Destinataire>
</Root>`,
      },
      {
        context: 'unclosed Contact followed by another Contact',
        xml: `<Emetteur>
  <Contact>
</Emetteur>
<Contact>
  <Z/>
</Contact>`,
      },
      {
        context: 'unterminated NomContact',
        xml: `<Emetteur>
  <NomContact>unterminated
</Emetteur>`,
      },
      {
        context: 'malformed Scenario with an existing NomContact',
        xml: `<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
  <Broken>
</Scenario>`,
      },
    ])('should reject $context before reaching the Scenario boundary', ({ xml }) => {
      expect(() => addNameTagToXml(xml, 'NOM')).toThrow();
    });

    it('should reject custom entities without resolving external resources', () => {
      const originalXml = `<!DOCTYPE Scenario [<!ENTITY secret SYSTEM "file:///etc/passwd">]>
<Scenario>
  <Emetteur>&secret;</Emetteur>
</Scenario>`;

      expect(() => addNameTagToXml(originalXml, 'NOM')).toThrow(/Invalid character entity/);
    });
    const timed = <T>(fn: () => T): { result: T; ms: number } => {
      const start = process.hrtime.bigint();
      const result = fn();
      return { result, ms: Number(process.hrtime.bigint() - start) / 1_000_000 };
    };

    it('should reject pathological chained Emetteur/NomContact opens quickly', () => {
      // 60 000 unclosed <Emetteur> tags, each followed by a <NomContact>…</NomContact>
      // pair: the previous chained lazy [\s\S]*? regexes needed O(n³) backtracks on this
      // shape (a 13.7 KB input already took ~2.7 s), so this 2 MB upload would stall the
      // single-threaded worker for days.
      const pathological = '<Emetteur><NomContact></NomContact>'.repeat(60_000);
      const { ms } = timed(() => {
        expect(() => addNameTagToXml(pathological, 'DOE John')).toThrow();
      });
      expect(ms).toBeLessThan(2_000);
    }, 10_000);

    it('should reject pathological whitespace after Scenario quickly', () => {
      // 2 MB of spaces with no closing </Scenario>: the previous greedy (\s*) followed
      // by a lazy ([\s\S]*?) quantifier backtracked quadratically (~1 min on this input).
      const pathological = '<Scenario>' + ' '.repeat(2_000_000);
      const { ms } = timed(() => {
        expect(() => addNameTagToXml(pathological, 'DOE John')).toThrow();
      });
      expect(ms).toBeLessThan(2_000);
    }, 10_000);

    it('should process a large well-formed XML document quickly', () => {
      const nomContact = 'Pierre Dupont';
      const emetteurHead = `    <Emetteur>
      <CdIntervenant schemeAgencyID="SIRET">12345678901234</CdIntervenant>
      <NomIntervenant>Grand Orchestre</NomIntervenant>`;
      const section = `
      <OuvrageDepollution>
        <CdOuvrageDepollution>OUV</CdOuvrageDepollution>
        <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
      </OuvrageDepollution>`;
      const sections = section.repeat(200_000);
      const tail = `
    </Emetteur>
  </Scenario>
</FctAssain>
`;
      const input = `<?xml version="1.0" encoding="utf-8"?>
<FctAssain>
  <Scenario>
${emetteurHead}${sections}${tail}`;
      const expected = `<?xml version="1.0" encoding="utf-8"?>
<FctAssain>
  <Scenario>
${emetteurHead}${sections}
      <Contact>
        <NomContact>${nomContact}</NomContact>
      </Contact>
    </Emetteur>
  </Scenario>
</FctAssain>
`;

      const { result, ms } = timed(() => addNameTagToXml(input, nomContact));
      expect(input.length).toBeGreaterThan(20_000_000); // sanity check: tens of MB
      expect(result).toEqual(expected);
      expect(ms).toBeLessThan(5_000);
    }, 60_000);

    it('should leave a large measurement suffix unparsed after Scenario', () => {
      const prefix = `<FctAssain>
  <Scenario>
    <Emetteur/>
  </Scenario>`;
      const measurements = `
  <OuvrageDepollution>
    <CdOuvrageDepollution>OUV</CdOuvrageDepollution>
    <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
  </OuvrageDepollution>`.repeat(200_000);
      // This would throw if SAX continued into the suffix.
      const suffix =
        measurements +
        `
  <Broken>&unknown;</FctAssain>`;
      const expectedPrefix = `<FctAssain>
  <Scenario>
    <Emetteur>
      <Contact>
        <NomContact>NOM</NomContact>
      </Contact>
    </Emetteur>
  </Scenario>`;

      const { result, ms } = timed(() => addNameTagToXml(prefix + suffix, 'NOM'));

      expect(suffix.length).toBeGreaterThan(20_000_000);
      expect(result).toBe(expectedPrefix + suffix);
      expect(ms).toBeLessThan(5_000);
    }, 60_000);
  });
});

describe('Sandre Parser - parse budgets', () => {
  /**
   * Budget calibration reference: the largest known legitimate SANDRE file
   * (packages/parser/src/xml/18.6_MO_anonymized.xml) holds 403,492 elements,
   * a maximum nesting depth of 7 and ~900 KB of text for 18.6 MB of input.
   * A 70 MB file (MAX_DEPOT_FILE_SIZE_BYTES) at the same density would hold
   * ~1.5M elements and ~3.4 MB of text.
   */

  const elementBomb = (count: number) => `<root>${'<a/>'.repeat(count)}</root>`;
  const depthBomb = (depth: number) => `<root>${'<a>'.repeat(depth)}${'</a>'.repeat(depth)}</root>`;
  const textBomb = (length: number) => `<root><t>${'x'.repeat(length)}</t></root>`;

  const legitBlock = (index: number) => `<OuvrageDepollution><CdOuvrageDepollution>CODE_${index}</CdOuvrageDepollution><TypeOuvrageDepollution>4</TypeOuvrageDepollution><PointMesure><NumeroPointMesure>${index}</NumeroPointMesure><LocGlobalePointMesure>S7</LocGlobalePointMesure><Prlvt><DatePrlvt>2024-12-31</DatePrlvt><Support><CdSupport>3</CdSupport></Support><Analyse><RsAnalyse>12.5</RsAnalyse><StatutRsAnalyse>A</StatutRsAnalyse><QualRsAnalyse>4</QualRsAnalyse><Parametre><CdParametre>1552</CdParametre></Parametre></Analyse></Prlvt></PointMesure></OuvrageDepollution>`;

  it('rejects an element-count bomb with a dedicated budget error instead of building the full graph', async () => {
    // ~2.5M elements: an adversarial 70 MB tag bomb holds ~18M, well above any
    // legitimate file. The default budget must abort early with a rejection,
    // never resolve.
    const bomb = elementBomb(2_500_000);

    const start = Date.now();
    await expect(parseScenarioAssainissementXml(bomb)).rejects.toThrow(XmlParseBudgetError);
    // Early abort: the budget must be hit long before the whole input is parsed.
    expect(Date.now() - start).toBeLessThan(10_000);
  }, 30_000);

  it('exposes the exceeded budget kind, limit and a distinguishable code', async () => {
    const bomb = elementBomb(10);

    const error = await parseScenarioAssainissementXml(bomb, { maxElements: 5 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(XmlParseBudgetError);
    const budgetError = error as XmlParseBudgetError;
    expect(budgetError.kind).toBe(XmlParseBudgetKind.ELEMENTS);
    expect(budgetError.limit).toBe(5);
    expect(budgetError.code).toBe('XML_PARSE_BUDGET_EXCEEDED');
    expect(budgetError.message).toContain('ELEMENTS');
  });

  it('rejects a depth bomb at the depth budget', async () => {
    const bomb = depthBomb(100);

    const start = Date.now();
    const error = await parseScenarioAssainissementXml(bomb).catch((e: unknown) => e);
    expect(Date.now() - start).toBeLessThan(10_000);

    expect(error).toBeInstanceOf(XmlParseBudgetError);
    expect((error as XmlParseBudgetError).kind).toBe(XmlParseBudgetKind.DEPTH);
    expect((error as XmlParseBudgetError).limit).toBe(DEFAULT_XML_PARSE_BUDGETS.maxDepth);
  });

  it('rejects a text bomb at the text budget', async () => {
    const bomb = textBomb(500);

    const error = await parseScenarioAssainissementXml(bomb, { maxTextLength: 100 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(XmlParseBudgetError);
    expect((error as XmlParseBudgetError).kind).toBe(XmlParseBudgetKind.TEXT);
    expect((error as XmlParseBudgetError).limit).toBe(100);
  });

  it('still parses a large legitimate file comfortably under the default budgets', async () => {
    // ~720k elements, ~21 MB: roughly twice the element count of the largest
    // known real file, at a higher element density. Must pass under defaults.
    const blockCount = 72_000;
    const xml = `<root>${Array.from({ length: blockCount }, (_, i) => legitBlock(i)).join('')}</root>`;

    const result = await parseScenarioAssainissementXml(xml);

    expect(result.ouvrages).toHaveLength(blockCount);
    expect(result.ouvrages[0].cdOuvrageDepollution).toBe('CODE_0');
    expect(result.ouvrages[blockCount - 1].pointMesure[0].prelevement[0].analyse[0].cdParametre).toBe('1552');
  }, 60_000);
});
