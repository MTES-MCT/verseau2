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

export function parseScenarioAssainissementXml(xmlInput: string): Promise<FctAssainissement> {
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

    parser.onopentag = (node: sax.QualifiedTag) => {
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
      const current = stack[stack.length - 1];
      if (current) {
        if (!current._text) current._text = '';
        current._text += text;
      }
    };

    parser.onclosetag = (tagName) => {
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
      reject(err);
    };

    parser.onend = () => {
      resolve(result);
    };

    parser.write(xmlInput).close();
  });
}

const EMETTEUR_OPEN_TAG = '<Emetteur>';
const EMETTEUR_CLOSE_TAG = '</Emetteur>';
const CONTACT_OPEN_TAG = '<Contact>';
const CONTACT_CLOSE_TAG = '</Contact>';
const NOM_CONTACT_OPEN_TAG = '<NomContact>';
const NOM_CONTACT_CLOSE_TAG = '</NomContact>';
const DESTINATAIRE_OPEN_TAG = '<Destinataire>';
const SCENARIO_OPEN_TAG = '<Scenario>';
const SCENARIO_CLOSE_TAG = '</Scenario>';

/**
 * Checks a character code against the exact set matched by the JS regex `\s` class
 * (ECMAScript WhiteSpace + LineTerminator).
 */
function isWhitespaceCode(code: number): boolean {
  return (
    code === 0x09 || // \t
    code === 0x0a || // \n
    code === 0x0b || // \v
    code === 0x0c || // \f
    code === 0x0d || // \r
    code === 0x20 || // space
    code === 0xa0 || // no-break space
    code === 0x1680 || // ogham space mark
    (code >= 0x2000 && code <= 0x200a) || // en quad … hair space
    code === 0x2028 || // line separator
    code === 0x2029 || // paragraph separator
    code === 0x202f || // narrow no-break space
    code === 0x205f || // medium mathematical space
    code === 0x3000 || // ideographic space
    code === 0xfeff // zero-width no-break space
  );
}

/** Start index of the maximal whitespace run ending right before `pos`. */
function whitespaceRunStart(s: string, pos: number): number {
  let start = pos;
  while (start > 0 && isWhitespaceCode(s.charCodeAt(start - 1))) {
    start--;
  }
  return start;
}

/** End index (exclusive) of the maximal whitespace run starting at `pos`. */
function whitespaceRunEnd(s: string, pos: number): number {
  let end = pos;
  while (end < s.length && isWhitespaceCode(s.charCodeAt(end))) {
    end++;
  }
  return end;
}

/** Part of `ws` located after the last \r or \n (equivalent to `ws.match(/[^\r\n]*$/)?.[0] || ''`). */
function trailingIndent(ws: string): string {
  for (let i = ws.length - 1; i >= 0; i--) {
    const code = ws.charCodeAt(i);
    if (code === 0x0a || code === 0x0d) {
      return ws.slice(i + 1);
    }
  }
  return ws;
}

/** Infer one nesting level from adjacent tag lines, without regex backtracking. */
function inferIndentationUnit(xml: string): string {
  let previousIndent: string | undefined;
  let hasTabs = false;
  let lineStart = 0;
  while (lineStart < xml.length) {
    let tagStart = lineStart;
    while (xml[tagStart] === ' ' || xml[tagStart] === '\t') {
      tagStart++;
    }
    if (xml[tagStart] === '<' && xml[tagStart + 1] !== '?' && xml[tagStart + 1] !== '!') {
      const indent = xml.slice(lineStart, tagStart);
      hasTabs ||= indent.includes('\t');
      if (previousIndent !== undefined && indent.length > previousIndent.length && indent.startsWith(previousIndent)) {
        return indent.slice(previousIndent.length);
      }
      previousIndent = indent;
    }
    const newline = xml.indexOf('\n', tagStart);
    if (newline === -1) {
      break;
    }
    lineStart = newline + 1;
  }
  return hasTabs ? '\t' : '  ';
}

