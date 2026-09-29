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

  it('should write the NomContact tag without adding extra blank lines when there are multiple newlines before the closing tag', () => {
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
