import * as sax from 'sax';
import { SandreScenarioCode, SandreScenarioVersion, SandreTags } from './sandreConstants';
import {
  AgglomerationAssainissement,
  Analyse,
  Destination,
  Emetteur,
  EvenOuvrageAssainissement,
  FctAssainissement,
  OuvrageDepollution,
  PointMesure,
  Prelevement,
  Scenario,
  SystemeCollecte,
  ValeurCaracteristiqueRejet,
} from './scenarioAssainissement';
import { XmlParseBudgetError, XmlParseBudgetKind, XmlParseBudgets, DEFAULT_XML_PARSE_BUDGETS } from './xmlParseBudgets';

// Taille des morceaux transmis à sax : permet d'interrompre le parsing dès qu'un
// budget est dépassé au lieu de tokeniser tout le fichier d'un seul tenant.
const SAX_WRITE_CHUNK_SIZE = 64 * 1024;

export function parseScenarioAssainissementXml(
  xmlInput: string,
  budgets?: Partial<XmlParseBudgets>,
): Promise<FctAssainissement> {
  const limits: XmlParseBudgets = { ...DEFAULT_XML_PARSE_BUDGETS, ...budgets };
  return new Promise((resolve, reject) => {
    const parser = sax.parser(true, {
      trim: true,
      normalize: true,
      xmlns: true,
    });

    const result: FctAssainissement = {
      scenario: {} as Scenario,
      ouvrages: [],
      systemesCollecte: [],
    };

    let stack: any[] = [];
    // Root context
    let root: any = {};
    stack.push(root);

    // Budget accounting: once a budget is exceeded (or sax fails), the parser
    // stops building the graph and the promise is settled exactly once.
    let aborted = false;
    let elementCount = 0;
    let textLength = 0;

    const abortForBudget = (kind: XmlParseBudgetKind, limit: number): void => {
      aborted = true;
      reject(new XmlParseBudgetError(kind, limit));
    };

    parser.onopentag = (node: sax.QualifiedTag) => {
      if (aborted) {
        return;
      }

      elementCount += 1;
      if (elementCount > limits.maxElements) {
        abortForBudget(XmlParseBudgetKind.ELEMENTS, limits.maxElements);
        return;
      }
      // stack holds the root plus one entry per open element, so pushing a new
      // element at depth `stack.length` requires one slot of headroom.
      if (stack.length > limits.maxDepth) {
        abortForBudget(XmlParseBudgetKind.DEPTH, limits.maxDepth);
        return;
      }

      const tagName = node.local;
      const newObj: any = {};

      const parent = stack[stack.length - 1];

      if (Array.isArray(parent)) {
        parent.push(newObj);
      } else {
        if (parent[tagName]) {
          if (!Array.isArray(parent[tagName])) {
            parent[tagName] = [parent[tagName]];
          }
          parent[tagName].push(newObj);
        } else {
          parent[tagName] = newObj;
        }
      }

      Object.defineProperty(newObj, '_name', {
        value: tagName,
        enumerable: false,
      });

      stack.push(newObj);
    };

    parser.ontext = (text) => {
      if (aborted) {
        return;
      }

      textLength += text.length;
      if (textLength > limits.maxTextLength) {
        abortForBudget(XmlParseBudgetKind.TEXT, limits.maxTextLength);
        return;
      }

      const current = stack[stack.length - 1];
      if (current) {
        if (!current._text) current._text = '';
        current._text += text;
      }
    };

    parser.onclosetag = (tagName) => {
      if (aborted) {
        return;
      }

      const current = stack.pop();
      const name = current._name;

      // Simplify object if it only has text
      let finalValue = current;
      const keys = Object.keys(current);
      if (current._text && (keys.length === 0 || (keys.length === 1 && keys[0] === '_text'))) {
        finalValue = current._text;
      }

      // Update the parent reference to this new simplified value
      const parent = stack[stack.length - 1];

      if (finalValue !== current) {
        // We need to swap it in the parent
        if (Array.isArray(parent[name])) {
          const arr = parent[name];
          arr[arr.length - 1] = finalValue;
        } else {
          parent[name] = finalValue;
        }
      }

      // Check if this was one of our target objects
      if (name === SandreTags.Scenario) {
        result.scenario = mapScenario(finalValue);
        delete parent[name];
      } else if (name === SandreTags.OuvrageDepollution) {
        result.ouvrages.push(mapOuvrage(finalValue));
        if (Array.isArray(parent[name])) {
          const arr = parent[name];
          arr.pop();
        } else {
          delete parent[name];
        }
      } else if (name === SandreTags.SystemeCollecte) {
        result.systemesCollecte.push(mapSystemeCollecte(finalValue));
        if (Array.isArray(parent[name])) {
          const arr = parent[name];
          arr.pop();
        } else {
          delete parent[name];
        }
      }
    };

    parser.onerror = (err) => {
      aborted = true;
      reject(err);
    };

    parser.onend = () => {
      resolve(result);
    };

    // Feed sax incrementally so that an exceeded budget stops the parsing of
    // the remaining input instead of tokenizing the whole file up front.
    for (let offset = 0; offset < xmlInput.length && !aborted; offset += SAX_WRITE_CHUNK_SIZE) {
      parser.write(xmlInput.substring(offset, offset + SAX_WRITE_CHUNK_SIZE));
    }
    if (!aborted) {
      parser.close();
    }
  });
}

