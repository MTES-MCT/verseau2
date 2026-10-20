import { formatHtmlAsPlainText, repairUtf8Mojibake } from './textFormatter';

describe('repairUtf8Mojibake', () => {
  it('repairs UTF-8 text misinterpreted as Windows-1252', () => {
    expect(repairUtf8Mojibake('Le dÃ©pÃ´t concerne lâ€™agence.')).toBe('Le dépôt concerne l’agence.');
  });

  it('preserves correctly encoded text in a mixed string', () => {
    expect(repairUtf8Mojibake("Le dÃ©pÃ´t n'est pas déclaré.")).toBe("Le dépôt n'est pas déclaré.");
  });
});

describe('formatHtmlAsPlainText', () => {
  it('converts paragraph and break tag variants to normalized line breaks', () => {
    expect(formatHtmlAsPlainText('<P>Première ligne<BR>Deuxième ligne<br /><br/>Troisième ligne</P>\r\n')).toBe(
      'Première ligne\nDeuxième ligne\n\nTroisième ligne',
    );
  });

  it('normalizes non-breaking spaces and preserves unhandled tags as text', () => {
    expect(formatHtmlAsPlainText('<strong>Dépôt\u00a0intégré</strong>')).toBe('<strong>Dépôt intégré</strong>');
  });
});
