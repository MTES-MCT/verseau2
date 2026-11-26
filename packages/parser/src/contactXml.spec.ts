import { setContactInXml } from './scenarioAssainissement.parser';

describe('setContactInXml', () => {
  const contact = { nomContact: 'DUPONT Jeanne', melContact: 'ag@example.com' };

  describe.each([
    { format: 'spaces and LF', indent: '  ', lineEnding: '\n' },
    { format: 'spaces and CRLF', indent: '    ', lineEnding: '\r\n' },
    { format: 'tabs and LF', indent: '\t', lineEnding: '\n' },
    { format: 'tabs and CRLF', indent: '\t', lineEnding: '\r\n' },
  ])('$format', ({ indent, lineEnding }) => {
    const format = (xml: string): string =>
      xml.replace(/^ +/gm, (spaces) => indent.repeat(spaces.length / 2)).replaceAll('\n', lineEnding);

    it('creates both sender contact values without changing the rest of the document', () => {
      const xml = format(`<Scenario>
  <Emetteur id='original'>
    <CdIntervenant>123</CdIntervenant>
  </Emetteur>
  <Destinataire><Contact><NomContact>Recipient</NomContact><MelContact>recipient@example.com</MelContact></Contact></Destinataire>
</Scenario>`);
      const expected = format(`<Scenario>
  <Emetteur id='original'>
    <CdIntervenant>123</CdIntervenant>
    <Contact>
      <NomContact>DUPONT Jeanne</NomContact>
      <MelContact>ag@example.com</MelContact>
    </Contact>
  </Emetteur>
  <Destinataire><Contact><NomContact>Recipient</NomContact><MelContact>recipient@example.com</MelContact></Contact></Destinataire>
</Scenario>`);

      expect(setContactInXml(xml, contact)).toBe(expected);
      expect(setContactInXml(expected, contact)).toBe(expected);
    });

    it('overwrites existing values while keeping attributes and surrounding whitespace', () => {
      const xml = format(`<Scenario>
  <Emetteur>
    <Contact id="original">
      <NomContact source='xml'><![CDATA[Old name]]></NomContact>

      <MelContact>old@example.com</MelContact>
      <TelContact>01&#50;3</TelContact>
    </Contact>
  </Emetteur>
</Scenario>`);
      const expected = format(`<Scenario>
  <Emetteur>
    <Contact id="original">
      <NomContact source='xml'>DUPONT Jeanne</NomContact>

      <MelContact>ag@example.com</MelContact>
      <TelContact>01&#50;3</TelContact>
    </Contact>
  </Emetteur>
</Scenario>`);

      expect(setContactInXml(xml, contact)).toBe(expected);
    });

    it('replaces the existing name and adds the missing email in the same pass', () => {
      const xml = format(`<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>Old</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`);
      const expected = format(`<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>DUPONT Jeanne</NomContact>
      <MelContact>ag@example.com</MelContact>
    </Contact>
  </Emetteur>
</Scenario>`);

      expect(setContactInXml(xml, contact)).toBe(expected);
    });
  });

  it.each([
    {
      xml: '<Scenario/>',
      expected: `<Scenario>
  <Emetteur>
    <Contact>
      <NomContact>DUPONT Jeanne</NomContact>
      <MelContact>ag@example.com</MelContact>
    </Contact>
  </Emetteur>
</Scenario>`,
    },
    {
      xml: `<Scenario>
  <Emetteur><Contact id='keep'/></Emetteur>
</Scenario>`,
      expected: `<Scenario>
  <Emetteur><Contact id='keep'>
  <NomContact>DUPONT Jeanne</NomContact>
  <MelContact>ag@example.com</MelContact>
</Contact></Emetteur>
</Scenario>`,
    },
    {
      xml: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <c:Contact xmlns:c='urn:sandre'>
      <c:NomContact id='keep'/>
      <c:MelContact />
    </c:Contact>
  </s:Emetteur>
</s:Scenario>`,
      expected: `<s:Scenario xmlns:s="urn:sandre">
  <s:Emetteur>
    <c:Contact xmlns:c='urn:sandre'>
      <c:NomContact id='keep'>DUPONT Jeanne</c:NomContact>
      <c:MelContact >ag@example.com</c:MelContact>
    </c:Contact>
  </s:Emetteur>
</s:Scenario>`,
    },
  ])('handles self-closing elements and namespaces: $xml', ({ xml, expected }) => {
    expect(setContactInXml(xml, contact)).toBe(expected);
  });

  it.each([null, ''])('clears an existing email when the AG email is %j without rejecting the XML', (melContact) => {
    const xml =
      '<Emetteur><Contact><NomContact>Old</NomContact><MelContact>old@example.com</MelContact></Contact></Emetteur>';
    const expected =
      '<Emetteur><Contact><NomContact>DUPONT Jeanne</NomContact><MelContact></MelContact></Contact></Emetteur>';

    expect(setContactInXml(xml, { ...contact, melContact })).toBe(expected);
  });

  it('escapes both values, ignoring comments, nested contacts and foreign namespaces', () => {
    const xml = `<Emetteur xmlns:x="urn:other" label='😀 > x'>
  <!-- <Contact><NomContact>Comment</NomContact></Contact> -->
  <Other><Contact><NomContact>Nested</NomContact></Contact></Other>
  <Contact>
    <x:NomContact>Foreign</x:NomContact>
    <NomContact>Old</NomContact>
    <MelContact>old@example.com</MelContact>
  </Contact>
</Emetteur>`;
    const expected = `<Emetteur xmlns:x="urn:other" label='😀 > x'>
  <!-- <Contact><NomContact>Comment</NomContact></Contact> -->
  <Other><Contact><NomContact>Nested</NomContact></Contact></Other>
  <Contact>
    <x:NomContact>Foreign</x:NomContact>
    <NomContact>A &amp; B &lt;C&gt; ]]&gt;</NomContact>
    <MelContact>a&amp;b@example.com</MelContact>
  </Contact>
</Emetteur>`;

    expect(setContactInXml(xml, { nomContact: 'A & B <C> ]]>', melContact: 'a&b@example.com' })).toBe(expected);
  });

  it('stops after Scenario and leaves a large malformed suffix unchanged', () => {
    const xml =
      '<FctAssain><Scenario><Emetteur><Contact><NomContact>Old</NomContact><MelContact>old@example.com</MelContact></Contact></Emetteur></Scenario>';
    const expected =
      '<FctAssain><Scenario><Emetteur><Contact><NomContact>DUPONT Jeanne</NomContact><MelContact>ag@example.com</MelContact></Contact></Emetteur></Scenario>';
    const suffix = '<Broken>&unknown;'.repeat(100_000);

    expect(setContactInXml(xml + suffix, contact)).toBe(expected + suffix);
  });

  it('does not hide malformed XML before the Scenario boundary', () => {
    const xml = '<Scenario><Emetteur><Contact><NomContact>Old</NomContact></Contact></Emetteur><Broken></Scenario>';

    expect(() => setContactInXml(xml, contact)).toThrow();
  });
});