interface ContactXmlElement {
  name: string;
  prefix: string;
  uri: string;
  start: number;
  openEnd: number;
  closeStart: number;
  selfClosing: boolean;
  indent?: string;
  childIndent?: string;
}

/** Only whitespace at the start of a tag's line counts as indentation. */
function xmlIndentAt(xml: string, position: number): string | undefined {
  let start = position;
  while (start > 0 && (xml[start - 1] === ' ' || xml[start - 1] === '\t')) {
    start--;
  }
  if (start === 0 || xml[start - 1] === '\n' || xml[start - 1] === '\r') {
    return xml.slice(start, position);
  }
  return undefined;
}

function insertXmlBlockBefore(xml: string, position: number, block: string, lineEnding: string): string {
  const insertionPoint = position - (xmlIndentAt(xml, position)?.length ?? 0);
  const previous = xml[insertionPoint - 1];
  const separator = insertionPoint === 0 || previous === '\n' || previous === '\r' ? '' : lineEnding;
  return xml.slice(0, insertionPoint) + separator + block + lineEnding + xml.slice(insertionPoint);
}

function insertXmlChild(
  xml: string,
  parent: ContactXmlElement,
  block: string,
  lineEnding: string,
  prepend = false,
): string {
  if (parent.selfClosing) {
    // Expand only the empty element; retain its original attributes and quoting.
    return (
      xml.slice(0, parent.openEnd - 2) +
      `>${lineEnding}${block}${lineEnding}${parent.indent ?? ''}</${parent.name}>` +
      xml.slice(parent.openEnd)
    );
  }
  if (prepend) {
    const next = xml[parent.openEnd];
    const separator = next === '\n' || next === '\r' ? '' : lineEnding;
    return xml.slice(0, parent.openEnd) + lineEnding + block + separator + xml.slice(parent.openEnd);
  }
  return insertXmlBlockBefore(xml, parent.closeStart, block, lineEnding);
}

/**
 * Locate elements with strict SAX, then insert into the original source rather than
 * reserialize it. Existing XML bytes survive unchanged (except expanding an empty
 * parent). Parsing stops at the first Scenario's close; errors encountered before
 * that point throw, while the remaining source is retained without validation.
 */
