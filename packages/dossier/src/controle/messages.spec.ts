import { buildMessage } from './messages';
import { ErrorCode } from './evenement';

describe('buildMessage', () => {
  it('devrait retourner le message pour E2_003 (code ouvrage inexistant)', () => {
    const result = buildMessage(ErrorCode.E2_003, ['OUV123']);
    expect(result).toBe(
      "Le code ouvrage OUV123 n'existe pas dans la base de données Roseau ! Veuillez vérifier son exactitude ou le créer dans Roseau.",
    );
  });

  it("devrait retourner le message pour E2_004 (MOA non rattaché à l'ouvrage)", () => {
    const result = buildMessage(ErrorCode.E2_004, ['MOA123', 'OUV456']);
    expect(result).toBe("Le maître d'ouvrage MOA123 n'est pas rattaché à l'ouvrage OUV456 dans Roseau !");
  });

  it('devrait retourner le message pour E2_004 (MOA inexistant sans ouvrage)', () => {
    const result = buildMessage(ErrorCode.E2_004, ['MOA123', '']);
    expect(result).toBe(
      "Le maître d'ouvrage MOA123 n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.",
    );
  });

  it('devrait retourner le message pour E2_012 (paramètre inconnu)', () => {
    const result = buildMessage(ErrorCode.E2_012, ['1234']);
    expect(result).toBe('Le code Sandre 1234 du paramètre est inconnu ! Veuillez modifier sa valeur dans le fichier.');
  });

  it('devrait retourner le message pour E2_022 (système de collecte inconnu)', () => {
    const result = buildMessage(ErrorCode.E2_022, ['SCL789']);
    expect(result).toBe('Le code du système de collecte SCL789 est inconnu ! Veuillez le saisir dans Roseau.');
  });

  it('devrait retourner le message pour E2_023 (agglomération incompatible)', () => {
    const result = buildMessage(ErrorCode.E2_023, ['AGGLO123', 'SCL456']);
    expect(result).toBe(
      'Le code agglomération AGGLO123 ne peut pas recevoir de données du système de collecte SCL456 !',
    );
  });

  it('devrait retourner le message pour E2_033 (point de mesure inconnu)', () => {
    const result = buildMessage(ErrorCode.E2_033, ['PM01', 'OUV999']);
    expect(result).toBe(
      "Le point de mesure N° PM01 est inconnu pour l'ouvrage OUV999 ! Veuillez contacter le service gestionnaire de l'ouvrage.",
    );
  });

  it('devrait retourner le message pour E2_039 (ratio DCO/DBO5 avec 7 params)', () => {
    const result = buildMessage(ErrorCode.E2_039, ['OUV123', 'PM01', '2024-01-15', '1351', '850', '250', '3.4']);
    expect(result).toContain('Le ratio DCO/DBO5 calculé (3.4)');
    expect(result).toContain('ouvrage OUV123');
    expect(result).toContain('point de mesure PM01');
    expect(result).toContain('date du 2024-01-15');
    expect(result).toContain('DCO = 850 mg/L');
    expect(result).toContain('DBO5 = 250 mg/L');
  });

  it('devrait retourner le message pour E2_040 (ratio MES/DBO5 avec 7 params)', () => {
    const result = buildMessage(ErrorCode.E2_040, ['OUV789', 'PM03', '2024-03-10', '1352', '400', '300', '1.33']);
    expect(result).toContain('Le ratio MES/DBO5 calculé (1.33)');
    expect(result).toContain('ouvrage OUV789');
    expect(result).toContain('point de mesure PM03');
    expect(result).toContain('date du 2024-03-10');
    expect(result).toContain('MES = 400 mg/L');
    expect(result).toContain('DBO5 = 300 mg/L');
  });

  it('devrait retourner le message pour E2_041 (DCO hors plage avec 5 params)', () => {
    const result = buildMessage(ErrorCode.E2_041, ['OUV111', 'PM05', '2024-04-12', '1350', '2500']);
    expect(result).toContain('La concentration en DCO (2500 mg/L)');
    expect(result).toContain('hors de la plage de valeurs attendues (300 à 1700 mg/L)');
    expect(result).toContain('ouvrage OUV111');
    expect(result).toContain('point de mesure PM05');
    expect(result).toContain('date du 2024-04-12');
  });

  it('devrait retourner le message pour E2_045 (Ptot hors plage avec 5 params)', () => {
    const result = buildMessage(ErrorCode.E2_045, ['OUV222', 'PM06', '2024-05-20', '1354', '35']);
    expect(result).toContain('La concentration en Ptot (35 mg/L)');
    expect(result).toContain('hors de la plage de valeurs attendues (4 à 25 mg/L)');
    expect(result).toContain('ouvrage OUV222');
    expect(result).toContain('point de mesure PM06');
    expect(result).toContain('date du 2024-05-20');
  });

  it('devrait retourner le message pour E2_047 (DCO ≤ DBO5)', () => {
    const result = buildMessage(ErrorCode.E2_047, ['OUV456', 'PM02', '2024-02-20', '1350', '200', '250']);
    expect(result).toBe(
      "Incohérence : DCO ≤ DBO5 pour l'ouvrage OUV456, point PM02, date 2024-02-20 (DCO=200 mg/L, DBO5=250 mg/L)",
    );
  });

  it('devrait retourner le message pour E2_048 (NTK ≤ N-NH4)', () => {
    const result = buildMessage(ErrorCode.E2_048, ['OUV333', 'PM07', '2024-06-15', '1355', '40', '50']);
    expect(result).toBe(
      "Incohérence : NTK ≤ N-NH4 pour l'ouvrage OUV333, point PM07, date 2024-06-15 (NTK=40 mg/L, N-NH4=50 mg/L)",
    );
  });

  it('devrait retourner le message pour E2_051 (Volume A3/A4 avec 7 params)', () => {
    const result = buildMessage(ErrorCode.E2_051, ['OUV444', '2024-07-01', '5000', '6500', '>', '7000', '<']);
    expect(result).toContain('Volume A3/A4 incohérent vs capacité EH');
    expect(result).toContain('ouvrage OUV444');
    expect(result).toContain('date 2024-07-01');
    expect(result).toContain('Seuil = 5000 m³/j');
    expect(result).toContain('A3: 6500 > seuil');
    expect(result).toContain('A4: 7000 < seuil');
  });

  it('devrait retourner le message pour E2_999 (erreur technique)', () => {
    const result = buildMessage(ErrorCode.E2_999, ['Connexion base de données perdue']);
    expect(result).toBe(
      "Une erreur technique inattendue s'est produite lors de l'exécution des contrôles du dépôt: Connexion base de données perdue",
    );
  });

  it('devrait retourner le message pour E2_061 (A3 manquant)', () => {
    const result = buildMessage(ErrorCode.E2_061, ['A3', '2024-01-15']);
    expect(result).toBe(
      "Les valeurs de débit des points A3 et A4 (paramètre 1552) doivent être renseignées à la même date pour permettre le calcul du rendement. Le débit d'entrée manque pour la date 2024-01-15, alors que le débit de sortie pour la date 2024-01-15 existe.",
    );
  });

  it('devrait retourner le message pour E2_061 (A4 manquant)', () => {
    const result = buildMessage(ErrorCode.E2_061, ['A4', '2024-06-01']);
    expect(result).toBe(
      "Les valeurs de débit des points A3 et A4 (paramètre 1552) doivent être renseignées à la même date pour permettre le calcul du rendement. Le débit de sortie manque pour la date 2024-06-01, alors que le débit d'entrée pour la date 2024-06-01 existe.",
    );
  });

  it('devrait retourner le message pour E2_201 (AOF absent)', () => {
    const result = buildMessage(ErrorCode.E2_201, ['2024-06-01']);
    expect(result).toBe(
      'Paramètre AOF (code 8986) absent pour la date 2024-06-01. Ce paramètre est obligatoire pour les analyses PFAS en sortie de station (A4).',
    );
  });

  it('devrait retourner le message pour E2_202 (Fluorure absent)', () => {
    const result = buildMessage(ErrorCode.E2_202, ['2024-06-01']);
    expect(result).toBe(
      "Paramètre Fluorure (code 7073) absent pour la date 2024-06-01. Ce paramètre est obligatoire pour permettre l'interprétation de l'AOF.",
    );
  });

  it('devrait retourner le message pour E2_203 (Carbone organique absent)', () => {
    const result = buildMessage(ErrorCode.E2_203, ['2024-06-01']);
    expect(result).toBe('Carbone organique (code 1841) absent pour la date 2024-06-01.');
  });

  it('devrait retourner le message pour E2_204 (Fluorure absent)', () => {
    const result = buildMessage(ErrorCode.E2_204, ['FLUORURE', '2024-06-01']);
    expect(result).toBe('AOF présent mais fluorure absent pour la date 2024-06-01, interprétation impossible');
  });

  it('devrait retourner le message pour E2_204 (AOF absent)', () => {
    const result = buildMessage(ErrorCode.E2_204, ['AOF', '2024-06-02']);
    expect(result).toBe('Fluorure présent mais AOF absent pour la date 2024-06-02, interprétation impossible');
  });

  it('devrait retourner "Erreur inconnue" pour un code d\'erreur undefined', () => {
    const result = buildMessage(undefined, []);
    expect(result).toBe('Erreur inconnue');
  });
});
