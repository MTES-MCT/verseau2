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