export function addNameTagToXml(xml: string, nomContact: string): string {
  const parser = sax.parser(true, { xmlns: true, position: true });
  const scenarioComplete = new Error('Scenario parsing complete');
  const stack: ContactXmlElement[] = [];
  let scenario: ContactXmlElement | undefined;
  let emetteur: ContactXmlElement | undefined;
  let contact: ContactXmlElement | undefined;
  let destinataire: ContactXmlElement | undefined;
  let hasNomContact = false;
  let indentationUnit: string | undefined;

  parser.onopentag = (tag: sax.QualifiedTag) => {
    const parent = stack[stack.length - 1];
    const element: ContactXmlElement = {
      name: tag.name,
      prefix: tag.prefix,
      uri: tag.uri,
      // sax offsets are UTF-16 string positions; startTagPosition is one-based.
      start: parser.startTagPosition - 1,
      openEnd: parser.position,
      closeStart: parser.position,
      selfClosing: tag.isSelfClosing,
      indent: xmlIndentAt(xml, parser.startTagPosition - 1),
    };
    if (
      parent?.indent !== undefined &&
      element.indent !== undefined &&
      element.indent.length > parent.indent.length &&
      element.indent.startsWith(parent.indent)
    ) {
      parent.childIndent ??= element.indent;
      indentationUnit ??= element.indent.slice(parent.indent.length);
    }
    if (tag.local === 'Scenario' && !scenario) {
      scenario = element;
    } else if (tag.local === 'Emetteur' && !emetteur && (!parent || (parent === scenario && tag.uri === parent.uri))) {
      emetteur = element;
    } else if (tag.local === 'Destinataire' && !destinataire && parent === scenario && tag.uri === parent?.uri) {
      destinataire = element;
    } else if (tag.local === 'Contact' && !contact && parent === emetteur && tag.uri === parent?.uri) {
      contact = element;
    } else if (tag.local === 'NomContact' && parent === contact && tag.uri === parent?.uri) {
      hasNomContact = true;
    }
    stack.push(element);
  };
  parser.onclosetag = () => {
    const element = stack.pop();
    if (element && !element.selfClosing) {
      element.closeStart = parser.startTagPosition - 1;
    }
    if (element && element === scenario) {
      // sax has no stop method; unwind write immediately, even inside a large chunk.
      throw scenarioComplete;
    }
  };
  parser.onerror = (error) => {
    throw error;
  };
  try {
    parser.write(xml).close();
  } catch (error) {
    // Only the intentional stop is caught. Real SAX errors must still propagate.
    if (error !== scenarioComplete) {
      throw error;
    }
  }

  const parent = contact ?? emetteur ?? scenario;
  if (!parent || hasNomContact) {
    return xml;
  }
  const lineEnding = xml.includes('\r\n') ? '\r\n' : '\n';
  const unit =
    parent.childIndent?.slice(parent.indent?.length ?? 0) ??
    indentationUnit ??
    (parent.indent?.includes('\t') ? '\t' : '  ');
  let indent = parent.childIndent ?? (parent.indent ?? '') + unit;
  if (!emetteur && destinataire) {
    indent = destinataire.indent ?? indent;
  }
  const prefix = parent.prefix ? `${parent.prefix}:` : '';
  const name = nomContact.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const tags = ['NomContact'];
  if (!contact) {
    tags.unshift('Contact');
  }
  if (!emetteur) {
    tags.unshift('Emetteur');
  }
  const lines = tags.map((tag, depth) => {
    const leading = indent + unit.repeat(depth);
    if (tag === 'NomContact') {
      return `${leading}<${prefix}${tag}>${name}</${prefix}${tag}>`;
    }
    return `${leading}<${prefix}${tag}>`;
  });
  for (let depth = tags.length - 2; depth >= 0; depth--) {
    lines.push(`${indent}${unit.repeat(depth)}</${prefix}${tags[depth]}>`);
  }
  const block = lines.join(lineEnding);
  if (!emetteur && destinataire) {
    return insertXmlBlockBefore(xml, destinataire.start, block, lineEnding);
  }
  return insertXmlChild(xml, parent, block, lineEnding, !emetteur);
}

export function checkScenarioCodeAndVersion(scenario: Scenario): boolean {
  return (
    scenario.codeScenario === SandreScenarioCode.FCT_ASSAIN &&
    (scenario.versionScenario === SandreScenarioVersion.V4 || scenario.versionScenario === SandreScenarioVersion.V3)
  );
}

function mapScenario(raw: any): Scenario {
  return {
    codeScenario: raw[SandreTags.CodeScenario],
    versionScenario: raw[SandreTags.VersionScenario],
    emetteur: mapEmetteur(raw[SandreTags.Emetteur]),
    dateDebutReference: raw[SandreTags.DateDebutReference],
    // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
    // dateFinReference: raw[SandreTags.DateFinReference],
  };
}

function mapEmetteur(raw: any): Emetteur {
  return {
    cdIntervenant: raw[SandreTags.CdIntervenant],
    nomIntervenant: raw[SandreTags.NomIntervenant],
  };
}

function mapOuvrage(raw: any): OuvrageDepollution {
  return {
    cdOuvrageDepollution: raw[SandreTags.CdOuvrageDepollution],
    typeOuvrageDepollution: raw[SandreTags.TypeOuvrageDepollution],
    // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
    // nomOuvrageDepollution: raw[SandreTags.NomOuvrageDepollution],
    natureSystTraitementEauxUsees: raw[SandreTags.NatureSystTraitementEauxUsees],
    pointMesure: mapPointMesureList(raw[SandreTags.PointMesure]),
    evenOuvragesAssainissement: mapEvenOuvrageAssainissementList(raw[SandreTags.EvenOuvrageAssainissement]),
    valeurCaracteristiqueRejets: mapValeurCaracteristiqueRejetList(raw[SandreTags.ValeurCaracteristiqueRejet]),
  };
}