/** Prefer the indentation of an existing child over the document-wide fallback. */
function inferChildIndent(xml: string, start: number, end: number, parentIndent: string, unit: string): string {
  let newline = xml.indexOf('\n', start);
  while (newline !== -1 && newline < end) {
    const lineStart = newline + 1;
    let tagStart = lineStart;
    while (tagStart < end && (xml[tagStart] === ' ' || xml[tagStart] === '\t')) {
      tagStart++;
    }
    if (xml[tagStart] === '<' && xml[tagStart + 1] !== '/' && xml[tagStart + 1] !== '!' && xml[tagStart + 1] !== '?') {
      const indent = xml.slice(lineStart, tagStart);
      if (indent.length > parentIndent.length && indent.startsWith(parentIndent)) {
        return indent;
      }
    }
    newline = xml.indexOf('\n', tagStart);
  }
  return parentIndent + unit;
}

/** Insert before the closing tag's indentation, retaining all existing whitespace. */
function insertIndentedBlock(xml: string, close: number, block: string, lineEnding: string): string {
  const indent = trailingIndent(xml.slice(whitespaceRunStart(xml, close), close));
  const insertionPoint = close - indent.length;
  const previousCharacter = xml[insertionPoint - 1];
  const separator = previousCharacter === '\n' || previousCharacter === '\r' ? '' : lineEnding;
  return xml.slice(0, insertionPoint) + separator + block + lineEnding + xml.slice(insertionPoint);
}

/**
 * Adds a <NomContact> tag to the emitter block of a SANDRE scenario XML.
 *
 * Implemented with indexOf/slice scans only: the previous regex-based version used
 * chained lazy [\s\S]*? quantifiers over the whole (attacker-controlled, up to 70 MB)
 * XML string, whose backtracking on non-matching inputs was catastrophic
 * (O(n³) on chained <Emetteur>/<NomContact> opens, O(n²) on whitespace runs),
 * stalling the single-threaded worker. Every lookup searches the first occurrence
 * in document order, reproducing the leftmost-match semantics of the old regexes.
 */
