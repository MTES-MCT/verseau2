import { addNameTagToXml, parseScenarioAssainissementXml } from './scenarioAssainissement.parser';
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

  it('should write the NomContact tag to the provided XML correctly with Contact tag', async () => {
    const nomContact = 'Mon nom';
    const originalXml = `
  <Scenario>
    <Emetteur>
      <Contact>
        <AutreBalise>CONTACT_NAME_1</AutreBalise>
      </Contact>
    </Emetteur>
  </Scenario>`;
    const expectedXml = `
  <Scenario>
    <Emetteur>
      <Contact>
        <AutreBalise>CONTACT_NAME_1</AutreBalise>
        <NomContact>${nomContact}</NomContact>
      </Contact>
    </Emetteur>
  </Scenario>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toBeDefined();
    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).toEqual(expectedXml);
  });

  it('should write the NomContact tag to the provided XML correctly without Contact and Emetteur tags', async () => {
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
    expect(xml).toBeDefined();
    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).toEqual(expectedXml);
  });

  it('should write the NomContact tag to the provided XML correctly without Contact tag', async () => {
    const nomContact = 'Mon nom';
    const originalXml = `
    <Scenario>
      <Emetteur>
      </Emetteur>
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
    expect(xml).toBeDefined();
    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).toEqual(expectedXml);
  });

  it('should not write the NomContact tag to the provided XML correctly if it already exists', async () => {
    const nomContact = 'Mon nom';
    const originalXml = `
    <Scenario>
      <Emetteur>
        <Contact>
          <AutreBalise>CONTACT_NAME_1</AutreBalise>
          <NomContact>Mon nom</NomContact>
        </Contact>
      </Emetteur>
    </Scenario>`;

    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toBeDefined();
    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).toEqual(originalXml);
  });

  it('should write the NomContact tag to the provided XML correctly even if it exists in Destinataire tag', async () => {
    const nomContact = 'Mon nom';
    const originalXml = `
    <Scenario>
      <Emetteur>
        <UNE_BALISE_INCONNUE>
        </UNE_BALISE_INCONNUE>
      </Emetteur>
      <Destinataire>
        <Contact>
          <AutreBalise>CONTACT_NAME_1</AutreBalise>
          <NomContact>Un nom de destinataire</NomContact>
        </Contact>
      </Destinataire>
    </Scenario>`;

    const expectedXml = `
    <Scenario>
      <Emetteur>
        <UNE_BALISE_INCONNUE>
        </UNE_BALISE_INCONNUE>
        <Contact>
          <NomContact>Mon nom</NomContact>
        </Contact>
      </Emetteur>
      <Destinataire>
        <Contact>
          <AutreBalise>CONTACT_NAME_1</AutreBalise>
          <NomContact>Un nom de destinataire</NomContact>
        </Contact>
      </Destinataire>
    </Scenario>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toBeDefined();
    expect(xml).toMatch(/<Emetteur>[\s\S]*?<NomContact>Mon nom<\/NomContact>[\s\S]*?<\/Emetteur>/);
    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).not.toEqual(originalXml);
    expect(xml).toEqual(expectedXml);
  });

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
    expect(xml).toBeDefined();
    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).toEqual(expectedXml);
  });

  it('should preserve CRLF line endings when adding the NomContact tag', () => {
    const nomContact = 'Pierre Dupont';
    const originalXml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<FctAssain>',
      '  <Scenario>',
      '    <Emetteur>',
      '      <CdIntervenant schemeAgencyID="SIRET">33937998401008</CdIntervenant>',
      '      <NomIntervenant>SAUR</NomIntervenant>',
      '    </Emetteur>',
      '  </Scenario>',
      '</FctAssain>',
    ].join('\r\n');

    const xml = addNameTagToXml(originalXml, nomContact);

    expect(xml).toContain(`<NomContact>${nomContact}</NomContact>`);
    expect(xml).toContain(`\r\n      <Contact>\r\n        <NomContact>${nomContact}</NomContact>\r\n      </Contact>`);
    expect(xml).not.toMatch(/(?<!\r)\n/);
  });

  it('should insert the Emetteur block before Destinataire when the Emetteur tag is unclosed', () => {
    // An <Emetteur> without a matching </Emetteur> is treated as absent: the old
    // hasEmetteur regex required the closing tag as well.
    const nomContact = 'NOM';
    const originalXml = `<Root>
  <Emetteur>
  <Destinataire>x</Destinataire>
</Root>`;
    const expectedXml = `<Root>
  <Emetteur>
  <Emetteur>
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
  <Destinataire>x</Destinataire>
</Root>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });

  it('should only modify the first Emetteur when several Emetteur tags are present', () => {
    const nomContact = 'NOM';
    const originalXml = `<A>
  <Emetteur>
    <X/>
  </Emetteur>
  <Emetteur>
    <Y/>
  </Emetteur>
</A>`;
    const expectedXml = `<A>
  <Emetteur>
    <X/>
    <Contact>
      <NomContact>NOM</NomContact>
    </Contact>
  </Emetteur>
  <Emetteur>
    <Y/>
  </Emetteur>
</A>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });

  it('should insert the Emetteur block after Scenario while preserving the following whitespace', () => {
    const nomContact = 'NOM';
    const originalXml = `<Scenario>

    <X/>
</Scenario>`;
    const expectedXml = `<Scenario>
    <Emetteur>
        <Contact>
            <NomContact>NOM</NomContact>
        </Contact>
    </Emetteur>

    <X/>
</Scenario>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });

  it('should reuse the exact indentation and CRLF line endings when inserting before Destinataire', () => {
    const nomContact = 'NOM';
    const originalXml = 'header\r\n\t<Destinataire>y</Destinataire>';
    const expectedXml =
      'header\r\n\t<Emetteur>\r\n\t\t<Contact>\r\n\t\t\t<NomContact>NOM</NomContact>\r\n\t\t</Contact>\r\n\t</Emetteur>\r\n\t<Destinataire>y</Destinataire>';
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });

  it('should write the NomContact tag with CRLF line endings when Contact already exists', () => {
    const nomContact = 'NOM';
    const originalXml = '<Emetteur>\r\n  <Contact>\r\n    <Tel>01</Tel>\r\n  </Contact>\r\n</Emetteur>';
    const expectedXml =
      '<Emetteur>\r\n  <Contact>\r\n    <Tel>01</Tel>\r\n    <NomContact>NOM</NomContact>\r\n  </Contact>\r\n</Emetteur>';
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });

  it('should treat an unclosed Contact inside Emetteur as absent when a Contact pair exists after Emetteur', () => {
    const nomContact = 'NOM';
    const originalXml = `<Emetteur>
  <Contact>
</Emetteur>
<Contact>
  <Z/>
</Contact>`;
    const expectedXml = `<Emetteur>
  <Contact>
  <Contact>
    <NomContact>NOM</NomContact>
  </Contact>
</Emetteur>
<Contact>
  <Z/>
</Contact>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });

  it('should not skip the insertion when an existing NomContact tag is unterminated', () => {
    const nomContact = 'NOM';
    const originalXml = `<Emetteur>
  <NomContact>unterminated</Emetteur>`;
    const expectedXml = `<Emetteur>
  <NomContact>unterminated
  <Contact>
    <NomContact>NOM</NomContact>
  </Contact>
</Emetteur>`;
    const xml = addNameTagToXml(originalXml, nomContact);
    expect(xml).toEqual(expectedXml);
  });
});

describe('addNameTagToXml indentation', () => {
  describe.each([
    { format: 'four spaces and LF', fixture: 'spaces-lf.xml', indent: '    ', lineEnding: '\n' },
    { format: 'four spaces and CRLF', fixture: 'spaces-crlf.xml', indent: '    ', lineEnding: '\r\n' },
    { format: 'tabs and LF', fixture: 'tabs-lf.xml', indent: '\t', lineEnding: '\n' },
    { format: 'tabs and CRLF', fixture: 'tabs-crlf.xml', indent: '\t', lineEnding: '\r\n' },
  ])('$format', ({ fixture, indent, lineEnding }) => {
    const expectedXml = fs.readFileSync(
      path.join(__dirname, '../../../apps/back/test/fixtures/xml/depot-contact', fixture),
      'utf-8',
    );

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
      const originalXml = [
        '<Scenario>',
        `${indent}<Destinataire/>`,
        `${indent}<Destinataire></Destinataire>`,
        '</Scenario>',
      ].join(lineEnding);
      const expected = [
        '<Scenario>',
        `${indent}<Destinataire/>`,
        `${indent}<Emetteur>`,
        `${indent.repeat(2)}<Contact>`,
        `${indent.repeat(3)}<NomContact>TEST User</NomContact>`,
        `${indent.repeat(2)}</Contact>`,
        `${indent}</Emetteur>`,
        `${indent}<Destinataire></Destinataire>`,
        '</Scenario>',
      ].join(lineEnding);

      expect(addNameTagToXml(originalXml, 'TEST User')).toBe(expected);
    });

    it('should follow sibling indentation when inserting Emetteur into Scenario', () => {
      const originalXml = ['<Scenario>', '', `${indent}<CodeScenario>FCT_ASSAIN</CodeScenario>`, '</Scenario>'].join(
        lineEnding,
      );
      const expected = [
        '<Scenario>',
        `${indent}<Emetteur>`,
        `${indent.repeat(2)}<Contact>`,
        `${indent.repeat(3)}<NomContact>TEST User</NomContact>`,
        `${indent.repeat(2)}</Contact>`,
        `${indent}</Emetteur>`,
        '',
        `${indent}<CodeScenario>FCT_ASSAIN</CodeScenario>`,
        '</Scenario>',
      ].join(lineEnding);

      expect(addNameTagToXml(originalXml, 'TEST User')).toBe(expected);
    });
  });
});

describe('addNameTagToXml robustness (ReDoS)', () => {
  const timed = (fn: () => string): { result: string; ms: number } => {
    const start = process.hrtime.bigint();
    const result = fn();
    return { result, ms: Number(process.hrtime.bigint() - start) / 1_000_000 };
  };

  it('should complete quickly on pathological chained Emetteur/NomContact opens', () => {
    // 60 000 unclosed <Emetteur> tags, each followed by a <NomContact>…</NomContact>
    // pair: the previous chained lazy [\s\S]*? regexes needed O(n³) backtracks on this
    // shape (a 13.7 KB input already took ~2.7 s), so this 2 MB upload would stall the
    // single-threaded worker for days.
    const pathological = '<Emetteur><NomContact></NomContact>'.repeat(60_000);
    const { result, ms } = timed(() => addNameTagToXml(pathological, 'DOE John'));
    // No </Emetteur>, no <Destinataire> and no <Scenario> → must be returned unchanged.
    expect(result).toBe(pathological);
    expect(ms).toBeLessThan(2_000);
  }, 10_000);

  it('should complete quickly on pathological whitespace after Scenario', () => {
    // 2 MB of spaces with no closing </Scenario>: the previous greedy (\s*) followed
    // by a lazy ([\s\S]*?) quantifier backtracked quadratically (~1 min on this input).
    const pathological = '<Scenario>' + ' '.repeat(2_000_000);
    const { result, ms } = timed(() => addNameTagToXml(pathological, 'DOE John'));
    // No closing </Scenario> → must be returned unchanged.
    expect(result).toBe(pathological);
    expect(ms).toBeLessThan(2_000);
  }, 10_000);

  it('should process a large well-formed XML document quickly', () => {
    const nomContact = 'Pierre Dupont';
    const emetteurHead =
      '    <Emetteur>\n      <CdIntervenant schemeAgencyID="SIRET">12345678901234</CdIntervenant>\n      <NomIntervenant>Grand Orchestre</NomIntervenant>';
    const section =
      '\n      <OuvrageDepollution><CdOuvrageDepollution>OUV</CdOuvrageDepollution><TypeOuvrageDepollution>4</TypeOuvrageDepollution></OuvrageDepollution>';
    const sections = section.repeat(200_000);
    const tail = '\n    </Emetteur>\n  </Scenario>\n</FctAssain>\n';
    const input = `<?xml version="1.0" encoding="utf-8"?>\n<FctAssain>\n  <Scenario>\n${emetteurHead}${sections}${tail}`;
    const expected = `<?xml version="1.0" encoding="utf-8"?>\n<FctAssain>\n  <Scenario>\n${emetteurHead}${sections}\n      <Contact>\n        <NomContact>${nomContact}</NomContact>\n      </Contact>\n    </Emetteur>\n  </Scenario>\n</FctAssain>\n`;

    const { result, ms } = timed(() => addNameTagToXml(input, nomContact));
    expect(input.length).toBeGreaterThan(20_000_000); // sanity check: tens of MB
    expect(result).toEqual(expected);
    expect(ms).toBeLessThan(5_000);
  }, 60_000);
});