function mapValeurCaracteristiqueRejetList(raw: any): ValeurCaracteristiqueRejet[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapValeurCaracteristiqueRejet);
}

function mapValeurCaracteristiqueRejet(raw: any): ValeurCaracteristiqueRejet {
  return {
    destination: mapDestination(raw[SandreTags.Destination]),
    periodeCalcul: raw[SandreTags.PeriodeCalcul],
  };
}

function mapDestination(raw: any): Destination {
  return {
    cdOuvrageAval: raw[SandreTags.CdOuvrageAval],
    typeOuvrageAval: raw[SandreTags.TypeOuvrageAval],
  };
}

function mapSystemeCollecte(raw: any): SystemeCollecte {
  return {
    cdSystemeCollecte: raw[SandreTags.CdSystemeCollecte],
    // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
    // lbSystemeCollecte: raw[SandreTags.LbSystemeCollecte],
    pointMesure: mapPointMesureList(raw[SandreTags.PointMesure]),
    agglomerationAssainissement: mapAgglomerationAssainissement(raw[SandreTags.AgglomerationAssainissement]),
    // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
    // evenOuvragesAssainissement: mapEvenOuvrageAssainissementList(raw[SandreTags.EvenOuvrageAssainissement]),
    // valeurCaracteristiqueRejets: mapValeurCaracteristiqueRejetList(raw[SandreTags.ValeurCaracteristiqueRejet]),
  };
}

function mapAgglomerationAssainissement(raw: any): AgglomerationAssainissement | undefined {
  if (!raw) {
    return undefined;
  }
  return {
    cdAgglomerationAssainissement: raw[SandreTags.CdAgglomerationAssainissement],
  };
}

function mapPointMesureList(raw: any): PointMesure[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapPointMesure);
}

function mapPointMesure(raw: any): PointMesure {
  return {
    numeroPointMesure: raw[SandreTags.NumeroPointMesure],
    // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
    // typeAppareilMesure: raw[SandreTags.TypeAppareilMesure],
    locGlobalePointMesure: raw[SandreTags.LocGlobalePointMesure],
    prelevement: mapPrelevementList(raw[SandreTags.Prlvt]),
  };
}

function mapPrelevementList(raw: any): Prelevement[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapPrelevement);
}

function mapPrelevement(raw: any): Prelevement {
  return {
    cdSupport: raw[SandreTags.Support]?.[SandreTags.CdSupport],
    datePrlvt: raw[SandreTags.DatePrlvt],
    conformitePrlvt: raw[SandreTags.ConformitePrlvt],
    analyse: mapAnalyseList(raw[SandreTags.Analyse]),
    accrePrlvt: raw[SandreTags.AccrePrlvt],
  };
}

function mapAnalyseList(raw: any): Analyse[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapAnalyse);
}

function mapAnalyse(raw: any): Analyse {
  return {
    rsAnalyse: raw[SandreTags.RsAnalyse],
    lqAna: raw[SandreTags.LQAna],
    accreAna: raw[SandreTags.AccreAna],
    inSituAnalyse: raw[SandreTags.InSituAnalyse],
    statutRsAnalyse: raw[SandreTags.StatutRsAnalyse],
    qualRsAnalyse: raw[SandreTags.QualRsAnalyse],
    cdFractionAnalysee: raw[SandreTags.FractionAnalysee]?.[SandreTags.CdFractionAnalysee],
    cdMethode: raw[SandreTags.MethodeAna]?.[SandreTags.CdMethode],
    cdParametre: raw[SandreTags.Parametre]?.[SandreTags.CdParametre],
    cdUniteMesure: raw[SandreTags.UniteMesure]?.[SandreTags.CdUniteMesure],
    finalite: raw[SandreTags.FinaliteAnalyse],
    cdRemAnalyse: raw[SandreTags.CdRemAnalyse],
  };
}

function mapEvenOuvrageAssainissementList(raw: any): EvenOuvrageAssainissement[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapEvenOuvrageAssainissement);
}

function mapEvenOuvrageAssainissement(raw: any): EvenOuvrageAssainissement {
  return {
    typeEvenOuvrageAssainissement: raw[SandreTags.TypeEvenOuvrageAssainissement],
  };
}
