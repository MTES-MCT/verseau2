import { CsvGeneratorService } from './csvGenerator.service';

describe('CsvGeneratorService', () => {
  const service = new CsvGeneratorService();

  it('includes headers in order with utf8 bom', () => {
    const csv = service.generate(
      [
        { header: 'Colonne A', value: (row: { a: string; b: string }) => row.a },
        { header: 'Colonne B', value: (row: { a: string; b: string }) => row.b },
      ],
      [{ a: '1', b: '2' }],
    );

    expect(csv).toBe('\uFEFF"Colonne A","Colonne B"\r\n"1","2"');
  });

  it('escapes quotes and line breaks', () => {
    const csv = service.generate(
      [{ header: 'Texte', value: (row: { text: string }) => row.text }],
      [{ text: 'ligne "1"\nligne 2' }],
    );

    expect(csv).toBe('\uFEFF"Texte"\r\n"ligne ""1""\nligne 2"');
  });
});
