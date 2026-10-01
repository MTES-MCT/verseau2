/**
 * Budgets de parsing XML.
 *
 * Le parsing d'un fichier XML construit un graphe d'objets intermédiaire dont la
 * taille n'est pas corrélée au seul poids du fichier : un fichier de quelques Mo
 * composé de millions de balises minuscules (tag bomb) produit un graphe de
 * plusieurs Go et tue par épuisement de la mémoire le worker unique qui traite
 * toutes les files. Les budgets ci-dessous bornent le graphe intermédiaire et
 * interrompent le parsing dès qu'une limite est dépassée.
 */
export enum XmlParseBudgetKind {
  ELEMENTS = 'ELEMENTS',
  DEPTH = 'DEPTH',
  TEXT = 'TEXT',
}

export interface XmlParseBudgets {
  /** Nombre maximal d'éléments (balises ouvrantes) acceptés dans un document. */
  maxElements: number;
  /** Profondeur maximale d'imbrication des éléments acceptée dans un document. */
  maxDepth: number;
  /** Volume maximal de données texte (caractères cumulés) accepté dans un document. */
  maxTextLength: number;
}

/**
 * Budgets par défaut, calibrés sur le plus gros fichier légitime connu
 * (18.6_MO_anonymized.xml : 18,6 Mo, 403 492 éléments, profondeur 7,
 * ~900 Ko de texte). Un fichier de 70 Mo (MAX_DEPOT_FILE_SIZE_BYTES) à la
 * même densité contient ~1,5 M d'éléments et ~3,4 Mo de texte : les défauts
 * gardent ~30 % de marge sur les éléments, ~9x sur la profondeur et ~3x sur le
 * texte, tout en plafonnant le graphe intermédiaire d'un fichier adverse à
 * quelques centaines de Mo au lieu de plusieurs Go.
 */
export const DEFAULT_XML_PARSE_BUDGETS: XmlParseBudgets = {
  maxElements: 2_000_000,
  maxDepth: 64,
  maxTextLength: 10_485_760, // 10 Mo
};

export const XML_PARSE_BUDGET_EXCEEDED_CODE = 'XML_PARSE_BUDGET_EXCEEDED';

/** Erreur distinguable émise dès qu'un budget de parsing est dépassé. */
export class XmlParseBudgetError extends Error {
  readonly code = XML_PARSE_BUDGET_EXCEEDED_CODE;

  constructor(
    readonly kind: XmlParseBudgetKind,
    readonly limit: number,
  ) {
    super(`XML parse budget exceeded (kind: ${kind}, limit: ${limit})`);
    this.name = 'XmlParseBudgetError';
  }
}