export function addNameTagToXml(xml: string, nomContact: string): string {
  const lineEnding = xml.includes('\r\n') ? '\r\n' : '\n';
  const emetteurOpen = xml.indexOf(EMETTEUR_OPEN_TAG);

  if (emetteurOpen !== -1) {
    // "<Emetteur> … <NomContact> … </NomContact> … </Emetteur>" in order → nothing to add.
    const nomContactOpen = xml.indexOf(NOM_CONTACT_OPEN_TAG, emetteurOpen + EMETTEUR_OPEN_TAG.length);
    if (nomContactOpen !== -1) {
      const nomContactClose = xml.indexOf(NOM_CONTACT_CLOSE_TAG, nomContactOpen + NOM_CONTACT_OPEN_TAG.length);
      if (nomContactClose !== -1) {
        const emetteurCloseAfterNomContact = xml.indexOf(
          EMETTEUR_CLOSE_TAG,
          nomContactClose + NOM_CONTACT_CLOSE_TAG.length,
        );
        if (emetteurCloseAfterNomContact !== -1) {
          return xml;
        }
      }
    }
  }

  // An <Emetteur> only counts when a matching </Emetteur> follows it.
  const hasEmetteur =
    emetteurOpen !== -1 && xml.indexOf(EMETTEUR_CLOSE_TAG, emetteurOpen + EMETTEUR_OPEN_TAG.length) !== -1;

  if (!hasEmetteur) {
    const destinataireOpen = xml.indexOf(DESTINATAIRE_OPEN_TAG);
    if (destinataireOpen !== -1) {
      const runStart = whitespaceRunStart(xml, destinataireOpen);
      const leading = xml.slice(runStart, destinataireOpen);
      const indent = trailingIndent(leading);
      const unit = inferIndentationUnit(xml);
      const contactIndent = indent + unit;
      const nomContactIndent = contactIndent + unit;
      const emetteurBlock = `${leading}<Emetteur>${lineEnding}${contactIndent}<Contact>${lineEnding}${nomContactIndent}<NomContact>${nomContact}</NomContact>${lineEnding}${contactIndent}</Contact>${lineEnding}${indent}</Emetteur>${leading}`;
      return xml.slice(0, runStart) + emetteurBlock + xml.slice(destinataireOpen);
    }

    const scenarioOpen = xml.indexOf(SCENARIO_OPEN_TAG);
    if (scenarioOpen === -1) {
      return xml;
    }
    const indentRunEnd = whitespaceRunEnd(xml, scenarioOpen + SCENARIO_OPEN_TAG.length);
    const scenarioClose = xml.indexOf(SCENARIO_CLOSE_TAG, indentRunEnd);
    if (scenarioClose === -1) {
      return xml;
    }
    const scenarioIndent = trailingIndent(xml.slice(whitespaceRunStart(xml, scenarioClose), scenarioClose));
    const unit = inferIndentationUnit(xml);
    const emetteurIndent = inferChildIndent(
      xml,
      scenarioOpen + SCENARIO_OPEN_TAG.length,
      scenarioClose,
      scenarioIndent,
      unit,
    );
    const contactIndent = emetteurIndent + unit;
    const nomContactIndent = contactIndent + unit;
    return (
      xml.slice(0, scenarioOpen + SCENARIO_OPEN_TAG.length) +
      `${lineEnding}${emetteurIndent}<Emetteur>${lineEnding}${contactIndent}<Contact>${lineEnding}${nomContactIndent}<NomContact>${nomContact}</NomContact>${lineEnding}${contactIndent}</Contact>${lineEnding}${emetteurIndent}</Emetteur>` +
      xml.slice(scenarioOpen + SCENARIO_OPEN_TAG.length)
    );
  }

  const contactOpen = xml.indexOf(CONTACT_OPEN_TAG, emetteurOpen + EMETTEUR_OPEN_TAG.length);
  if (contactOpen !== -1) {
    const contactClose = xml.indexOf(CONTACT_CLOSE_TAG, contactOpen + CONTACT_OPEN_TAG.length);
    if (contactClose !== -1) {
      const emetteurCloseAfterContact = xml.indexOf(EMETTEUR_CLOSE_TAG, contactClose + CONTACT_CLOSE_TAG.length);
      if (emetteurCloseAfterContact !== -1) {
        const closingIndent = trailingIndent(xml.slice(whitespaceRunStart(xml, contactClose), contactClose));
        const childIndent = inferChildIndent(
          xml,
          contactOpen + CONTACT_OPEN_TAG.length,
          contactClose,
          closingIndent,
          inferIndentationUnit(xml),
        );
        return insertIndentedBlock(
          xml,
          contactClose,
          `${childIndent}<NomContact>${nomContact}</NomContact>`,
          lineEnding,
        );
      }
    }
  }

  const emetteurClose = xml.indexOf(EMETTEUR_CLOSE_TAG, emetteurOpen + EMETTEUR_OPEN_TAG.length);
  const emetteurIndent = trailingIndent(xml.slice(whitespaceRunStart(xml, emetteurClose), emetteurClose));
  const contactIndent = inferChildIndent(
    xml,
    emetteurOpen + EMETTEUR_OPEN_TAG.length,
    emetteurClose,
    emetteurIndent,
    inferIndentationUnit(xml),
  );
  const nomContactIndent = contactIndent + contactIndent.slice(emetteurIndent.length);
  return insertIndentedBlock(
    xml,
    emetteurClose,
    `${contactIndent}<Contact>${lineEnding}${nomContactIndent}<NomContact>${nomContact}</NomContact>${lineEnding}${contactIndent}</Contact>`,
    lineEnding,
  );
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
